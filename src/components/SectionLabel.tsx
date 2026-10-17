import type { ReactElement, ReactNode } from 'react';

/**
 * Label seksi — satu gaya untuk seluruh halaman.
 *
 * Semula tiap seksi punya pembatas sendiri-sendiri: garis gradien panjang di
 * kiri dan kanan, pil berisi ikon, lalu judul. Pola itu diulang tujuh kali,
 * dan pengulangan itulah yang bikin halaman terbaca seperti template generik,
 * bukan produk yang benar-benar dirancang.
 *
 * Label kecil menjadi penanda kelompok, sementara judul dan keterangan utama
 * tiap seksi tetap memegang hierarki konten.
 *
 * Menghemat sekalian: tujuh ikon lucide (Send, Camera, HelpCircle, Building2,
 * MonitorPlay, Star, …) tidak lagi ikut masuk ke bundle halaman ini.
 */

export interface SectionLabelProps {
  children: ReactNode;
  /** Kelas tambahan pada pembungkus (mis. untuk mengatur jarak bawah). */
  className?: string;
}

export default function SectionLabel({ children, className = '' }: SectionLabelProps): ReactElement {
  return (
    <h2
      className={`mb-7 flex items-center justify-center gap-2.5 text-center sm:mb-8 sm:gap-3 ${className}`}
    >
      <span aria-hidden="true" className="h-px w-full max-w-12 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700 sm:max-w-16" />
      <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50/80 px-3.5 py-1.5
                       text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700
                       dark:bg-blue-950/40 dark:text-blue-300 sm:text-[11px]">
        {children}
      </span>
      <span aria-hidden="true" className="h-px w-full max-w-12 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700 sm:max-w-16" />
    </h2>
  );
}