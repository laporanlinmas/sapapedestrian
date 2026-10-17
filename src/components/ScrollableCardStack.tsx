'use client';

import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import GalleryStackSkeleton, { cardGeometry, stackVars } from '@/components/GalleryStackSkeleton';

/* ═══════════════════════════════════════════════════════════════════════════
 *  TUMPUKAN KARTU GALERI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Tumpukan kartu foto yang bisa digeser, atau dinavigasi dengan keyboard dan
 *  tombol. Kartu di belakang menyusut ke belakang seperti deck, memberi rasa
 *  kedalaman TANPA `filter: blur()` sama sekali — kedalaman itu dibangun dari
 *  skala, transisi, dan sebuah scrim gelap yang makin pekat seiring jarak.
 *
 *  ── Tiga keputusan yang menyimpang dari referensi, dan alasannya ─────────
 *
 *  1. TIDAK ADA `touch-action: none`, dan roda vertikal TIDAK dicegat.
 *     Referensi memakai `touchAction: "none"` + `preventDefault()` tanpa
 *     syarat pada setiap putaran roda. Di beranda yang panjang seperti ini,
 *     itu berarti galeri merebut scroll vertikal halaman — dan di HP,
 *     menahan halaman terus-menerus. Jadi:
 *       · roda dengan |deltaX| > |deltaY| → milik widget, dicegah, kartu
 *         berpindah satu langkah;
 *       · roda vertikal → milik halaman, dibiarkan lewat;
 *       · `touch-action: pan-y` → gesek horizontal berpindah kartu, gesek
 *         vertikal tetap menggulir halaman seperti biasa.
 *     Widget dekoratif tidak boleh merebut scroll halaman.
 *
 *  2. TIDAK ADA `filter: blur()` di mana pun. Pada referensi, `blur` justru
 *     diberikan ke kartu `index < currentIndex` — yang kebetulan opacity-nya
 *     0, jadi tidak pernah terlihat, hanya memboroskan lapisan komposit.
 *     Efek yang dimaksud di sini dibangun dari `scale` + `opacity` + scrim.
 *     Foto tetap tajam persis seperti aslinya.
 *
 *  3. Ukuran kartu dihitung di CSS, bukan di JavaScript, dan tidak ada
 *     pembacaan DOM sama sekali. `--card-w` = `min(cardWidth, 100vw − 2rem)`,
 *     tinggi dari `aspect-ratio` 16/10, ruang untuk kartu di belakang dari
 *     `ROOM_PX`. Kartu tidak mungkin meluber saat viewport berubah atau
 *     perangkat dirotasi — dan tidak perlu `ResizeObserver`.
 *
 *  Modul ini sengaja dimuat lewat `lazy()` dari GallerySection: `motion`
 *  bernilai ±87 KB gzip, dan section ini ada di bawah lipatan. Sebelum
 *  chunk-nya tiba, `GalleryStackSkeleton` (tanpa motion) mengisi tempatnya
 *  dengan geometri yang persis sama.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const SETTLE_MS = 280;
const MIN_STEP_INTERVAL = 320;
const WHEEL_THRESHOLD = 24;
const SWIPE_THRESHOLD = 44;

export interface CardItem {
  id: string;
  image: string;
  /** Baris bawah kartu — tanggal laporan. */
  name: string;
  /** Penanda pendek di samping nama. */
  handle?: string;
  /** Logo kecil di baris bawah. */
  avatar?: string;
  alt: string;
}

