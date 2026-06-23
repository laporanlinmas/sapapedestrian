/**
 * Semua fungsi waktu WIB (UTC+7) terpusat di sini.
 * Vercel server berjalan di UTC, jadi kita harus eksplisit konversi.
 */

const TZ = 'Asia/Jakarta';

/** Kembalikan Date object yang merepresentasikan waktu WIB saat ini */
export function nowWIB(): Date {
  // Cara yang benar: gunakan Intl untuk format, lalu parse kembali
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';

  // Buat Date dari komponen WIB (diperlakukan sebagai local time)
  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second')),
  );
}

/** Format: YYYY-MM-DD (tanggal WIB) */
export function todayWIB(): string {
  const d = nowWIB();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format: YYYY-MM (bulan WIB) */
export function monthWIB(): string {
  return todayWIB().slice(0, 7);
}

/**
 * Indeks hari WIB: 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
 * Sama dengan JS Date.getDay() tapi untuk timezone WIB
 */
export function dayOfWeekWIB(): number {
  const d = nowWIB();
  return d.getDay(); // 0=Sun … 6=Sat
}

/** Nama hari WIB dalam Bahasa Indonesia */
export const HARI_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export function hariIniWIB(): string {
  return HARI_LABEL[dayOfWeekWIB()];
}

/** Map nama hari Indonesia ke indeks */
export const HARI_MAP: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

/**
 * Timestamp WIB untuk disimpan ke sheet.
 * Format: DD/MM/YYYY HH:MM:SS
 */
export function timestampWIB(): string {
  const d = nowWIB();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
