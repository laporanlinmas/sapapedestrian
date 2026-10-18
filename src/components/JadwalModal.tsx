import { X } from 'lucide-react';
import { useModalDialog } from '@/lib/useModalDialog';

interface JadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JADWAL = [
  {
    border: 'border-l-blue-600',
    title: 'Aksi Satgas Linmas Pedestrian',
    desc: 'Setiap Jumat & Sabtu pukul 16.00–24.00 WIB. Patroli pengamanan dan penertiban kawasan pedestrian Kabupaten Ponorogo secara rutin dan terjadwal.',
  },
  {
    border: 'border-l-emerald-600',
    title: 'Kanal Aduan Masyarakat',
    desc: 'Layanan aduan aktif 24 jam melalui SIPEDAS. Setiap laporan yang masuk akan segera ditindaklanjuti oleh Satgas Linmas Pedestrian.',
  },
  {
    border: 'border-l-amber-500',
    title: 'Aturan Kawasan Pedestrian',
    desc: 'Dilarang mengganggu ketertiban umum: anak jalanan, gelandangan, pengemis, pengamen, ODGJ, PKL liar, dan parkir sembarangan di kawasan pedestrian.',
  },
];

export default function JadwalModal({ isOpen, onClose }: JadwalModalProps) {
  const { dialogRef, closeButtonRef } = useModalDialog(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <button type="button" tabIndex={-1} aria-label="Tutup dialog jadwal dan aturan" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div ref={dialogRef} className="animate-fade-in-scale motion-reduce:animate-none relative flex max-h-[min(90dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">

        <div className="relative h-36 shrink-0 overflow-hidden sm:h-44">
          <img src="/assets/satlinmas.webp" alt="Satgas Linmas Pedestrian" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Tutup jadwal dan aturan" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <h2 id="schedule-modal-title" className="mb-1 text-xl font-extrabold text-slate-900 dark:text-white">Jadwal & Aturan Program</h2>
          <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Satgas Linmas Pedestrian Ponorogo</p>
          <div className="space-y-2.5">
            {JADWAL.map(j => (
              <div key={j.title} className={`rounded-r-lg border border-slate-200 border-l-[3px] bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 ${j.border}`}>
                <div>
                  <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">{j.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{j.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
          <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
