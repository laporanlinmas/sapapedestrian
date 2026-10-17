/**
 * Klien API galeri.
 *
 * Semua permintaan melewati helper `safeFetchJson` yang sama dengan dipakai
 * halaman lain: backend occasionally mengembalikan HTML saat error/timeout,
 * dan `res.json()` akan melempar SyntaxError yang membingungkan. Di sini
 * setiap kegagalan diubah menjadi nilai yang bisa ditampilkan UI.
 */

export interface GalleryItem {
  id: string;
  tanggal: string;
  thumb: string;
  large: string;
}

export interface GalleryPage {
  ok: boolean;
  /** Jumlah foto untuk publik (60). */
  total: number;
  /** Batas publik yang berlaku. */
  limit: number;
  /** Total foto terverifikasi tersedia (publik + cadangan pengganti). */
  pool: number;
  page: number;
  /** Indeks offset yang dipakai server saat menjawab. */
  start: number;
  perPage: number;
  pages: number;
  items: GalleryItem[];
  message?: string;
}

const TIMEOUT_MS = 15_000;

async function safeFetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ambil satu halaman foto.
 *
 * @param page     halaman ke-berapa
 * @param perPage  jumlah per halaman
 * @param start    offset ke dalam daftar; dipakai untuk mengambil foto
 *                 PENGGANTI ketika ada foto yang gagal dimuat.
 */
export async function fetchGalleryPage(
  page: number,
  perPage = 12,
  start = 0,
): Promise<GalleryPage | null> {
  const data = await safeFetchJson<GalleryPage>(
    `/api/gallery?page=${page}&perPage=${perPage}&start=${start}`,
  );
  if (!data || typeof data.total !== 'number') return null;
  return data;
}
