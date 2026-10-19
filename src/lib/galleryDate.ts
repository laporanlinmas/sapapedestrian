export interface GalleryDate {
  key: string;
  urut: string;
  label: string;
  bulan: number;
  tanggal: number;
  tahun: number;
}

const MONTHS: Readonly<Record<string, number>> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6,
  july: 7, august: 8, october: 10,
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function makeDate(day: number, month: number, year: number): GalleryDate | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
  ) return null;

  const key = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const urut = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { key, urut, label: `${day} ${MONTH_NAMES[month - 1]} ${year}`, bulan: month, tanggal: day, tahun: year };
}

export function parseGalleryDate(value: unknown): GalleryDate | null {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text || text === '-') return null;

  const namedMonth = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (namedMonth) {
    const month = MONTHS[namedMonth[2].toLowerCase()];
    return month ? makeDate(Number(namedMonth[1]), month, Number(namedMonth[3])) : null;
  }

  const numericDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!numericDate) return null;
  return makeDate(Number(numericDate[1]), Number(numericDate[2]), Number(numericDate[3]));
}

export function normalizeUploadTimestamp(value: unknown): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text || text === '-') return '';

  const timestamp = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[, ]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(text);
  if (timestamp) {
    let hour = Number(timestamp[4]);
    const meridiem = (timestamp[7] || '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return `${timestamp[3]}-${String(Number(timestamp[1])).padStart(2, '0')}-${String(Number(timestamp[2])).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${timestamp[5]}:${timestamp[6] || '00'}`;
  }

  const separated = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (separated) {
    return `${separated[3]}-${separated[2].padStart(2, '0')}-${separated[1].padStart(2, '0')}T${separated[4].padStart(2, '0')}:${separated[5].padStart(2, '0')}:${separated[6].padStart(2, '0')}`;
  }
  return text.toLowerCase();
}

export function extractDriveFileId(value: unknown): string | null {
  return /\/file\/d\/([^/?]+)/.exec(String(value ?? ''))?.[1] ?? null;
}