/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Cache byte foto galeri di memori server.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Kenapa perlu?
 *  Tanpa cache, setiap thumbnail berarti satu perjalanan bolak-balik ke
 *  Google Drive (±700 ms). Satu halaman berisi 12–24 foto, sehingga pengunjung
 *  pertama bisa menunggu belasan detik.
 *
 *  Catatan jujur soal ruang lingkup:
 *  - Fungsi di Vercel stateless. Instance yang "hangat" (tetap hidup) akan
 *    memakai cache ini; instance yang baru bangun mulai kosong.
 *  - Lapisan yang benar-benar selesai menyerap trafik berulang adalah CDN
 *    Vercel (header `immutable` + `s-maxage` di api/gallery-photo). Cache
 *    di sini menutup celah pada kunjungan pertama.
 *
 *  Batas: 64 entri ≈ 4 MB. Foto di-evict lebih dulu (LRU) supaya memori
 *  server tidak membengkak.
 */

interface Entry {
  bytes: Buffer;
  contentType: string;
  expiresAt: number;
}

const MAX_ENTRIES = 64;
const TTL_MS = 60 * 60 * 1000; // 1 jam

const store = new Map<string, Entry>();

/** Ambil dari cache, atau `undefined` bila belum ada / kedaluwarsa. */
export function getCached(key: string): Entry | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  // Sentuh: pindahkan ke akhir (posisi "paling baru" untuk LRU).
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function setCached(key: string, bytes: Buffer, contentType: string): void {
  store.set(key, { bytes, contentType, expiresAt: Date.now() + TTL_MS });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/** Hanya untuk pengujian/ debugging. */
export function cacheSize(): number {
  return store.size;
}
