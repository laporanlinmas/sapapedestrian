import PanoramaBackdrop from '@/components/PanoramaBackdrop';
import PedestrianHero from '@/components/PedestrianHero';
import { MonitorPlay, MessageCircle, Images, Info } from 'lucide-react';
import './hero-scene.css';

/**
 * Hero — lapisan paling depan dari sebuah "panggung" berlapis:
 *
 *   panorama 360°  →  tirai tema  →  ilustrasi petugas  →  teks  →  tutup bawah
 *
 * Semua lapisan memakai warna solid bertingkat. Tidak ada `blur()` di mana pun:
 * panorama adalah foto utama dan leganya harus utuh, bukan ditempel glassmorphism.
 */
export default function Hero() {
  const actionCards = [
    { 
      id: '#pemantauan',
      Icon: MonitorPlay,   
      title: 'CCTV & Peta',
      mobileTitle: 'CCTV/Peta',
      desc: 'Pantauan dan titik rawan',
      color: 'text-blue-600 dark:text-blue-400',       
      bg: 'bg-blue-50/70 dark:bg-blue-900/20',
      border: 'border-blue-200/60 dark:border-blue-800/50',
    },
    { 
      id: '#pengaduan', 
      Icon: MessageCircle, 
      title: 'Aduan & Laporan', 
      mobileTitle: 'Aduan',
      desc: 'Respon cepat',
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-50/70 dark:bg-emerald-900/20',
      border: 'border-emerald-200/60 dark:border-emerald-800/50',
    },
    {
      id: '#galeri',
      Icon: Images,
      title: 'Galeri',
      mobileTitle: 'Galeri',
      desc: 'Dokumentasi kegiatan',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/70 dark:bg-teal-900/20',
      border: 'border-teal-200/60 dark:border-teal-800/50',
    },
    { 
      id: '#informasi', 
      Icon: Info,          
      title: 'Informasi',       
      mobileTitle: 'Info',
      desc: 'Pusat data terpadu',
      color: 'text-amber-600 dark:text-amber-400',     
      bg: 'bg-amber-50/70 dark:bg-amber-900/20',
      border: 'border-amber-200/60 dark:border-amber-800/50',
    },
  ];

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden font-sans bg-slate-50 dark:bg-slate-950">

      {/* ── 0 · Panorama 360° — lapisan paling belakang ──────────────────
          Berputar otomatis (2°/detik ≈ 3 menit satu putaran penuh).
          Kanvasnya digambar pada resolusi sumber, bukan DPR mentah, jadi
          fotonya tetap tajam di layar retina maupun 4K. Murni dekoratif:
          pointer-events mati agar tidak pernah menahan scroll. */}
      <div className="absolute inset-0 z-0">
        <PanoramaBackdrop
          className="h-full w-full"
          startYaw={252}
          degreesPerSecond={2}
          baseFov={100}
          /* Horizon (garis langit ↔ aspal) duduk sedikit di bawah tengah,
             menghasilkan komposisi "langit di atas, jalan di bawah". */
          horizonRatio={0.54}
        />
      </div>

      {/* ── 1 · Tirai tema ────────────────────────────────────────────────
          Menahan kontras teks di atas foto. Tebal di sisi teks, transparan
          di sisi foto — jadi panorama tetap terlihat utuh di kanan.
          `hero-dither` memecah banding 8-bit supaya ramp-nya benar-benar
          mulus (lihat hero-scene.css). */}
      <div className="hero-scrim hero-dither" aria-hidden="true" />

      {/* ── 2 · Konten utama ──────────────────────────────────────────────
          Di mobile ber	flex column: teks mengisi ruang atas, ilustrasi
          mengisi ruang bawah (lihat blok ilustrasi di bawah). `content-center`
          menjaga teks tetap duduk di tengah ruang yang tersisa — tanpa itu teks
          nempel ke atas dan menyisakan ruang mati besar di antara teks dan petugas. */}
      <div className="hero-content mx-auto w-full max-w-7xl flex-1 px-4 pb-2 pt-[4.75rem] sm:px-6 sm:pt-24 lg:px-8 lg:pb-24 lg:pt-32">
        {/* `flex-1`, bukan `h-full`: `.hero-content` sekarang flex column (lihat
            hero-scene.css), jadi grid ini diregangkan sebagai flex item.
            `height: 100%` tidak akan resolve di sana — tinggi `.hero-content`
            datang dari flex layout, bukan dari properti `height`. */}
        <div className="grid flex-1 grid-cols-1 content-center items-center lg:grid-cols-12">
            {/* `col-span-6` menjaga lebar teks; ilustrasi desktop boleh
              sedikit masuk ke belakang teks karena berada di layer bawah. */}
          <div className="flex flex-col justify-center text-center lg:col-span-6 lg:text-left">
            
            {/* Teks Identitas Sistem */}
            <div className="mx-auto mb-5 flex w-max max-w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:mb-7 lg:mx-0">
              <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-center text-[9px] font-black uppercase leading-snug tracking-[0.1em] text-transparent sm:text-xs sm:tracking-[0.15em] md:text-[13px]">
                Sistem Pelaporan Digital Satgas Linmas
              </span>
            </div>

            {/* Tipografi Utama Berjenjang */}
            <h1 className="mb-6 flex flex-col gap-1 sm:mb-8 sm:gap-2">
              {/* Sapa Pedestrian — satu baris.
                  Ujung gradasi di tema terang memakai sky-600, bukan
                  cyan-500: cyan-500 nyaris seterang langit di belakangnya,
                  jadi huruf "rian" tenggelam. Tema gelap tetap cyan-300. */}
              <span className="pb-1 text-[2.25rem] font-extrabold leading-[0.98] text-slate-900 dark:text-white sm:pb-2 sm:text-5xl md:text-6xl lg:text-[5rem] xl:text-[6rem]">
                Sapa <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-300">Pedestrian</span>
              </span>
              
              {/* Teks Bawah (Menengah) */}
              <span className="mt-1 text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-300 sm:mt-2 sm:text-4xl lg:text-5xl">
                Ponorogo
              </span>
            </h1>

            {/* Deskripsi. `text-balance` membagi baris merata supaya tidak ada
                satu kata yatim di baris sendiri — di HP paragraf ini
                membungkus 5 baris dan tanpa itu selalu menyisakan
                "masyarakat." sendirian. */}
            <p className="mx-auto mb-6 max-w-2xl text-balance text-sm leading-6 text-slate-600 dark:text-slate-200 sm:mb-7 sm:text-base sm:leading-7 lg:mx-0 lg:text-lg">
              Platform komprehensif untuk pengawasan ruang publik. Dilengkapi dengan{' '}
              <strong className="font-semibold text-blue-600 dark:text-blue-400">CCTV real-time</strong>,{' '}
              analisis <strong className="font-semibold text-indigo-600 dark:text-indigo-400">zona kerawanan</strong>, 
              serta layanan respons cepat masyarakat.
            </p>

            {/* Kartu Navigasi / Aksi */}
            <div className="relative z-30 mx-auto grid w-full max-w-3xl grid-cols-4 gap-1.5 sm:gap-2 lg:mx-0">
              {actionCards.map((card) => (
                <a
                  key={card.id}
                  href={card.id}
                  onClick={(e) => { e.preventDefault(); scrollTo(card.id); }}
                  className="group flex h-12 min-w-0 items-center justify-start gap-1 rounded-xl border border-slate-300 bg-white px-1.5 py-2 text-left
                             hover:border-slate-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600
                             transition-colors duration-200 sm:h-auto sm:gap-2 sm:rounded-full sm:px-3
                             lg:gap-1 lg:px-2"
                >
                  <div className={`flex-shrink-0 rounded-full p-0.5 sm:p-1.5 lg:p-1 ${card.bg}`}>
                    <card.Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${card.color}`} />
                  </div>
                  {/* "Aduan & Laporan" di 12 px = 98 px persis. Empat kartu di
                      kolom `lg:col-span-6` lebarnya 146 px, dikurangi padding
                      2×8 + gap 4 + kotak ikon 22 = 104 px ruang teks — pas 6 px
                      di atas kebutuhan. Padding/gap dikecilkan di `lg` supaya
                      label tidak pernah jadi dua baris.

                      Rentang label (lihat `md`/`lg`/`xl` di bawah): penuh di
                      768–1023 dan ≥1280, pendek di bawah 768 dan 1024–1279.
                      Di 1024–1279 kolom teks cuma 480–608 px, dan di bawah
                      768 empat kartu tidak cukup lebar untuk label penuh. */}
                  <span className="min-w-0 flex-1 text-left text-[8px] font-semibold leading-tight text-slate-800 dark:text-white sm:text-xs">
                    <span className="inline md:hidden lg:inline xl:hidden">{card.mobileTitle}</span>
                    <span className="hidden md:inline lg:hidden xl:inline">{card.title}</span>
                  </span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── 3 · Ilustrasi petugas ──────────────────────────────────────────
          Dua petugas SATGAS melambaikan tangan — satu file WebP animasi
          (alpha transparan) yang diputar native oleh browser: tanpa runtime
          Lottie, tanpa video, tanpa JavaScript per frame.

          Sekarang full opacity di semua ukuran layar — sebelumnya 0,40 di
          mobile/tablet dan 0,30 di desktop, sehingga berbaur dengan latar.
          Sekarang ia berdiri sendiri: di bawah teks (mobile/tablet) atau di
          kanan teks (desktop), selalu utuh, selalu terbaca. */}
      <div className="hero-figure">
        {/* Jarak visual antara ilustrasi dan foto di belakangnya. */}
        <div className="hero-figure__scrim hero-dither" aria-hidden="true" />
        <PedestrianHero className="hero-figure__art" />
      </div>

      {/* ── 4 · Tutup bawah ───────────────────────────────────────────────
          Memudar kaki ilustrasi + aspal panorama ke warna halaman, supaya
          hero menyatu dengan section berikutnya tanpa garis potong. */}
      <div className="hero-fade hero-dither" aria-hidden="true" />
    </header>
  );
}