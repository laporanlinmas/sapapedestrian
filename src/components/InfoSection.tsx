import SectionLabel from './SectionLabel';

interface InfoSectionProps {
  onOpenModal: (modalId: string) => void;
}

export default function InfoSection({ onOpenModal }: InfoSectionProps) {
  return (
    <section id="informasi" className="scroll-mt-28 pt-10 sm:pt-12 reveal">
      <SectionLabel className="mb-6 sm:mb-7">Informasi Program</SectionLabel>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-7 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Informasi Program</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 text-base max-w-xl mx-auto">
            Kenali lebih dekat tata ruang pejalan kaki dan jadwal operasional kawasan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

          {/* ── Detail Program ── */}
          <button
            onClick={() => onOpenModal('programModal')}
            className="group relative h-64 overflow-hidden rounded-2xl bg-slate-900 text-left shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-72 md:h-80"
          >
            <img
              loading="lazy"
              decoding="async"
              src="/assets/pedestrian.webp"
              alt="Kawasan Pedestrian Ponorogo"
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7">
              <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">Profil Program SIPEDAS</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-200">Inovasi layanan publik Satgas Linmas Pedestrian Kabupaten Ponorogo.</p>
              <span className="text-sm font-bold text-white underline decoration-white/50 underline-offset-4 group-hover:decoration-white">
                Baca selengkapnya
              </span>
            </div>
          </button>

          {/* ── Jadwal & Aturan ── */}
          <button
            onClick={() => onOpenModal('jadwalModal')}
            className="group relative h-64 overflow-hidden rounded-2xl bg-slate-900 text-left shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-72 md:h-80"
          >
            <img
              loading="lazy"
              decoding="async"
              src="/assets/satlinmas.webp"
              alt="Satgas Linmas Pedestrian"
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7">
              <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">Jadwal & Aturan Program</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-200">Aksi Satgas setiap Jumat–Sabtu 16.00–24.00 WIB & aturan kawasan.</p>
              <span className="text-sm font-bold text-white underline decoration-white/50 underline-offset-4 group-hover:decoration-white">
                Lihat jadwal
              </span>
            </div>
          </button>

        </div>
      </div>
    </section>
  );
}
