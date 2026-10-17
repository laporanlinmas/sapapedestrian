import { memo, useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import './pedestrian-hero.css';

/**
 * Petugas — dua petugas istirahat SATGAS yang melambaikan tangan sambil berseri.
 *
 * === Kenapa satu file WebP animasi, bukan Lottie? =========================
 * Aset aslinya (`.lottie` / `.json`) berisi 50 frame WebP yang dibungkus
 * sebagai "Lottie raster" hasil konversi MP4 — bukan vektor. Memutarinya
 * lewat `lottie-web` hanya menambah ~250 KB library untuk menggambar ulang
 * 50 <image> yang isinya sama persis dengan satu file WebP animasi:
 *
 *   Lottie + JSON : ~250 KB JS + 2,3 MB JSON  = ~2,5 MB, perlu runtime
 *   WebP animasi  :              ~1,3 MB      = 1 request, 0 JS
 *
 * WebP animasi diputar native oleh browser (bukan JavaScript), jadi tidak ada
 * pekerjaan main-thread per frame, dan browser otomatis berhenti mendecode
 * saat gambar tak terlihat. Alphanya asli (transparan) sehingga menyatu dengan
 * tema terang/gelap tanpa kotak latar.
 *
 * === Strategi pemuatan ====================================================
 * Dua tahap, supaya tidak pernah ada lompatan layout atau kilatan kosong:
 *
 *   1. POSTER (33 KB, frame 0) langsung dipasang — petugas langsung terlihat.
 *   2. Animasi (~1,3 MB) diunduh diam-diam saat browser menganggur, lalu
 *      di-decode lebih dulu; baru setelah siap `src` ditukar. Karena file-nya
 *      sudah ada di cache, pergantian tidak berkedip.
 *
 * Tahap 2 dilewati seluruhnya bila pengguna meminta reduced-motion, atau
 * perangkatnya memang pelit: hemat data / jaringan 2G. Poster statis sudah
 * cukup sebagai gantinya.
 *
 * Aset dibuat ulang dari `.lottie` dengan:
 *   npm run build:hero-anim -- <path>.lottie
 */

/** File animasi — biarkan browser & CDN yang menangani cache. */
const ANIM_SRC = '/assets/hero-petugas.webp';
/** Frame pertama sebagai gambar diam: sumber instan + fallback. */
const POSTER_SRC = '/assets/hero-petugas-poster.webp';

/** Ukuran kanvas aset (juga berguna untuk reserving rasio & CLS). */
const NATIVE_W = 849;
const NATIVE_H = 464;

/**
 * Boleh tidak animasi diputar di perangkat ini?
 *
 * Semua kondisi di bawah sama-sama berarti "jangan putar loop 2,5 detik
 * otomatis": pengguna belum meminta gerakan, atau perangkatnya memang tidak
 * sanggup / tidak ingin membelanjakan bandwidth untuk itu.
 */
function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;

  const conn = (
    window.navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return false;

  return true;
}

/** Jalankan `fn` saat browser menganggur, atau paling lama setelah `timeout` ms. */
function whenIdle(fn: () => void, timeout: number): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (h: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const handle = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(handle);
  }
  const timer = window.setTimeout(fn, Math.min(timeout, 1200));
  return () => window.clearTimeout(timer);
}

/**
 * Enam partikel cahaya tersebar merata — cukup untuk memberi kesan "hidup",
 * sisanya murni pemborosan paint. Posisi, ukuran, dan durasi sudah diatur di
 * sini; yang digerakkan hanya transform & opacity (lihat pedestrian-hero.css).
 */
