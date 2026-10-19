import crypto from 'node:crypto';
import {
  collection, doc, getDoc, getDocs, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { extractDriveFileId, normalizeUploadTimestamp, parseGalleryDate } from '../galleryDate.js';
import { GALLERY_PUBLIC_LIMIT, GALLERY_RESERVE_LIMIT } from '../galleryConfig.js';

const REFRESH_MS = 15_000;
const COLLECTION = 'gallery_photos';

interface Candidate {
  driveId: string;
  tanggal: string;
  sortKey: string;
  sortTime: string;
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getSheetsToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON belum diatur.');
  const credentials = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = encodeBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${encodeBase64Url(signer.sign(credentials.private_key))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || `Autentikasi Google gagal (${response.status}).`);
  }
  return result.access_token;
}

async function readSheet(token: string, spreadsheetId: string, name: string): Promise<unknown[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(name)}?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json() as { values?: unknown[][]; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || `Gagal membaca sheet ${name}.`);
  return result.values || [];
}

function getCandidates(photoRows: unknown[][], reportRows: unknown[][]): Candidate[] {
  const reportDates = new Map<string, ReturnType<typeof parseGalleryDate>>();
  for (const row of reportRows.slice(1)) {
    const timestamp = normalizeUploadTimestamp(row[0]);
    const date = parseGalleryDate(row[4]);
    if (timestamp && date) reportDates.set(timestamp, date);
  }

  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const row of photoRows.slice(1)) {
    const driveId = extractDriveFileId(row[12]);
    if (!driveId || seen.has(driveId)) continue;

    const timestamp = normalizeUploadTimestamp(row[0]);
    const date = parseGalleryDate(row[1]) || reportDates.get(timestamp);
    if (!date) continue;
    seen.add(driveId);
    candidates.push({ driveId, tanggal: date.label, sortKey: date.urut, sortTime: timestamp });
  }

  return candidates.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || b.sortTime.localeCompare(a.sortTime));
}

/** Refresh the Firestore photo lookup from the report spreadsheet at most once per 30 seconds. */
export async function refreshGallerySource(db: Firestore): Promise<void> {
  const metaRef = doc(db, COLLECTION, '_meta');
  const meta = await getDoc(metaRef);
  const lastSync = Date.parse(meta.data()?.syncedAt || '');
  if (Number.isFinite(lastSync) && Date.now() - lastSync < REFRESH_MS) return;

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID belum diatur.');

  const token = await getSheetsToken();
  const [photoRows, reportRows] = await Promise.all([
    readSheet(token, spreadsheetId, 'Detail Foto'),
    readSheet(token, spreadsheetId, 'INPUT'),
  ]);
  const candidates = getCandidates(photoRows, reportRows)
    .slice(0, GALLERY_PUBLIC_LIMIT + GALLERY_RESERVE_LIMIT);

  const ids = new Set(candidates.map(({ driveId }) => `p${crypto.createHash('sha256').update(driveId).digest('hex').slice(0, 10)}`));
  const existing = await getDocs(collection(db, COLLECTION));
  const stale = existing.docs.filter((entry) => entry.id !== '_meta' && !ids.has(entry.id));
  const batch = writeBatch(db);
  for (const item of candidates) {
    const id = `p${crypto.createHash('sha256').update(item.driveId).digest('hex').slice(0, 10)}`;
    batch.set(doc(db, COLLECTION, id), { ...item, sortKey: `${item.sortKey}_${item.sortTime}` });
  }
  for (const entry of stale) batch.delete(entry.ref);
  batch.set(metaRef, {
    total: Math.min(GALLERY_PUBLIC_LIMIT, candidates.length),
    tersedia: candidates.length,
    tanggalTerbaru: candidates[0]?.tanggal ?? '',
    syncedAt: new Date().toISOString(),
  }, { merge: true });
  await batch.commit();
}