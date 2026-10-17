'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, Images, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useGalleryFeed } from '@/lib/useGalleryFeed';
import PhotoLightbox from './PhotoLightbox';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  HALAMAN /galeri — seluruh dokumentasi
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Beranda hanya menampilkan 5 cuplikan. Halaman inilah yang menyediakan
 *  {total} foto laporan terbaru beserta pratinjau (lightbox).
 *
 *  Jaminan: `useGalleryFeed` selalu mengisi jumlah foto yang bisa dibuka.
 *  Foto yang gagal dimuat dilewati dan diganti foto berikutnya, sehingga
 *  jumlah foto yang terlihat tetap utuh.
 */

/**
 * Jumlah foto per halaman (bukan total).
 *
 * Total 60 foto dibagi ke 5 halaman x 12. Memuat 60 foto sekaligus akan
 * berat — terutama di ponsel. `useGalleryFeed(12)` hanya mengisi kembali
 * halaman ini kalau ada foto yang rusak, bukan memuat semuanya.
 */
const PER_HALAMAN = 12;

export default function GalleryPage({ onBack }: { onBack: () => void }) {
  const { items, loading, loadingMore, error, page, pages, onPhotoError, load } =
    useGalleryFeed(PER_HALAMAN);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const goBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else onBack();
  }, [onBack]);

  const goto = (n: number) => {
    if (n < 1 || n > pages) return;
    void load(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="page-backdrop" aria-hidden />

      {/* Topbar — PERSIS sama gaya WebViewScreen (/cctv & /mymaps):
          datar, tipis, warna penuh, tanpa blur/shadow. */}
      <header className="flex h-11 shrink-0 items-center gap-2 bg-blue-700 px-2 text-white dark:bg-slate-800 sm:h-12 sm:px-3">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-xs font-bold
                     transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-white/70 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Beranda</span>
        </button>

        <span className="h-4 w-px shrink-0 bg-white/25" aria-hidden="true" />

        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/15">
          <img src="/assets/icon-48.png" alt="" width={18} height={18} decoding="async" className="object-contain" />
        </span>

        <h1 className="min-w-0 truncate text-[13px] font-extrabold tracking-tight">Galeri Kegiatan</h1>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-8">
        <div className="text-center mb-7 px-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Rekam Jejak Layanan
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Dokumentasi kegiatan dan laporan terbaru di kawasan pedestrian Ponorogo, diurutkan berdasarkan tanggal.
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3" role="status" aria-live="polite">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" aria-hidden />
            <p className="text-xs text-slate-500 dark:text-slate-400">Memuat galeri kegiatan…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => void load(page)}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900"
            >
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && !loadingMore && (
          <div className="text-center py-16 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
            <Images className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum ada foto</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(i)}
                aria-label={`Buka foto ${item.tanggal}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl
                           border border-slate-300 dark:border-slate-700 bg-slate-100 shadow-sm dark:bg-slate-800
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                           transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <img
                  src={item.thumb}
                  alt={`Dokumentasi laporan ${item.tanggal}`}
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={300}
                  draggable={false}
                  data-protected-img=""
                  onError={() => onPhotoError(item.id)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] select-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0
                                 bg-gradient-to-t from-slate-900/85 to-transparent
                                 px-2 pb-2 pt-8 text-[10px] font-semibold text-white
                                 transition-opacity text-left">
                  {item.tanggal}
                </span>
              </button>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="flex items-center justify-center py-6 gap-2" role="status" aria-live="polite">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" aria-hidden />
            <span className="text-xs text-slate-500 dark:text-slate-400">Melengkapi foto…</span>
          </div>
        )}

        {!loading && !error && pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goto(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700
                         bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300
                         disabled:opacity-35 disabled:cursor-not-allowed
                         hover:not-disabled:bg-slate-100 dark:hover:not-disabled:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              onClick={() => goto(page + 1)}
              disabled={page >= pages}
              aria-label="Halaman berikutnya"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700
                         bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300
                         disabled:opacity-35 disabled:cursor-not-allowed
                         hover:not-disabled:bg-slate-100 dark:hover:not-disabled:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-300 dark:border-slate-700 py-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Satgas Linmas Pedestrian · Pemerintah Kabupaten Ponorogo
        </p>
      </footer>

      <PhotoLightbox
        items={items}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
        onError={onPhotoError}
      />
    </div>
  );
}
