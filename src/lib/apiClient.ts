import type { PreparedPhoto } from './image.js';
import { isoWIB, sortKeyWIB, timestampWIB, generateTicketWIB } from './wib.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  API CLIENT SIPEDAS — lapisan komunikasi yang tahan banting
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Masalah yang diperbaiki:
 *    Fetch lama memakai `await res.json()` mentah. Bila server membalas HTML
 *    (mis. "A server error occurred", halaman 404, atau proxy error), Browser
 *    melempar:  Unexpected token 'A', "A server e"... is not valid json
 *    dan seluruh fitur Aduan ikut mati.
 *
 *  Solusi berlapis:
 *    1. `fetchJson()` membaca body sebagai TEKS, lalu mem-parse dengan aman.
 *       Non-JOKSON tidak lagi menjadi exception yang tidak tertangani, melainkan
 *       status yang bisa ditangani, dengan pesan yang bisa dipahami pengguna.
 *    2. Jalur utama  : serverless function di /api/*.
 *    3. Jalur cadangan: tulis langsung ke Firestore dari browser dengan
 *       skema yang PERSIS sama, sehingga dashboard sipedasadmin tetap sinkron.
 *    4. Timeout per request supaya tidak menggantung di jaringan jelek.
 */

// ── Tipe ────────────────────────────────────────────────────────────────────

export const ADUAN_COLLECTION = 'aduan';
export const SURVEY_COLLECTION = 'survey_kepuasan';
export const NOWA_COLLECTION = 'nowa';

export const STATUS_BARU = 'Baru';
export const SOURCE_WEBSITE = 'Website';

export interface AduanInput {
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  source: string;
  photos: PreparedPhoto[];
  /** URL foto yang sudah terunggah (dipakai server; opsional). */
  fotoUrls?: string[];
}

export interface AduanStatus {
  found: boolean;
  ticket: string;
  timestamp: string;
  timestampISO: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  fotos: string[];
  jumlahFoto: number;
  status: string;
  catatan: string;
  fotoTindakLanjut: string;
  updatedAt: string;
  source: string;
  message?: string;
}

export interface WaInfo {
  number: string;
  name: string;
  day: string;
  jadwal: string;
}

export interface SubmitResult {
  success: boolean;
  ticketNumber: string;
  jumlahFoto: number;
  /** 'api' = lewat server, 'browser' = fallback langsung ke Firestore. */
  via: 'api' | 'browser';
  warning?: string;
}

export class ApiError extends Error {
  /** true bila penyebabnya server tidak merespons JSON (HTML / 5xx / timeout). */
  transport: boolean;
  status: number;
  constructor(message: string, opts: { transport?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.transport = opts.transport ?? false;
    this.status = opts.status ?? 0;
  }
}

// ── Lapisan fetch yang aman ─────────────────────────────────────────────────

interface JsonResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Alasan kegagalan dalam bahasa manusia. */
  reason: string;
  /** true bila server tidak mengirim JSON (HTML, teks, atau timeout). */
  transport: boolean;
}

const DEFAULT_TIMEOUT = 25_000;

function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 200).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html') || head.trimStart().startsWith('<');
}

function describeBadBody(status: number, text: string): string {
  if (status === 404) return 'Endpoint tidak ditemukan pada server.';
  if (status === 405) return 'Metode tidak diizinkan oleh server.';
  if (status === 413) return 'Data terlalu besar untuk server. Coba kirim lebih sedikit foto.';
  if (status === 429) return 'Terlalu banyak permintaan. Mohon tunggu sebentar.';
  if (status >= 500) return 'Server sedang mengalami gangguan.';
  if (looksLikeHtml(text)) return 'Server tidak tersedia saat ini.';
  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 140);
  return snippet ? `Respons server tidak valid (HTTP ${status}).` : `Permintaan gagal (HTTP ${status}).`;
}

/**
 * Fetch + parse JSON tanpa pernah melempar SyntaxError.
 * Semua kegagalan dikembalikan sebagai nilai, bukan exception.
 */
