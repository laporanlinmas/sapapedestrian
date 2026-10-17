import { memo, useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Panorama 360° sebagai latar paling belakang Hero.
 *
 * === Kenapa Canvas 2D, bukan Photo Sphere Viewer? =========================
 * Latar hero bukan tontonan yang jadi sorotan: ia cuma lapisan paling
 * belakang, selalu tertutup scrim + teks + ilustrasi. WebGL/Three.js untuk
 * seekadar itu berarti ~600 KB bundle plus shader yang harus dikompilasi,
 * dan panorama di bola tetap mendistorsi tepi (efek fish-eye) persis di
 * bagian yang paling kelihatan, yaitu sisi kiri–kanan layar lebar.
 *
 * Yang sebenarnya dibutuhkan cuma satu: potong sebuah strip dari gambar
 * ekuirektangular, geser strip itu tiap frame, sambung lagi di seam. Canvas 2D
 * melakukannya tanpa dependensi baru, dan — ini yang paling penting — bisa
 * menggambar piksel sumber 1:1 sehingga fotonya tetap tajam, bukan hasil
 * pembesaran.
 *
 * Di sinilah bedanya dari pendekatan "canvas + devicePixelRatio mentah".
 * Kalau DPR=2 dipakai apa adanya, potongan 1138 px dipaksa mengisi kanvas
 * 3840 px: pembesaran 3,4× yang membuat panorama terlihat buram. Di sini
 * begitu rasio pembesarannya melewati batas, field of view justru DILEBARKAN
 * sampai potongannya cukup besar, lalu kanvas ditahan di resolusi sumber.
 * Hasilnya sumber→layar hanya di-resample satu kali.
 *
 * === Yang sengaja dihindari =============================================
 *   - Tidak ada filter `blur()` / `backdrop-filter` di lapisan hero ini.
 *   - Tidak ada WebGL / three.js / dependensi baru.
 *   - rAF idle-batching: putarannya hanya berjalan saat pano terlihat.
 *   - Tidak ada pembacaan layout per frame (lihat `view` di bawah).
 *
 * === Interaksi ===========================================================
 * Sengaja `pointer-events: none`. Ini latar, bukan produk: menahan gestur di
 * sini akan merebut scroll vertikal di HP dan memblokir pemilihan teks di
 * desktop. Yang diminta — berputar otomatis — tetap berjalan.
 */

export interface PanoramaBackdropProps {
  src?: string;
  /** Ukuran natural panorama ekuirektangular (aslinya selalu 2:1). */
  naturalWidth?: number;
  naturalHeight?: number;
  /** Yaw awal dalam derajat. 0 = titik tengah file. */
  startYaw?: number;
  /** Kecepatan putar (derajat/detik). Negatif = berlawanan arah jam. */
  degreesPerSecond?: number;
  /** Field of view horizontal dasar (derajat) sebelum penyesuaian ketajaman. */
  baseFov?: number;
  /** Di mana garis horizon (setengah tinggi gambar) jatuh, 0..1 dari tinggi hero. */
  horizonRatio?: number;
  className?: string;
}

const PANORAMA_SRC = '/assets/360.webp';

/* ── Batas ketajaman & performa ────────────────────────────────────────── */

/**
 * Batas pembesaran yang masih terbaca sebagai foto. Di atas itu yang Keystone
 * berubah jadi "diperbesar" — penyebab utama panorama buram.
 */
const MAX_UPSCALE = 2.4;

/** Plafon FOV. Makin lebar makin banyak piksel sumber yang terpakai (bagus
 *  untuk ketajaman), tapi makin lebar juga distorsi silinder di tepi. 150°
 *  sudah jauh melampaui "lebar kacamata", dan justru itu yang kita mau dari
 *  sebuah latar. */
const MAX_FOV = 150;

/** Anggaran piksel kanvas: 2,6 Mpx ≈ 1920×1350 — murah di semua GPU. */
const MAX_BACKING_PX = 2_600_000;

/** Resolusi kanvas tidak pernah turun di bawah ini, walau viewport raksasa. */
const MIN_BACKING_SCALE = 0.45;

/* ── Preferensi perangkat ──────────────────────────────────────────────── */

type NetInfo = { saveData?: boolean; effectiveType?: string };

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Layak tidak memuat ~840 KB foto untuk pengguna ini?
 *
 * `saveData` = permisi eksplisit "hemat data" → panorama dilewati
 * sepenuhnya, hero jatuh ke gradien temanya (persis seperti sebelum ada
 * pano). Jaringan `2g` hanya lambat, jadi gambarnya tetap dimuat tetapi
 * tidak berputar: diam sudah jauh lebih baik daripada hero kosong.
 */
function panoramaAllowed(): boolean {
  const conn = (
    typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: NetInfo }).connection
  );
  return !conn?.saveData;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Potongan sumber + ukuran kanvas untuk viewport tertentu. */
