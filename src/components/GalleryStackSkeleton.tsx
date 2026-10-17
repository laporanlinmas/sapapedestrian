'use client';

import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
 *  GEOMETRI TUMPUKAN KARTU — sumber tunggal
 * ═══════════════════════════════════════════════════════════════════════════
 *  Konstanta di sini dipakai BOTH oleh skeleton dan oleh tumpukan aslinya.
 *  Kalau keduanya mengarang angka sendiri, satu meleset sedikit dan
 *  "loading yang mulus" itu kembali jadi lompatan layout.
 *
 *  Berpasangan dengan `.gallery-stack*` di landing.css:
 *    --card-w : min(cardWidth, 100vw − 2rem)
 *    tinggi   : aspect-ratio 16/10
 *    ruang    : ROOM_PX untuk 3 kartu di belakang (3 × FRAME_OFFSET = 90)
 */

export const FRAME_OFFSET = -30;
export const FRAMES_VISIBLE_LENGTH = 3;
export const SCALE_FACTOR = 0.08;
export const MIN_SCALE = 0.45;

/** Kartu yang sudah dilewat menyusut sebesar ini per langkah — sangat kecil,
 *  supaya kartu sebelumnya tidak berkedip hilang dan berganti. */
export const PASSED_SCALE_FACTOR = 0.003;

/** Ruang vertikal tambahan untuk kartu-kartu di belakang. */
export const ROOM_PX = Math.abs(FRAME_OFFSET) * FRAMES_VISIBLE_LENGTH + 6;

export function stackVars(cardWidth: number): CSSProperties {
  return { '--card-w': `min(${cardWidth}px, calc(100vw - 2rem))` } as CSSProperties;
}

/** Offset + skala + kedalaman kartu `index` saat aktif ada di `currentIndex`. */
export function cardGeometry(index: number, currentIndex: number) {
  const offset = index - currentIndex;
  const active = offset === 0;

  const scale =
    offset >= 0
      ? Math.min(Math.max(1 - offset * SCALE_FACTOR, MIN_SCALE), 1)
      /* Kartu yang sudah dilewat menyusut sangat sedikit supaya tidak
       * berkedip hilang lalu berganti. */
      : Math.min(Math.max(1 + offset * PASSED_SCALE_FACTOR, 0.995), 1);

  const y =
    offset >= 0
      ? Math.min(Math.max(offset * FRAME_OFFSET, FRAME_OFFSET * FRAMES_VISIBLE_LENGTH), 0)
      : offset * FRAME_OFFSET;

  /* Intensitas scrim kedalaman — inilah yang memberi rasa kedalaman tanpa
   * `filter: blur()`. 0 % untuk kartu aktif, ±22 % untuk yang paling jauh. */
  const depth = active ? 0 : Math.min(Math.max(Math.abs(y) / Math.abs(FRAME_OFFSET) * 0.09, 0), 0.22);

  return { scale, y, depth, active };
}

/**
 * Skeleton untuk tumpukan kartu.
 *
 * Sengaja TIDAK mengimpor `motion` (~87 KB gzip): section galeri ada di bawah
 * lipatan, dan halaman harus tetap ringan sebelum sampai ke sana. Karena
 * geometrinya dari fungsi yang sama dengan tumpukan aslinya dan kelas CSS-nya
 * sama persis, begitu modul `motion` selesai diunduh dan foto siap, tidak ada
 * satu piksel pun yang bergeser.
 */
export default function GalleryStackSkeleton({
  count,
  cardWidth = 320,
  className,
}: {
  /** Berapa slot yang akan diisi. WAJIB sama dengan jumlah foto yang akan
   *  datang — kalau tidak, skeleton melebar begitu data tiba. */
  count: number;
  cardWidth?: number;
  className?: string;
}) {
  const n = Math.max(count, 1);
  return (
    <div className={cn('gallery-stack', className)} style={stackVars(cardWidth)} aria-busy="true">
      <span className="sr-only" aria-live="polite">Memuat galeri kegiatan…</span>

      <div className="gallery-stack__cards">
        {Array.from({ length: n }, (_, i) => {
          const g = cardGeometry(i, 0);
          return (
            <div
              key={i}
              aria-hidden="true"
              className="gallery-stack__card"
              style={{
                transform: `translate(-50%, -50%) translateY(${g.y}px) scale(${g.scale})`,
                zIndex: n - i,
                opacity: i === 0 ? 1 : 0.7,
              }}
            >
              <div className="gallery-skeleton h-full w-full rounded-2xl" />
            </div>
          );
        })}
      </div>

      {/* Bar navigasi skeleton harus tinggi PERSIS sama dengan yang asli
          (32 px untuk panah + titik). Kalau tidak, baris ini menyusut 24 px
          begitu modul tiba dan seluruh section melompat. */}
      <div className="mt-3 flex h-8 items-center justify-center gap-3" aria-hidden="true">
        <span className="h-8 w-8 shrink-0 rounded-full border border-slate-200 dark:border-slate-700" />
        <span className="flex items-center gap-2">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full',
                i === 0 ? 'scale-125 bg-slate-400 dark:bg-slate-500' : 'bg-slate-200 dark:bg-slate-700',
              )}
            />
          ))}
        </span>
        <span className="h-8 w-8 shrink-0 rounded-full border border-slate-200 dark:border-slate-700" />
      </div>
    </div>
  );
}