export async function fetchJson<T = any>(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<JsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (err: any) {
    clearTimeout(timer);
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: null,
      transport: true,
      reason: aborted
        ? 'Permintaan terlalu lama (koneksi lambat).'
        : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    };
  }
  clearTimeout(timer);

  let text = '';
  try {
    text = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      transport: true,
      reason: 'Respons server tidak dapat dibaca.',
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: res.status,
      data: null,
      transport: true,
      reason: 'Server tidak mengembalikan data.',
    };
  }

  let data: any = null;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      transport: true,
      reason: describeBadBody(res.status, trimmed),
    };
  }

  if (!res.ok) {
    const message =
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      describeBadBody(res.status, trimmed);
    return { ok: false, status: res.status, data, transport: false, reason: message };
  }

  return { ok: true, status: res.status, data, transport: false, reason: '' };
}

// ── Skema Aduan (satu sumber kebenaran untuk server & fallback) ─────────────

/** Field yang dibaca dashboard sipedasadmin (src/pages/Aduan.tsx). */
export interface AduanRecord {
  ticket: string;
  timestamp: string;      // "DD/MM/YYYY HH:MM:SS" (WIB) — format lama, tetap dipertahankan
  timestampISO: string;   // ISO-8601 WIB — untuk sorting kronologis yang benar
  sortKey: string;        // YYYYMMDDHHmmss — numerik, aman untuk sort
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  fotos: string[];
  jumlahFoto: number;
  status: string;
  catatan: string;
  fotoTindakLanjut: string;
  updatedAt: string;
  source: string;
  [key: string]: any;
}

export function buildAduanRecord(input: AduanInput, ticket: string, fotos: string[]): AduanRecord {
  const now = timestampWIB();
  return {
    ticket,
    timestamp: now,
    timestampISO: isoWIB(),
    sortKey: sortKeyWIB(),
    nama: input.nama.trim(),
    kategori: input.kategori.trim(),
    lokasi: input.lokasi.trim(),
    deskripsi: input.deskripsi.trim(),
    fotos,
    jumlahFoto: fotos.length,
    status: STATUS_BARU,
    catatan: '',
    fotoTindakLanjut: '',
    updatedAt: now,
    source: (input.source || SOURCE_WEBSITE).trim() || SOURCE_WEBSITE,
  };
}

export function normalizeAduanStatus(ticket: string, d: any): AduanStatus {
  return {
    found: true,
    ticket: d?.ticket || ticket,
    timestamp: d?.timestamp || '',
    timestampISO: d?.timestampISO || '',
    nama: d?.nama || '',
    kategori: d?.kategori || '',
    lokasi: d?.lokasi || '',
    deskripsi: d?.deskripsi || '',
    fotos: Array.isArray(d?.fotos) ? d.fotos.filter(Boolean) : [],
    jumlahFoto: Number(d?.jumlahFoto) || (Array.isArray(d?.fotos) ? d.fotos.filter(Boolean).length : 0),
    status: d?.status || STATUS_BARU,
    catatan: d?.catatan || '',
    fotoTindakLanjut: d?.fotoTindakLanjut || '',
    updatedAt: d?.updatedAt || '',
    source: d?.source || '',
  };
}

// ── Upload foto ─────────────────────────────────────────────────────────────

/**
 * Unggah foto satu per satu ke /api/upload-photo.
 *
 * Foto dikirim sebagai permintaan terpisah supaya:
 *   • tiap body jauh di bawah batas 4.5 MB Vercel (penyebab utama "A server error"),
 *   • memakai kredensial Cloudinary server (tidak perlu unsigned preset),
 *   • satu foto gagal tidak menggagalkan foto lain maupun laporan.
 */
async function uploadPhotosViaServer(photos: PreparedPhoto[]): Promise<string[]> {
  if (!photos.length) return [];
  const links: string[] = [];

  for (const photo of photos) {
    try {
      const res = await fetchJson<{ success?: boolean; url?: string; error?: string }>(
        '/api/upload-photo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: photo.base64, type: photo.type, name: photo.name }),
        },
        25_000,
      );
      if (res.ok && res.data?.url) links.push(res.data.url);
    } catch {
      // Lewati foto ini; laporan tetap dikirim.
    }
  }
  return links;
}

