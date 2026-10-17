'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Images, ArrowRight } from 'lucide-react';
import { useGalleryFeed } from '@/lib/useGalleryFeed';
import { protectImages } from '@/lib/galleryGuard';
import SectionLabel from '@/components/SectionLabel';
import GalleryStackSkeleton from '@/components/GalleryStackSkeleton';

/* `motion` (tumpukan kartu) bernilai ±87 KB gzip. Section ini ada di bawah
 * lipatan, jadi tidak boleh ikut masuk critical path. Dimuat saat section
 * mendekati layar; sebelum itu `GalleryStackSkeleton` (tanpa motion) mengisi
 * tempatnya dengan geometri yang persis sama. */
const ScrollableCardStack = lazy(() => import('@/components/ScrollableCardStack'));
type CardItem = import('@/components/ScrollableCardStack').CardItem;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GALERI KEGIATAN — pratinjau di beranda
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Beranda hanya menampilkan 5 foto terbaru. Foto-foto itu sengaja tidak
 *  bisa dibuka dengan lightbox di sini: 60 foto penuh dengan viewer akan
 *  membuat beranda berat dan memancing pengunjung keluar sebelum membaca
 *  bagian lain. Tumpukan kartunya interaktif (bisa digeser, diklik, dinavigasi
 *  keyboard) dan tetap ringan; halaman /galeri yang menyediakan isi lengkapnya
 *  plus lightbox.
 *
 *  Foto berasal dari data laporan melalui /api/gallery.
 *
 *  ═══════════════════════════════════════════════════════════════════════════
 *  LOADING — skeleton, bukan spinner
 *  ═══════════════════════════════════════════════════════════════════════════
 *  Tumpukan kartu sudah dirender sejak halaman dibuka, hanya isinya yang
 *  masih skeleton. Karena `ScrollableCardStack` punya cabang `loading` yang
 *  memakai komponen dan kotak yang sama persis, geometrinya tidak mungkin
 *  bergeser ketika foto tiba — selisihnya 0 px, bukan "kira-kira pas".
 * ═══════════════════════════════════════════════════════════════════════════
 */

const PREVIEW = 5;

/* Lebar kartu tumpukan — diteruskan ke skeleton DAN ke modul aslinya.
 * 440 px supaya terasa substansial di laptop/desktop, sementara di HP
 * `--card-w` tetap turun ke `100vw − 2rem` dan tidak pernah meluber. */
const CARD_W = 440;

/** Logo yang mewakili sumber laporan di baris bawah kartu. */
const AVATAR = '/assets/satpol.webp';

export default function GallerySection({ onOpenPage }: { onOpenPage: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  /* Barrier gestur (klik kanan / drag / Ctrl+S) — bukan keamanan sungguhan. */
  useEffect(() => {
    if (!ref.current) return;
    return protectImages(ref.current);
  }, []);

  /* Tunda permintaan sampai section mendekati layar — menjaga jalur kritis
     tetap bebas saat halaman baru dibuka. */
  const [dekat, setDekat] = useState(false);
  /* Modul `motion` (±87 KB gzip) punya gerbang sendiri yang lebih sempit.
   * Section ini cuma ~1,5 layar dari atas, jadi ambang 600 px menyalakannya
   * seketika di halaman awal — artinya motion tetap ikut critical path.
   * Di sini ambangnya 200 px: chunk baru diambil saat section benar-benar
   * mau terlihat, dan karena skeleton-nya bergeometri identik, pergantiannya
   * tidak terlihat sama sekali. */
  const [siapStack, setSiapStack] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || dekat) return;
    if (typeof IntersectionObserver !== 'function') { setDekat(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setDekat(true); io.disconnect(); } },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [dekat]);

  useEffect(() => {
    const el = ref.current;
    if (!el || siapStack) return;
    if (typeof IntersectionObserver !== 'function') { setSiapStack(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setSiapStack(true); io.disconnect(); } },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [siapStack]);

  const feed = useGalleryFeed(PREVIEW, dekat);
  const { loading, loadingMore, error, onPhotoError, retry } = feed;
  // Hook mengambil satu halaman (12 foto); di beranda cukup 5.
  const items = feed.items.slice(0, PREVIEW);

  const cards: CardItem[] = items.map((item) => ({
    id: item.id,
    image: item.thumb,
    alt: `Dokumentasi laporan ${item.tanggal}`,
    name: item.tanggal,
    avatar: AVATAR,
  }));

  const tampil = loading || items.length > 0;
  const kosong = !loading && !error && items.length === 0 && !loadingMore;

  return (
    <section id="galeri" className="scroll-mt-32 pt-10 sm:pt-12 reveal">
      <SectionLabel>Galeri Kegiatan</SectionLabel>

      <div className="text-center mb-7 px-2">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Rekam Jejak Layanan
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Dokumentasi kegiatan dan laporan terbaru di kawasan pedestrian Ponorogo, diurutkan berdasarkan tanggal.
        </p>
      </div>

      <div ref={ref}>
        {!loading && error && (
          <div className="text-center py-12 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900"
            >
              Coba lagi
            </button>
          </div>
        )}

        {kosong && (
          <div className="text-center py-12 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
            <Images className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum ada foto</p>
          </div>
        )}

        {tampil && (
          <>
            {/* Fallback-nya skeleton, bukan spinner, dan berasal dari modul yang
                sama dengan tumpukan aslinya (`GalleryStackSkeleton` dipakai
                oleh `ScrollableCardStack` juga) — jadi saat modul `motion`
                selesai diunduh, tidak ada pergeseran satu piksel pun. */}
            <Suspense fallback={<GalleryStackSkeleton count={PREVIEW} cardWidth={CARD_W} />}>
              {siapStack ? (
                <ScrollableCardStack
                  items={cards}
                  loading={loading}
                  slotCount={PREVIEW}
                  cardWidth={CARD_W}
                  onItemError={onPhotoError}
                  onSelect={onOpenPage}
                  label="Galeri kegiatan — tumpukan foto laporan"
                />
              ) : (
                <GalleryStackSkeleton count={PREVIEW} cardWidth={CARD_W} />
              )}
            </Suspense>

            {/* Tombol ke halaman galeri — ikut tampil sejak awal supaya tidak
                melompat ke bawah begitu data tiba. */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onOpenPage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                           text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900
                           border border-slate-300 dark:border-slate-700
                           hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
              >
                <Images className="w-4 h-4" />
                Lihat galeri
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}