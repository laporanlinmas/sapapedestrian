/** Compare public gallery dates with report dates in Google Sheets. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { parseGalleryDate } from './gallery-date-utils.mts';

function loadEnvFile(): void {
  const envPath = process.env.ENV_FILE || '.env';
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main(): Promise<void> {
  loadEnvFile();
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!serviceAccountJson || !spreadsheetId) {
    throw new Error('Isi GOOGLE_SERVICE_ACCOUNT_JSON dan SPREADSHEET_ID di environment atau .env.');
  }

  const credentials = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${encodeBase64Url(signer.sign(credentials.private_key))}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(`Autentikasi Google gagal (${tokenResponse.status}): ${JSON.stringify(token).slice(0, 240)}`);
  }

  const readSheet = async (name: string): Promise<unknown[][]> => {
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(name)}`);
    url.searchParams.set('majorDimension', 'ROWS');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(`Gagal membaca sheet ${name} (${response.status}): ${JSON.stringify(data).slice(0, 240)}`);
    return data.values || [];
  };

  const [inputRows, detailRows] = await Promise.all([readSheet('INPUT'), readSheet('Detail Foto')]);
  const input = inputRows.slice(1);
  const detail = detailRows.slice(1);
  const dateKey = (value: unknown) => parseGalleryDate(value)?.key ?? '';
  const reportDates = new Set(input.map((row) => dateKey(row[4])).filter(Boolean));
  const detailDates = new Set(detail.map((row) => dateKey(row[1])).filter(Boolean));

  const apiBase = (process.env.SIPEDAS_API_URL || process.env.VITE_SITE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const apiUrl = new URL('/api/gallery', apiBase);
  apiUrl.searchParams.set('page', '1');
  apiUrl.searchParams.set('perPage', '60');
  const apiResponse = await fetch(apiUrl);
  const apiData = await apiResponse.json();
  if (!apiResponse.ok) throw new Error(`API galeri gagal (${apiResponse.status}): ${JSON.stringify(apiData).slice(0, 240)}`);

  const items = Array.isArray(apiData.items) ? apiData.items as Array<{ tanggal?: string }> : [];
  if (items.length === 0) throw new Error('API galeri tidak mengembalikan foto. Pastikan server aktif dan indeks tersedia.');

  const counts: Record<string, number> = {};
  const unrecognized = new Set<string>();
  for (const item of items) {
    const key = dateKey(item.tanggal);
    if (reportDates.has(key)) counts['Tanggal laporan (INPUT)'] = (counts['Tanggal laporan (INPUT)'] || 0) + 1;
    else if (detailDates.has(key)) counts['Tanggal kolom Detail Foto'] = (counts['Tanggal kolom Detail Foto'] || 0) + 1;
    else {
      counts['Tidak cocok dengan laporan'] = (counts['Tidak cocok dengan laporan'] || 0) + 1;
      unrecognized.add(item.tanggal || '(kosong)');
    }
  }

  console.log(`INPUT: ${input.length} baris, ${reportDates.size} tanggal laporan unik`);
  console.log(`Detail Foto: ${detail.length} baris, ${detailDates.size} tanggal unik`);
  console.log(`API galeri: ${items.length}/${apiData.total ?? '?'} foto terbaru`);
  console.table(counts);
  if (unrecognized.size) {
    console.error(`Tanggal tanpa pasangan di Google Sheets: ${[...unrecognized].join(' | ')}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Verifikasi tanggal gagal: ${message}`);
  process.exitCode = 1;
});