/** Unggah foto langsung ke Cloudinary dari browser (jalur cadangan terakhir). */
async function uploadViaBrowser(photos: PreparedPhoto[]): Promise<string[]> {
  if (!photos.length) return [];
  try {
    const { uploadPhotoPublic } = await import('./cloudinaryPublic.js');
    const settled = await Promise.allSettled(
      photos.map(p => uploadPhotoPublic(p.base64, p.type)),
    );
    return settled
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);
  } catch {
    return [];
  }
}

// ── 1. Kirim aduan ───────────────────────────────────────────────────────────

function validateAduan(input: AduanInput): string | null {
  if (!input.nama?.trim()) return 'Nama wajib diisi.';
  if (!input.kategori?.trim()) return 'Kategori wajib diisi.';
  if (!input.lokasi?.trim()) return 'Lokasi wajib diisi.';
  if (!input.deskripsi?.trim()) return 'Deskripsi wajib diisi.';
  if (input.deskripsi.trim().length < 10) return 'Deskripsi minimal 10 karakter.';
  return null;
}

export async function submitComplaint(input: AduanInput): Promise<SubmitResult> {
  const invalid = validateAduan(input);
  if (invalid) throw new ApiError(invalid);

  const photos = (input.photos || []).slice(0, 5);

  // ── Tahap 1: unggah foto satu per satu (body kecil, aman dari limit 4.5 MB) ──
  let urls = await uploadPhotosViaServer(photos);

  // ── Tahap 2: kirim laporan memakai URL foto yang sudah terunggah ──────────
  const res = await fetchJson<{
    success?: boolean;
    ticketNumber?: string;
    jumlahFoto?: number;
    warning?: string;
    error?: string;
  }>(
    '/api/submit-complaint',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: input.nama,
        kategori: input.kategori,
        lokasi: input.lokasi,
        deskripsi: input.deskripsi,
        source: input.source || SOURCE_WEBSITE,
        fotoUrls: urls,
        photos: [], // foto sudah diunggah pada tahap 1
      }),
    },
    30_000,
  );

  if (res.ok && res.data?.ticketNumber) {
    const fotoGagal = photos.length - urls.length;
    return {
      success: true,
      ticketNumber: String(res.data.ticketNumber),
      jumlahFoto: Number(res.data.jumlahFoto) || urls.length,
      via: 'api',
      warning: [res.data.warning, fotoGagal > 0 ? `${fotoGagal} foto gagal diunggah.` : '']
        .filter(Boolean)
        .join(' ') || undefined,
    };
  }

  // ── Tahap 3 (cadangan): tulis langsung ke Firestore ──────────────────────
  const serverReason = res.reason || 'Server tidak merespons.';
  try {
    const { getDb } = await import('./firebase.js');
    const { doc, setDoc } = await import('firebase/firestore');

    // Bila server sama sekali tak terjangkau, coba unggah foto dari browser.
    if (!urls.length && photos.length) urls = await uploadViaBrowser(photos);

    const ticket = generateTicketWIB();
    const record = buildAduanRecord(input, ticket, urls);
    await setDoc(doc(await getDb(), ADUAN_COLLECTION, ticket), record);

    const fotoGagal = photos.length - urls.length;
    return {
      success: true,
      ticketNumber: ticket,
      jumlahFoto: urls.length,
      via: 'browser',
      warning: fotoGagal > 0
        ? `Laporan tersimpan, tetapi ${fotoGagal} foto gagal diunggah.`
        : `Laporan tersimpan melalui jalur cadangan (${serverReason}).`,
    };
  } catch (err: any) {
    // Semua jalur gagal — pesan yang jelas & bisa ditindaklanjuti.
    const detail = err?.code === 'permission-denied'
      ? 'Akses basis data ditolak. Hubungi petugas melalui WhatsApp.'
      : err?.message || 'Kesalahan tidak diketahui.';
    throw new ApiError(`Gagal mengirim laporan. ${detail}`, { transport: true, status: res.status });
  }
}

// ── 2. Lacak tiket ───────────────────────────────────────────────────────────

