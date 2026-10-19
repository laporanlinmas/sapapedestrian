'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGalleryPage, type GalleryItem, type GalleryPage } from './galleryClient';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  useGalleryFeed — sumber data galeri bersama
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Menegakkan satu aturan: **jumlah foto yang tampil tidak boleh berkurang
 *  karena ada foto yang rusak.**
 *
 *  Cara kerjanya:
 *   1. Ambil satu halaman foto (mis. 12).
 *   2. Foto yang gagal dimuat ditandai `rusak` lalu disembunyikan.
 *   3. Selagi jumlahnya kurang dari `target`, tarik foto pengganti dari
 *      cadangan indeks (offset `start` lebih dalam), lalu ulangi.
 *
 *  Server menyimpan lebih banyak foto daripada yang dipublikasikan
 *  (60 foto publik + cadangan), sehingga penggantinya selalu tersedia.
 *
 *  Pagination tetap dipakai: 12 foto per halaman agar halaman tetap ringan,
 *  terutama di ponsel. Foto pengganti hanya ditarik bila memang ada yang
 *  rusak — bukan untuk memuat semuanya sekaligus.
 */

const PER_PAGE = 12;
const REFRESH_MS = 30_000;
const galleryPageCache = new Map<number, GalleryPage>();

export function useGalleryFeed(target: number, enabled = true) {
  const [items, setItems] = useState<GalleryItem[]>(() => galleryPageCache.get(1)?.items ?? []);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(() => galleryPageCache.get(1)?.pages ?? 0);
  const [pool, setPool] = useState(() => galleryPageCache.get(1)?.pool ?? 0);
  const [total, setTotal] = useState(() => galleryPageCache.get(1)?.total ?? 0);
  const [loading, setLoading] = useState(() => !galleryPageCache.has(1));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  /** Foto yang aman ditampilkan (yang tidak rusak). */
  const tampil = items.filter((i) => !broken.has(i.id));

  const onPhotoError = useCallback((id: string) => {
    setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  /** Muat ulang sebuah halaman dari awal (dipakai tombol pagination). */
  const load = useCallback(async (halaman: number) => {
    const requestId = ++requestSequence.current;
    const cached = galleryPageCache.get(halaman);
    if (cached) {
      setItems(cached.items);
      setPage(cached.page);
      setPages(cached.pages);
      setPool(cached.pool ?? 0);
      setTotal(cached.total);
      setBroken(new Set());
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError('');
    const data = await fetchGalleryPage(halaman, PER_PAGE);
    if (requestId !== requestSequence.current) return;
    if (!data) {
      if (!cached) setError('Galeri belum dapat dimuat. Coba muat ulang sebentar lagi.');
      setLoading(false);
      return;
    }
    galleryPageCache.set(data.page, data);
    setItems(data.items);
    setPage(data.page);
    setPages(data.pages);
    setPool(data.pool ?? 0);
    setTotal(data.total);
    setBroken(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) void load(1);
  }, [enabled, load]);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => { void load(page); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [enabled, load, page]);

  /**
   * Isi kekurangan: tarik foto pengganti dari cadangan indeks.
   *
   * Penanda "sedang menambah" disimpan di REF, bukan di state. Kalau memakai
   * state, perubahan status akan memicu efek ini lagi; cleanup-nya
   * membatalkan permintaan yang sedang berjalan, lalu efek berikutnya keluar
   * karena status masih true — sehingga pengisian tidak pernah selesai.
   */
  const menambah = useRef(false);

  useEffect(() => {
    if (!enabled || loading || menambah.current) return;
    const kurang = target - tampil.length;
    if (kurang <= 0) return;

    // Offset: semua foto yang sudah pernah diambil pada halaman ini
    // (termasuk yang rusak) digeser agar penggantinya tidak tumpang tindih.
    const dari = (page - 1) * PER_PAGE + items.length;
    if (dari >= pool) return;                 // cadangan habis

    // Ambil SECUKUPNYA saja. Kalau kita selalu meminta satu halaman penuh,
    // 3 foto yang rusak akan menambah 12 foto — isi halaman jadi melebar.
    const minta = Math.min(kurang, PER_PAGE);

    menambah.current = true;
    setLoadingMore(true);

    void (async () => {
      try {
        const data = await fetchGalleryPage(page, minta, dari);
        if (!data || data.items.length === 0) return;
        setPool(data.pool ?? 0);
        setItems((prev) => {
          const map = new Map<string, GalleryItem>();
          for (const it of [...prev, ...data.items]) if (!map.has(it.id)) map.set(it.id, it);
          return [...map.values()];
        });
      } finally {
        menambah.current = false;
        setLoadingMore(false);
      }
    })();
  }, [enabled, loading, tampil.length, items.length, target, page, pool]);

  /** Muat ulang dari halaman pertama (tombol "Coba lagi"). */
  const retry = useCallback(() => { void load(1); }, [load]);

  return {
    items: tampil,
    retry,
    loading,
    loadingMore,
    error,
    total,
    pool,
    page,
    pages,
    onPhotoError,
    load,
  };
}
