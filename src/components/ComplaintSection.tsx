'use client';

import { Send, Bot, ChevronRight, MessageCircle } from 'lucide-react';

interface ComplaintSectionProps {
  onOpenChatbot: () => void;
  onOpenAduan: () => void;
}

export default function ComplaintSection({ onOpenChatbot, onOpenAduan }: ComplaintSectionProps) {
  return (
    <section id="pengaduan" className="scroll-mt-32 pt-16 reveal">
      {/* Divider */}
      <div className="flex items-center gap-4 mb-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Layanan Publik</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Layanan Pengaduan & Informasi</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pilih cara yang paling mudah untuk Anda</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Form Aduan */}
          <button
            onClick={onOpenAduan}
            className="group relative overflow-hidden rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 sm:p-7 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
            <div className="flex sm:block items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center sm:mb-5 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                <Send className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 sm:block">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white sm:mb-2">Form Aduan</h3>
                <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Laporkan kejadian atau gangguan langsung via form. Sertakan foto dan lacak status tiket Anda.
                </p>
                <p className="sm:hidden text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  Laporkan kejadian & lacak tiket
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 group-hover:gap-2.5 transition-all mt-4">
              Buat Laporan <ChevronRight className="w-4 h-4" />
            </span>
          </button>

          {/* Chatbot */}
          <button
            onClick={onOpenChatbot}
            className="group relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 sm:p-7 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <div className="flex sm:block items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center sm:mb-5 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <Bot className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 sm:block">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white sm:mb-2">Chatbot SIPEDAS</h3>
                <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Tanya jawab, lapor kejadian, dan cek status tiket melalui asisten AI 24 jam.
                </p>
                <p className="sm:hidden text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  Asisten AI 24 jam · tanya & lapor
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:gap-2.5 transition-all mt-4">
              Buka Chatbot <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
