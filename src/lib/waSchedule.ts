/**
 * Logika jadwal petugas piket — dipakai BERSAMA oleh serverless function
 * (/api/wa-number) dan jalur cadangan di browser, agar hasilnya tidak pernah
 * berbeda antara kedua jalur.
 */

export const HARI_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export const HARI_MAP: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

/** Indeks hari (0=Minggu … 6=Sabtu) pada zona WIB. */
export function dayOfWeekWIBIndex(now: Date = new Date()): number {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 7 * 3600_000).getDay();
}

export function hariIniWIB(now: Date = new Date()): string {
  return HARI_LABEL[dayOfWeekWIBIndex(now)];
}

/**
 * Cocokkan string jadwal dengan hari ini.
 * Didukung: "senin-jumat", "jumat-minggu" (melingkar), "senin,kamis", "senin", "semua"/"*".
 */
export function jadwalCocok(jadwalRaw: string, todayIdx: number): boolean {
  const j = (jadwalRaw || '').toLowerCase().trim();
  if (!j) return false;
  if (j === 'semua' || j === '*' || j === 'senin-minggu' || j === 'minggu-sabtu') return true;

  if (j.includes('-')) {
    const [rawA, rawB] = j.split('-').map(s => s.trim());
    const a = HARI_MAP[rawA];
    const b = HARI_MAP[rawB];
    if (a === undefined || b === undefined) return false;
    return a <= b ? todayIdx >= a && todayIdx <= b : todayIdx >= a || todayIdx <= b;
  }

  if (j.includes(',')) {
    return j.split(',').map(s => s.trim()).some(h => HARI_MAP[h] === todayIdx);
  }

  return HARI_MAP[j] === todayIdx;
}

/** Normalisasi nomor WhatsApp ke format internasional tanpa "+". */
export function normalizeWaNumber(raw: string): string {
  let num = (raw || '').replace(/^wa:\s*/i, '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('0')) return `62${num.slice(1)}`;
  if (!num.startsWith('62')) return `62${num}`;
  return num;
}

export interface WaRow {
  number?: unknown;
  nama?: unknown;
  jadwal?: unknown;
}

export interface ResolvedWa {
  number: string;
  name: string;
  day: string;
  jadwal: string;
}

/** Pilih petugas yang jadwalnya cocok dengan hari ini. */
export function resolveWa(rows: WaRow[], now: Date = new Date()): ResolvedWa | null {
  const todayIdx = dayOfWeekWIBIndex(now);
  const day = hariIniWIB(now);
  const valid = rows.filter(r => String(r?.number ?? '').trim());
  if (!valid.length) return null;

  const row = valid.find(r => jadwalCocok(String(r.jadwal ?? ''), todayIdx)) ?? valid[0];
  const number = normalizeWaNumber(String(row.number ?? ''));
  if (!number) return null;

  return {
    number,
    name: String(row.nama ?? '').trim() || 'Piket Satgas Linmas',
    day,
    jadwal: String(row.jadwal ?? '').trim(),
  };
}