const MOTES: readonly CSSProperties[] = [
  { left: '13%', width: 3, height: 3, animationDuration: '15s', animationDelay: '0s' },
  { left: '28%', width: 2, height: 2, animationDuration: '18s', animationDelay: '3.1s' },
  { left: '43%', width: 3, height: 3, animationDuration: '16s', animationDelay: '5.6s' },
  { left: '58%', width: 2, height: 2, animationDuration: '19s', animationDelay: '1.4s' },
  { left: '73%', width: 3, height: 3, animationDuration: '15s', animationDelay: '6.3s' },
  { left: '88%', width: 2, height: 2, animationDuration: '17s', animationDelay: '2.7s' },
];

export interface PedestrianHeroProps {
  /** Sumber animasi (WebP animasi). */
  src?: string;
  /** Sumber gambar diam (frame pertama). */
  poster?: string;
  /** Teks alternatif. Kosongkan bila ilustrasinya murni dekoratif. */
  alt?: string;
  className?: string;
}

function PedestrianHeroBase({
  src = ANIM_SRC,
  poster = POSTER_SRC,
  alt = '',
  className = '',
}: PedestrianHeroProps): ReactElement {
  /** Sumber mana yang sedang tampil: poster dulu, lalu animasi. */
  const [stage, setStage] = useState<'poster' | 'anim'>('poster');
  /** Gate fade-in: gambarnya sudah siap dilukis. */
  const [painted, setPainted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  /* Gambar bisa sudah selesai ter-cache sebelum React sempat menempelkan
   * `onLoad`, sehingga event itu tidak pernah terpanggil dan gambar akan
   * menggantung di opacity 0. Cek `complete` sekali setelah mount. */
  useEffect(() => {
    if (imgRef.current?.complete) setPainted(true);
  }, []);

  useEffect(() => {
    if (!motionAllowed()) return;

    let cancelled = false;
    let cancelIdle = () => {};

    /* Timeout 4 s: animasi tetap mulai walau browser tidak pernah menganggur.
       Foto sudah tampil jauh sebelum itu. */
    cancelIdle = whenIdle(() => {
      /* Preload di luar DOM lalu decode lebih dulu; baru setelah selesai
       * `src` ditukar. Karena file-nya sudah ada di cache, pergantian dari
       * poster ke animasi tidak berkedip. */
      const pre = new Image();
      pre.src = src;
      const ready = pre.decode
        ? pre.decode()
        : new Promise<void>((resolve) => {
            pre.onload = () => resolve();
            pre.onerror = () => resolve();
          });
      ready
        .then(() => {
          if (!cancelled) setStage('anim');
        })
        .catch(() => {
          /* Decode gagal / jaringan putus — poster statis sudah cukup. */
        });
    }, 4000);

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [src]);

  return (
    <div className={`pedestrian-hero ${className}`}>
      {/* Panggung: glow lembut + bayangan tanah di bawah kaki.
          Murni CSS dan dipanggang sekali. Sengaja tidak dianimasikan —
          denyut opacity pada gradient selebar ~700 px memaksa browser
          menggambar ulang seluruh gradien itu setiap frame. Kesan hidup sudah
          datang dari lambaian petugasnya sendiri. */}
      <div aria-hidden className="pedestrian-hero__glow" />
      <div aria-hidden className="pedestrian-hero__shadow" />

      {/* Partikel cahaya: 6 titik HTML, satu lapisan komposit masing-masing. */}
      <div aria-hidden className="pedestrian-hero__motes">
        {MOTES.map((style, i) => (
          <span key={i} className="pedestrian-hero__mote" style={style} />
        ))}
      </div>

      <img
        ref={imgRef}
        src={stage === 'anim' ? src : poster}
        alt={alt}
        width={NATIVE_W}
        height={NATIVE_H}
        decoding="async"
        /* Event load tetap dipasang walau `src` berganti, supaya fade-in
           tidak ikut ter-reset. */
        onLoad={() => setPainted(true)}
        onError={() => setStage('poster')}
        className={`pedestrian-hero__figure${painted ? ' is-painted' : ''}`}
      />
    </div>
  );
}

const PedestrianHero = memo(PedestrianHeroBase);
export default PedestrianHero;