export interface ScrollableCardStackProps {
  items: CardItem[];
  /** Lebar kartu maksimum; tinggi diturunkan dari rasio 16:10. */
  cardWidth?: number;
  className?: string;
  /** Tampilkan skeleton — wadah & geometri identik dengan isi sebenarnya. */
  loading?: boolean;
  /** Berapa slot kartu yang akan diisi. WAJIB diisi saat `loading` —
   *  tanpa ini skeleton hanya menggambar satu kartu dan seluruh section
   *  melompat begitu data tiba. */
  slotCount?: number;
  /** Dipanggil saat sebuah foto gagal dimuat. */
  onItemError?: (id: string) => void;
  /** Dipanggil saat kartu aktif ditekan (index, item). */
  onSelect?: (index: number, item: CardItem) => void;
  /** Label untuk pembaca layar pada keseluruhan region. */
  label?: string;
}

export default function ScrollableCardStack({
  items,
  cardWidth = 320,
  className,
  loading = false,
  slotCount = 0,
  onItemError,
  onSelect,
  label = 'Tumpukan foto kegiatan',
}: ScrollableCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const lastStep = useRef(0);
  const settleTimer = useRef<number | undefined>(undefined);
  const swipeStartX = useRef(0);
  const swipeUsed = useRef(false);

  const shouldReduceMotion = useReducedMotion();

  /** Foto yang gagal dimuat disembunyikan supaya tidak ada kotak rusak di
   *  tengah tumpukan. */
  const visible = items.filter((i) => !failed.has(i.id));
  const maxIndex = visible.length - 1;

  const clamp = useCallback(
    (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
    [],
  );

  /** Selesaikan satu perpindahan: set indeks, lalu buka kunci setelah animasi
   *  spring rehat. Timer dibersihkan di efek cleanup supaya tidak ada
   *  `setState` setelah komponen dilepas. */
  const goTo = useCallback((index: number) => {
    setIsSettling(true);
    setCurrentIndex(index);
    lastStep.current = Date.now();
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setIsSettling(false), SETTLE_MS);
  }, []);

  /** Pindah satu langkah dengan jeda minimum, supaya satu gesekan panjang
   *  tidak melompati lima kartu sekaligus. */
  const step = useCallback(
    (direction: 1 | -1) => {
      if (isSettling || maxIndex < 1) return;
      if (Date.now() - lastStep.current < MIN_STEP_INTERVAL) return;
      const next = clamp(currentIndex + direction, 0, maxIndex);
      if (next === currentIndex) return;
      goTo(next);
    },
    [clamp, currentIndex, goTo, isSettling, maxIndex],
  );

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  /* Jaga indeks tetap sah saat daftar foto berubah — mis. satu foto rusak lalu
   *  digantikan, sehingga `items` memendek. */
  useEffect(() => {
    if (currentIndex > maxIndex) setCurrentIndex(Math.max(0, maxIndex));
  }, [currentIndex, maxIndex]);

  const markFailed = useCallback(
    (id: string) => {
      setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      onItemError?.(id);
    },
    [onItemError],
  );

  /* Roda: hanya yang jelas horizontal yang menjadi milik widget; vertikal
   * dibiarkan ke halaman. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaX) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      step(e.deltaX > 0 ? 1 : -1);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [step]);

  if (loading) {
  return <GalleryStackSkeleton count={slotCount || items.length || 1} cardWidth={cardWidth} className={className} />;
}
  if (visible.length === 0) return null;

  const vars = stackVars(cardWidth) as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cn('gallery-stack', className)}
      style={vars}
      role="group"
      aria-roledescription="tumpukan kartu bergulir"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault(); step(-1); break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault(); step(1); break;
          case 'Home':
            e.preventDefault(); if (currentIndex !== 0) goTo(0); break;
          case 'End':
            e.preventDefault(); if (currentIndex !== maxIndex) goTo(maxIndex); break;
          default:
            break;
        }
      }}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        swipeStartX.current = e.touches[0].clientX;
        swipeUsed.current = false;
      }}
      onTouchMove={(e) => {
        if (swipeUsed.current || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - swipeStartX.current;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        swipeUsed.current = true;
        step(dx < 0 ? 1 : -1);
      }}
      onTouchEnd={() => { swipeUsed.current = false; }}
    >
      {/* Posisi untuk pembaca layar; sekaligus umpan balik saat navigasi. */}
      <span className="sr-only" aria-live="polite">
        {`Foto ${currentIndex + 1} dari ${visible.length}. Gunakan panah kiri dan kanan untuk berpindah.`}
      </span>

      <div className="gallery-stack__cards">
        {visible.map((item, i) => {
          const g = cardGeometry(i, currentIndex);
          const depth = shouldReduceMotion ? 0 : g.depth;
          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{ scale: g.scale, x: '-50%', y: `calc(-50% + ${g.y}px)` }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { damping: 22, duration: 0.32, mass: 0.6, stiffness: 260, type: 'spring' }
              }
              whileHover={shouldReduceMotion || !g.active ? undefined : { scale: g.scale * 1.02 }}
              className={cn(
                'gallery-stack__card',
                g.active ? 'is-active cursor-pointer' : 'pointer-events-none',
              )}
              style={{ zIndex: visible.length - i }}
              aria-hidden={!g.active}
              aria-label={g.active ? item.alt : undefined}
              tabIndex={g.active ? 0 : -1}
              onClick={() => { if (g.active && onSelect) onSelect(i, item); }}
            >
              <img
                src={item.image}
                alt={g.active ? item.alt : ''}
                className="h-full w-full object-cover"
                draggable={false}
                decoding="async"
                loading="lazy"
                onError={() => markFailed(item.id)}
              />

              {/* Scrim kedalaman: makin pekat makin jauh. Tanpa blur. */}
              {depth > 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `rgb(2 6 23 / ${depth.toFixed(3)})` }}
                />
              ) : null}

              {/* Baris bawah: sumber & tanggal laporan. */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-white/95 px-3 py-2.5 dark:bg-slate-900/95">
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-full"
                    draggable={false}
                    height={20}
                    width={20}
                    loading="lazy"
                    style={{ boxShadow: '0 0 0 1px rgb(148 163 184 / .5)' }}
                  />
                ) : null}
                <span className="truncate text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">
                  {item.name}
                </span>
                {item.handle ? (
                  <span className="shrink-0 text-sm font-normal leading-none text-slate-500 dark:text-slate-400">
                    {item.handle}
                  </span>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Navigasi ──────────────────────────────────────────────────────
          Semua kontrol punya `aria-label` yang menyebut posisinya. Titik
          memakai `aria-current`, bukan `role="tab"` — tablist tanpa tabpanel
          yang benar hanya menambah binggung bagi pembaca layar. */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <StackArrow dir="prev" disabled={currentIndex === 0} onClick={() => step(-1)} total={visible.length} />

        <div className="flex items-center gap-2">
          {visible.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { if (i !== currentIndex && !isSettling) goTo(i); }}
              aria-current={i === currentIndex ? 'true' : undefined}
              aria-label={`Tampilkan foto ${i + 1} dari ${visible.length}`}
              className={cn(
                'h-2 w-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
                i === currentIndex
                  ? 'scale-125 bg-blue-600'
                  : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500',
              )}
            />
          ))}
        </div>

        <StackArrow dir="next" disabled={currentIndex === maxIndex} onClick={() => step(1)} total={visible.length} />
      </div>

      {/* Petunjuk hanya di layar sentuh — di desktop sudah jelas dari titik dan
          tombol panah. */}
      <p className="mt-2 text-center text-[11px] leading-tight text-slate-500 dark:text-slate-400 sm:hidden">
        Geser kartu atau ketuk titiknya
      </p>
    </div>
  );
}

function StackArrow({
  dir,
  disabled,
  onClick,
  total,
}: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  total: number;
}) {
  const kata = dir === 'prev' ? 'sebelumnya' : 'berikutnya';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Foto ${kata} dari ${total}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
    >
      <svg
        aria-hidden="true"
        className={cn('h-4 w-4', dir === 'prev' ? 'rotate-180' : '')}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}