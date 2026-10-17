import { X } from 'lucide-react';
import { useModalDialog } from '@/lib/useModalDialog';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProgramModal({ isOpen, onClose }: ProgramModalProps) {
  const { dialogRef, closeButtonRef } = useModalDialog(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <button type="button" tabIndex={-1} aria-label="Tutup dialog profil program" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div ref={dialogRef} className="relative flex max-h-[min(90dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="program-modal-title">

        <div className="relative h-36 shrink-0 overflow-hidden sm:h-44">
          <img src="/assets/pedestrian.webp" alt="Kawasan Pedestrian Ponorogo" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Tutup profil program" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <h2 id="program-modal-title" className="mb-1 text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">Profil Program SIPEDAS</h2>
          <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Sistem Pelaporan Digital Satgas Linmas
          </p>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              SIPEDAS adalah inovasi pelayanan publik yang memberikan pelindungan langsung bagi masyarakat dan wisatawan di kawasan pedestrian Kabupaten Ponorogo berupa layanan patroli pengamanan dan penertiban secara rutin oleh Satgas Linmas Pedestrian. Inovasi ini mencegah potensi gangguan trantibumlinmas seperti anak jalanan, gelandangan, pengemis, pengamen, ODGJ, hingga tindak kriminalitas.
            </p>
            <p>
              Aksi lapangan Satgas didukung sistem informasi digital yang mengintegrasikan kanal aduan masyarakat, pantauan CCTV real-time, peta kerawanan pedestrian, serta laporan aksi Satgas — berdasarkan Keputusan Bupati Ponorogo Nomor 100.3.3.2/ARH/84/405.14/2025.
            </p>

            {/* Tujuan */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Tujuan Inovasi</h3>
              <ul className="space-y-2.5">
                {[
                  'Memberikan pelindungan langsung bagi masyarakat dari gangguan trantibumlinmas dan tindak kriminal di kawasan pedestrian.',
                  'Menyediakan sarana pendukung operasional terpadu bagi Satgas Linmas Pedestrian.',
                  'Meningkatkan partisipasi masyarakat dalam menjaga ketertiban umum di kawasan pedestrian.',
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                    <span className="text-slate-600 dark:text-slate-400">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Manfaat */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Manfaat Inovasi</h3>
              <ul className="space-y-2.5">
                {[
                  'Masyarakat & wisatawan: rasa aman, nyaman, dan perlindungan responsif saat beraktivitas di kawasan pedestrian.',
                  'Satgas Linmas: kemudahan patroli dengan dukungan data CCTV, peta titik kerawanan, dan sistem pelaporan terintegrasi.',
                  'Satpol PP Ponorogo: transformasi pengawasan manual ke digital untuk monitoring dan evaluasi kinerja berbasis data lapangan.',
                ].map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                    <span className="text-slate-600 dark:text-slate-400">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-7">
          <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
