import { Building2, Info, Map, CalendarCheck, ArrowRight } from 'lucide-react';

interface InfoSectionProps {
  onOpenModal: (modalId: string) => void;
}

export default function InfoSection({ onOpenModal }: InfoSectionProps) {
  return (
    <section id="informasi" className="scroll-mt-28 pt-16 reveal">
      {/* ── Decorative divider ── */}
      <div className="flex items-center gap-4 mb-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Building2 className="w-3.5 h-3.5 text-pink-500" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Informasi Program</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white mb-4 shadow-lg shadow-pink-500/30">
            <Info className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Informasi Program</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 text-base max-w-xl mx-auto">
            Kenali lebih dekat tata ruang pejalan kaki dan jadwal operasional kawasan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Detail Program ── */}
          <button
            onClick={() => onOpenModal('programModal')}
            className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl group cursor-pointer text-left h-72 md:h-80"
          >
            <img
              src="/assets/pedestrian.png"
              alt="Kawasan Pedestrian Ponorogo"
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-pink-500/40">
                <Map className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Profil Program SIPEDAS</h3>
              <p className="text-slate-300 text-sm mb-4">Inovasi layanan publik Satgas Linmas Pedestrian Kabupaten Ponorogo.</p>
              <span className="inline-flex items-center gap-2 text-pink-400 text-sm font-bold group-hover:text-pink-300 transition-colors">
                Baca Selengkapnya
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </button>

          {/* ── Jadwal & Aturan ── */}
          <button
            onClick={() => onOpenModal('jadwalModal')}
            className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl group cursor-pointer text-left h-72 md:h-80"
          >
            <img
              src="/assets/satlinmas.png"
              alt="Satlinmas Pedestrian"
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/40">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Jadwal & Aturan Program</h3>
              <p className="text-slate-300 text-sm mb-4">Aksi Satgas setiap Jumat–Sabtu 16.00–24.00 WIB & aturan kawasan.</p>
              <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-bold group-hover:text-blue-300 transition-colors">
                Lihat Jadwal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </button>

        </div>
      </div>
    </section>
  );
}
