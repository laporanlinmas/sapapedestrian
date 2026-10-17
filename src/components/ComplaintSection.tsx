'use client';

import { Send, Bot, ChevronRight } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';

interface ComplaintSectionProps {
  onOpenChatbot: () => void;
  onOpenAduan: () => void;
}

/**
 * Kartu layanan pengaduan.
 *
 * Sederhana & tegas: tanpa garis warna di atas dan tanpa latar bergradasi,
 * hanya border yang jelas + ikon + judul + deskripsi. Pembatas antar kartu
 * diberikan oleh `border-slate-300` (terang) / `dark:border-slate-700`.
 */
export default function ComplaintSection({ onOpenChatbot, onOpenAduan }: ComplaintSectionProps) {
  const cards = [
    {
      onOpen: onOpenAduan,
      title: 'Form Aduan',
      Icon: Send,
      iconCls: 'bg-orange-500',
      descDesktop: 'Laporkan kejadian atau gangguan langsung. Sertakan foto bukti dan lacak status tiket Anda.',
      descMobile: 'Laporkan kejadian & lacak tiket',
      cta: 'Buat Laporan',
      ctaCls: 'text-orange-700 dark:text-orange-400',
      surface: 'bg-white dark:bg-slate-900',
    },
    {
      onOpen: onOpenChatbot,
      title: 'Chatbot SIPEDAS',
      Icon: Bot,
      /* Biru, bukan hijau. Hijau dipakai untuk "Form Aduan" dan sudah jadi
        warna aksi di beberapa tempat, sehingga kartu chatbot hijau terlihat
        seperti satu sistem warna yang sama padahal bukan. Biru juga warna
        tombol mengambang chatbot, jadi konsisten. */
      iconCls: 'bg-blue-600',
      descDesktop: 'Tanya jawab, lapor kejadian, dan cek status tiket melalui asisten AI yang siap 24 jam.',
      descMobile: 'Asisten AI 24 jam · tanya & lapor',
      cta: 'Buka Chatbot',
      ctaCls: 'text-blue-700 dark:text-blue-400',
      surface: 'bg-white dark:bg-slate-900',
    },
  ];

  return (
    <section id="pengaduan" className="scroll-mt-32 pt-10 sm:pt-12 reveal">
      <SectionLabel>Layanan Publik</SectionLabel>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-9">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            Layanan Pengaduan & Informasi
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pilih cara yang paling mudah untuk Anda
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map(({ onOpen, title, Icon, iconCls, descDesktop, descMobile, cta, ctaCls, surface }) => (
            <button
              key={title}
              type="button"
              onClick={onOpen}
              className={`group relative flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700
                          ${surface} p-5 sm:p-6 text-left
                          hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-lg
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                          focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-950
                          transition-all duration-200`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl ${iconCls}
                              flex items-center justify-center text-white
                              transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5">
                    {descDesktop}
                  </p>
                  <p className="sm:hidden text-xs text-slate-600 dark:text-slate-400 leading-snug mt-1">
                    {descMobile}
                  </p>
                </div>
              </div>

              <span
                className={`mt-4 inline-flex items-center gap-1 text-sm font-bold ${ctaCls}
                            transition-transform duration-200 group-hover:translate-x-0.5`}
              >
                {cta}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}