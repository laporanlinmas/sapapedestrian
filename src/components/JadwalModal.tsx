import { useEffect } from 'react';
import { CalendarCheck, Shield, MessageCircle, AlertTriangle, X } from 'lucide-react';

interface JadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JADWAL = [
  {
    Icon: Shield,
    color: 'bg-blue-600',
    border: 'border-blue-100 dark:border-blue-900/30',
    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
    title: 'Aksi Satgas Linmas Pedestrian',
    desc: 'Setiap Jumat & Sabtu pukul 16.00–24.00 WIB. Patroli pengamanan dan penertiban kawasan pedestrian Kabupaten Ponorogo secara rutin dan terjadwal.',
  },
  {
    Icon: MessageCircle,
    color: 'bg-emerald-600',
    border: 'border-emerald-100 dark:border-emerald-900/30',
    bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    title: 'Kanal Aduan Masyarakat',
    desc: 'Layanan aduan aktif 24 jam melalui SIPEDAS. Setiap laporan yang masuk akan segera ditindaklanjuti oleh Satgas Linmas Pedestrian.',
  },
  {
    Icon: AlertTriangle,
    color: 'bg-amber-500',
    border: 'border-amber-100 dark:border-amber-900/30',
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    title: 'Aturan Kawasan Pedestrian',
    desc: 'Dilarang mengganggu ketertiban umum: anak jalanan, gelandangan, pengemis, pengamen, ODGJ, PKL liar, dan parkir sembarangan di kawasan pedestrian.',
  },
];

export default function JadwalModal({ isOpen, onClose }: JadwalModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">

        {/* Hero foto */}
        <div className="relative h-44 shrink-0 overflow-hidden">
          <img src="/assets/satlinmas.png" alt="Satgas Linmas Pedestrian" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 to-cyan-600/30 mix-blend-multiply" />
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating icon — outside overflow-hidden */}
        <div className="absolute top-[144px] left-6 w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-4 border-white dark:border-slate-900 flex items-center justify-center z-20">
          <CalendarCheck className="w-8 h-8 text-blue-600" />
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar px-6 pt-14 pb-2 flex-1">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Jadwal & Aturan Program</h3>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-5">Satgas Linmas Pedestrian Ponorogo</p>
          <div className="space-y-3">
            {JADWAL.map(j => (
              <div key={j.title} className={`flex items-start gap-4 p-4 rounded-2xl border-2 ${j.border} ${j.bg}`}>
                <div className={`w-11 h-11 ${j.color} text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  <j.Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{j.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{j.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