export async function getComplaintStatus(ticketInput: string): Promise<AduanStatus> {
  const ticket = ticketInput.trim().toUpperCase();
  if (!ticket) throw new ApiError('Nomor tiket wajib diisi.');

  const res = await fetchJson<AduanStatus>(
    `/api/complaint-status?ticket=${encodeURIComponent(ticket)}`,
    {},
    20_000,
  );

  if (res.ok && res.data?.found) return normalizeAduanStatus(ticket, res.data);
  if (res.ok && res.data && res.data.found === false) {
    throw new ApiError(res.data.message || 'Tiket tidak ditemukan.');
  }

  // Fallback: baca langsung dari Firestore.
  try {
    const { getDb } = await import('./firebase.js');
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(await getDb(), ADUAN_COLLECTION, ticket));
    if (snap.exists()) return normalizeAduanStatus(ticket, snap.data());
  } catch {
    /* jatuh ke error di bawah */
  }

  if (res.ok && res.data?.message) throw new ApiError(res.data.message);
  throw new ApiError(res.reason || 'Gagal mengambil status tiket.', { transport: true });
}

// ── 3. Nomor WhatsApp petugas piket ──────────────────────────────────────────

const HARI_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const HARI_MAP: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

function dayOfWeekWIBIndex(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 7 * 3600_000).getDay();
}

function jadwalCocok(jadwalRaw: string, todayIdx: number): boolean {
  const j = (jadwalRaw || '').toLowerCase().trim();
  if (!j) return false;
  if (j === 'semua' || j === '*' || j === 'senin-minggu' || j === 'minggu-sabtu') return true;
  if (j.includes('-')) {
    const [a, b] = j.split('-').map(s => s.trim());
    const s = HARI_MAP[a], e = HARI_MAP[b];
    if (s === undefined || e === undefined) return false;
    return s <= e ? todayIdx >= s && todayIdx <= e : todayIdx >= s || todayIdx <= e;
  }
  if (j.includes(',')) return j.split(',').map(s => s.trim()).some(h => HARI_MAP[h] === todayIdx);
  return HARI_MAP[j] === todayIdx;
}

function normalizeWa(raw: string): string {
  let num = (raw || '').replace(/^wa:\s*/i, '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('0')) return `62${num.slice(1)}`;
  if (!num.startsWith('62')) return `62${num}`;
  return num;
}

export async function getWaNumber(): Promise<WaInfo | null> {
  const todayIdx = dayOfWeekWIBIndex();
  const day = HARI_LABEL[todayIdx];

  const res = await fetchJson<WaInfo>('/api/wa-number', {}, 12_000);
  if (res.ok && res.data?.number) {
    return {
      number: res.data.number,
      name: res.data.name || 'Piket Satgas Linmas',
      day: res.data.day || day,
      jadwal: res.data.jadwal || '',
    };
  }

  // Fallback langsung ke Firestore.
  try {
    const { getDb } = await import('./firebase.js');
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(await getDb(), NOWA_COLLECTION));
    const rows = snap.docs.map(d => d.data()).filter(r => String(r?.number ?? '').trim());
    if (!rows.length) return null;
    const row = rows.find(r => jadwalCocok(String(r.jadwal ?? ''), todayIdx)) ?? rows[0];
    return {
      number: normalizeWa(String(row.number ?? '')),
      name: String(row.nama ?? '').trim() || 'Piket Satgas Linmas',
      day,
      jadwal: String(row.jadwal ?? '').trim(),
    };
  } catch {
    return null;
  }
}

// ── 5. Rating kepuasan (skala tunggal 1–5 bintang) ─────────────────────────

export interface SurveyInput {
  nama: string;
  pekerjaan: string;
  rating: number;
  saran: string;
}

export async function submitSurvey(input: SurveyInput): Promise<{ via: 'api' | 'browser'; warning?: string }> {
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ApiError('Mohon pilih penilaian 1–5 bintang.');
  }

  const payload = {
    nama: (input.nama || '').trim().slice(0, 120),
    pekerjaan: (input.pekerjaan || '').trim().slice(0, 120),
    rating: Math.round(rating),
    saran: (input.saran || '').trim().slice(0, 2000),
  };

  const res = await fetchJson('/api/submit-survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 25_000);

  if (res.ok) return { via: 'api' };

  // Fallback: tulis langsung ke Firestore dengan skema yang sama.
  try {
    const { getDb } = await import('./firebase.js');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(await getDb(), SURVEY_COLLECTION), {
      ...payload,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return { via: 'browser', warning: res.reason };
  } catch {
    throw new ApiError(res.reason || 'Gagal mengirim penilaian.', { transport: true });
  }
}