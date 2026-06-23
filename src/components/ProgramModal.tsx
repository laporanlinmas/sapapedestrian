import { useEffect } from 'react';
import { Shield, MapPin, CheckCircle2, X } from 'lucide-react';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProgramModal({ isOpen, onClose }: ProgramModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">

        {/* Hero foto */}
        <div className="relative h-44 shrink-0 overflow-hidden">
          <img src="/assets/pedestrian.png" alt="Kawasan Pedestrian Ponorogo" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 to-indigo-600/30 mix-blend-multiply" />
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating icon — outside overflow-hidden */}
        <div className="absolute top-[144px] left-6 w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-4 border-white dark:border-slate-900 flex items-center justify-center z-20">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar px-6 pt-14 pb-6 flex-1">
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Profil Program SIPEDAS</h3>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-4">
            Sistem Informasi Pedestrian & Aksi Satgas Linmas
          </p>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              SIPEDAS adalah inovasi pelayanan publik yang memberikan pelindungan langsung bagi masyarakat dan wisatawan di kawasan pedestrian Kabupaten Ponorogo berupa layanan patroli pengamanan dan penertiban secara rutin oleh Satgas Linmas Pedestrian. Inovasi ini mencegah potensi gangguan trantibumlinmas seperti anak jalanan, gelandangan, pengemis, pengamen, ODGJ, hingga tindak kriminalitas.
            </p>
            <p>
              Aksi lapangan Satgas didukung sistem informasi digital yang mengintegrasikan kanal aduan masyarakat, pantauan CCTV real-time, peta kerawanan pedestrian, serta laporan aksi Satgas — berdasarkan Keputusan Bupati Ponorogo Nomor 100.3.3.2/ARH/84/405.14/2025.
            </p>

            {/* Tujuan */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> Tujuan Inovasi
              </h4>
              <ul className="space-y-2.5">
                {[
                  'Memberikan pelindungan langsung bagi masyarakat dari gangguan trantibumlinmas dan tindak kriminal di kawasan pedestrian.',
                  'Menyediakan sarana pendukung operasional terpadu bagi Satgas Linmas Pedestrian.',
                  'Meningkatkan partisipasi masyarakat dalam menjaga ketertiban umum di kawasan pedestrian.',
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-400">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Manfaat */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" /> Manfaat Inovasi
              </h4>
              <ul className="space-y-2.5">
                {[
                  'Masyarakat & wisatawan: rasa aman, nyaman, dan perlindungan responsif saat beraktivitas di kawasan pedestrian.',
                  'Satgas Linmas: kemudahan patroli dengan dukungan data CCTV, peta titik kerawanan, dan sistem pelaporan terintegrasi.',
                  'Satpol PP Ponorogo: transformasi pengawasan manual ke digital untuk monitoring dan evaluasi kinerja berbasis data lapangan.',
                ].map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-400">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-bold transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