interface View {
  /** Lebar potongan sumber (dalam piksel natural). */
  srcW: number;
  /** Tinggi potongan sumber. */
  srcH: number;
  /** Backing store kanvas. */
  backW: number;
  backH: number;
}

function PanoramaBackdropBase({
  src = PANORAMA_SRC,
  naturalWidth = 4096,
  naturalHeight = 2048,
  startYaw = 250,
  degreesPerSecond = 2,
  baseFov = 100,
  horizonRatio = 0.52,
  className = '',
}: PanoramaBackdropProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    /* `alpha: false` → kanvas punya buffer opaque, jadi tidak pernah bisa
     * menampilkanyyang tembus transparan walau fotonya belum siap. */
    if (!canvas || !panoramaAllowed()) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    /* Semua opsi hanya dibaca di dalam efek. Nilai yang berganti-ganti tiap
     * render akan membatalkan unduhan 840 KB di tengah jalan. */
    const opts = {
      src,
      naturalWidth,
      naturalHeight,
      startYaw,
      degreesPerSecond,
      baseFov,
      horizonRatio,
    };

    const state = {
      yaw: opts.startYaw,
      image: null as HTMLImageElement | null,
      visible: true,
      pageVisible: true,
      /** Diam, tapi foto tetap tampil, bila pengguna minta reduced-motion. */
      spinning: !prefersReducedMotion(),
    };

    /* ┌─ 1. Menggambar ───────────────────────────────────────────────┐
     *
     * `view` sengaja TIDAK dihitung per frame: `canvas.clientWidth` adalah
     * pembacaan layout, dan membacanya 60×/detik bisa memaksa reflow saat
     * halaman sedang dirty. Ukuran hanya berubah saat ResizeObserver
     * menyalakan `remeasure()`. */
    let view: View | null = null;

    const measure = (): View => {
      const cssW = Math.max(1, canvas.clientWidth);
      const cssH = Math.max(1, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;

      /* Ada dua sasaran yang bertentangan dan harus dipenuhi bareng:
       *   a) potongan cukup untuk *cover* tanpa bilah kosong (rasio
       *      potongan harus sama dengan rasio viewport), dan
       *   b) potongan sebesar mungkin supaya tidak perlu diperbesar.
       *
       * (b) dicapai dengan menaikkan FOV selama pembesarannya masih di atas
       * MAX_UPSCALE. Di 1920 px DPR2, FOV 100° (potongan 1138 px) akan
       * diperbesar 3,4×, jadi FOV dilepas naik sampai potongannya 1638 px —
       * persis seukuran kanvas. Hasilnya 1:1. */
      let fov = clamp(opts.baseFov, 30, MAX_FOV);
      let srcW = opts.naturalWidth * (fov / 360);
      const deviceW = cssW * dpr;

      while (fov < MAX_FOV && deviceW / srcW > MAX_UPSCALE) {
        fov = Math.min(MAX_FOV, fov + 3);
        srcW = opts.naturalWidth * (fov / 360);
      }

      let srcH = srcW / (cssW / cssH);
      /* Potongan tidak mungkin lebih tinggi dari gambar (itu kutub). Kalau
       * iya, lebarkan lagi — di HP potret inilah yang sebenarnya membatasi
       * FOV, bukan syarat (b). */
      if (srcH > opts.naturalHeight) {
        srcH = opts.naturalHeight;
        srcW = srcH * (cssW / cssH);
      }

      /* Kanvas tidak pernah lebih besar daripada sumber yang tersedia.
       * Dengan begitu sumber → layar hanya di-resample SATU kali oleh
       * compositor, bukan dua kali. Ini bedanya "tajam" dari "buram". */
      let scale = Math.min(dpr, srcW / cssW);
      scale = Math.min(scale, Math.sqrt(MAX_BACKING_PX / (cssW * cssH)));
      scale = Math.max(MIN_BACKING_SCALE, scale);

      return {
        srcW,
        srcH,
        backW: Math.max(1, Math.round(cssW * scale)),
        backH: Math.max(1, Math.round(cssH * scale)),
      };
    };

    const remeasure = () => {
      view = measure();
      draw();
    };

    /* ┌─ 2. Melukis satu frame ───────────────────────────────────────┐ */
    const draw = () => {
      const img = state.image;
      if (!img || !img.naturalWidth || !view) return;

      const { srcW, srcH, backW, backH } = view;

      /* Mengganti ukuran kanvas juga membersihkannya, jadi warna dasar
       * harus diisi ulang — hanya pada frame itu, bukan tiap frame. */
      if (canvas.width !== backW || canvas.height !== backH) {
        canvas.width = backW;
        canvas.height = backH;
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#020617' : '#cbd5e1';
        ctx.fillRect(0, 0, backW, backH);
      }

      /* Mengecilkan (HP: kanvas 780 px dari potongan 944 px) perlu filtering
       * yang baik supaya tidak berdenyut; membesar cukup dengan bilinear. */
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = srcW > backW ? 'high' : 'low';

      /* Rasio sumber bisa sedikit berbeda dari yang diklaim properti, jadi
       * pemetaan potongannya selalu ikut ukuran nyata gambar. */
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const mapW = (srcW / opts.naturalWidth) * imgW;
      const mapH = (srcH / opts.naturalHeight) * imgH;

      /* Titik tengah latitude (garis horizon) diletakkan di
       * `horizonRatio` dari tinggi hero — itu yang membuat komposisinya
       * "langit di atas, jalan di bawah", dan tetap begitu walau FOV
       * dilebar-lebar oleh (b).
       *
       * DIKLAMP: di HP potret potongan sumber memang setinggi penuh
       * (2048 = 2048), jadi tidak ada ruang untuk menggeser horizon ke
       * 54% — ia mentok di 50%. Tanpa clamp ini, `sy` jadi negatif,
       * browser lalu mengoreksi destination-nya sendiri dan gambarnya
       * diam-diam ter-zoom ~4% hanya di HP. */
      const top = clamp(
        imgH / 2 - opts.horizonRatio * mapH,
        0,
        imgH - mapH,
      );

      /* srcX di-wrap ke [0, imgW). Diputar terus-menerus, jadi sooner or
       * later pasti melewati seam. */
      const rawX = (state.yaw / 360) * imgW - mapW / 2;
      const left = ((rawX % imgW) + imgW) % imgW;

      if (left + mapW <= imgW) {
        ctx.drawImage(img, left, top, mapW, mapH, 0, 0, backW, backH);
      } else {
        /* Memotong di seam: dua kali drawImage, tanpa buffer bolak-balik
         * 4096×2048 yang hanya akan memakan 32 MB. */
        const first = imgW - left;
        const split = (first / mapW) * backW;
        ctx.drawImage(img, left, top, first, mapH, 0, 0, split, backH);
        ctx.drawImage(img, 0, top, mapW - first, mapH, split, 0, backW - split, backH);
      }
    };

    /* ── 3. Memuat gambar ────────────────────────────────────────────── */
    const image = new Image();
    image.decoding = 'async';
    /* Didukung Chromium & Safari 17+; di tempat lain diabaikan saja. */
    image.fetchPriority = 'high';

    let disposed = false;
    let raf = 0;
    let last = 0;

    /* ┌─ 4. Putaran ──────────────────────────────────────────────────┐ */
    const tick = (now: number) => {
      /* Clamp 100 ms: setelah tab lama tidak aktif, lonjakan waktu tidak
       * boleh melompati belasan derajat sekaligus. */
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (state.spinning && state.visible && state.pageVisible) {
        state.yaw = (state.yaw + opts.degreesPerSecond * dt) % 360;
        draw();
      }
      raf = window.requestAnimationFrame(tick);
    };

    /* Idempoten: dipanggil dari `onload` sekaligus dari bawah, karena
     * gambar bisa saja sudah selesai ter-cache sebelum handler terpasang
     * sehingga `onload` tidak pernah datang. */
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = window.requestAnimationFrame(tick);
    };

    image.onload = () => {
      if (disposed) return;
      state.image = image;
      setPainted(true);
      remeasure();
      start();
    };
    image.onerror = () => {
      /* Aset hilang → hero tetap punya gradien temanya. Murni dekoratif,
       * jadi tidak perlu bothering pengguna dengan error. */
      if (!disposed) setPainted(false);
    };
    image.src = opts.src;

    /* ── 5. Observers: hemat daya ────────────────────────────────────── */
    const io = new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) draw();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      state.pageVisible = document.visibilityState === 'visible';
      if (state.pageVisible) draw();
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* Ukuran berubah: putar HP, split view, atau zoom teks. */
    const ro = new ResizeObserver(remeasure);
    ro.observe(canvas);

    if (image.complete && image.naturalWidth > 0) {
      state.image = image;
      setPainted(true);
      remeasure();
      start();
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      image.onload = null;
      image.onerror = null;
    };
  }, [src, naturalWidth, naturalHeight, startYaw, degreesPerSecond, baseFov, horizonRatio]);

  if (!panoramaAllowed()) {
    return <div className={`hero-pano hero-pano--off ${className}`} aria-hidden />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`hero-pano ${painted ? 'is-painted' : ''} ${className}`}
      role="img"
      aria-label="Panorama 360° kawasan pedestrian Kabupaten Ponorogo"
    />
  );
}

const PanoramaBackdrop = memo(PanoramaBackdropBase);
export default PanoramaBackdrop;