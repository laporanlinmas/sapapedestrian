import { doc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase.js';
import { buildAduanRecord, ADUAN_COLLECTION, type AduanInput } from '../apiClient.js';
import { uploadFile } from '../cloudinary.js';

/**
 * Logika bersama (server-side) untuk penyimpanan aduan.
 * Skema dokumen dibangun oleh `buildAduanRecord` dari src/lib/apiClient.ts —
 * satu sumber kebenaran yang juga dipakai jalur cadangan di browser,
 * sehingga dashboard sipedasadmin selalu melihat struktur data yang sama.
 */

export const MAX_PHOTOS = 5;

const LIMITS = {
  nama: 120,
  kategori: 60,
  lokasi: 200,
  deskripsi: 2000,
  source: 40,
};

function clamp(value: string, max: number): string {
  const v = String(value ?? '').trim();
  return v.length > max ? v.slice(0, max) : v;
}

export function validateAduan(input: AduanInput): string | null {
  const nama = clamp(input.nama, LIMITS.nama);
  const kategori = clamp(input.kategori, LIMITS.kategori);
  const lokasi = clamp(input.lokasi, LIMITS.lokasi);
  const deskripsi = clamp(input.deskripsi, LIMITS.deskripsi);

  if (!nama) return 'Nama wajib diisi.';
  if (!kategori) return 'Kategori wajib diisi.';
  if (!lokasi) return 'Lokasi wajib diisi.';
  if (!deskripsi) return 'Deskripsi wajib diisi.';
  if (deskripsi.length < 10) return 'Deskripsi minimal 10 karakter.';
  return null;
}

export function sanitizeAduan(input: AduanInput): AduanInput {
  const fotoUrls = Array.isArray(input.fotoUrls)
    ? input.fotoUrls.map(u => String(u ?? '').trim()).filter(Boolean).slice(0, MAX_PHOTOS)
    : [];

  return {
    nama: clamp(input.nama, LIMITS.nama),
    kategori: clamp(input.kategori, LIMITS.kategori),
    lokasi: clamp(input.lokasi, LIMITS.lokasi),
    deskripsi: clamp(input.deskripsi, LIMITS.deskripsi),
    source: clamp(input.source, LIMITS.source) || 'Website',
    // Batasi total foto (URL + base64) tetap MAX_PHOTOS.
    photos: Array.isArray(input.photos)
      ? input.photos.slice(0, Math.max(0, MAX_PHOTOS - fotoUrls.length))
      : [],
    fotoUrls,
  };
}

export function generateTicket(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + now.getTimezoneOffset() * 60_000 + 7 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(wib.getFullYear()).slice(-2);
  const rand = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
  return `ADU-${yy}${pad(wib.getMonth() + 1)}${pad(wib.getDate())}-${rand}`;
}

function toBuffer(base64: string): Buffer {
  // Terima format data URL maupun base64 polos.
  const raw = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
  return Buffer.from(raw, 'base64');
}

/** Unggah foto base64 ke Cloudinary. Foto yang gagal dilewati, bukan digagalkan. */
export async function uploadPhotos(photos: any[]): Promise<string[]> {
  const list = photos.filter(p => p && typeof p.base64 === 'string' && p.base64.length > 0);
  if (!list.length) return [];

  const settled = await Promise.allSettled(
    list.map(async (p: any) => {
      const buf = toBuffer(p.base64);
      if (!buf.length) throw new Error('Foto kosong.');
      return uploadFile(buf, p.type || 'image/jpeg', 'sapapedestrian_aduan');
    }),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(Boolean);
}

export async function saveComplaint(record: Record<string, any>): Promise<void> {
  const db = await getDb();
  await setDoc(doc(db, ADUAN_COLLECTION, record.ticket as string), record);
}

export async function createComplaint(
  rawInput: AduanInput,
): Promise<{ ticket: string; jumlahFoto: number; requested: number; record: any }> {
  const input = sanitizeAduan(rawInput);
  const invalid = validateAduan(input);
  if (invalid) throw new Error(invalid);

  const requested = input.fotoUrls.length + input.photos.length;
  const ticket = generateTicket();

  // Foto yang sudah terunggah lewat /api/upload-photo dipakai apa adanya;
  // sisanya (base64) diunggah di sini. Foto gagal tidak membatalkan laporan.
  const links = [...input.fotoUrls, ...(await uploadPhotos(input.photos))].slice(0, MAX_PHOTOS);

  const record = buildAduanRecord(input, ticket, links);
  await saveComplaint(record);

  return { ticket, jumlahFoto: links.length, requested, record };
}