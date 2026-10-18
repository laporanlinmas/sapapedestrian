'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Apa itu Sapa Pedestrian?',
    a: 'Kanal Sapa Pedestrian adalah Sistem Layanan publik Kabupaten Ponorogo yang dapat dipakai masyarakat untuk memantau CCTV, membuka peta kerawanan, mengirim aduan terkait kejadian di wilayah pedestrian.',
  },
  {
    q: 'Bagaimana cara mengirim aduan atau laporan?',
    a: 'Klik menu "Form Aduan", isi nama, kategori, lokasi, dan deskripsi kejadian, lalu tambahkan foto bila ada. Setelah dikirim Anda menerima nomor tiket yang dapat dilacak kembali melalui tab "Lacak Tiket".',
  },
  {
    q: 'Berapa lama laporan saya ditindaklanjuti?',
    a: 'Laporan langsung masuk ke dashboard petugas dan berstatus "Baru". Petugas akan menindaklanjuti, dan Anda dapat memantau perkembangannya memakai nomor tiket.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Nama pada form aduan hanya dipakai untuk keperluan tindak lanjut laporan dan tidak dibagikan kepada pihak lain.',
  },
  {
    q: 'Bagaimana cara melihat CCTV secara real-time?',
    a: 'Buka kartu "SIPEDAS VIEW". Daftar kamera dan titik WiFi gratis di kawasan pedestrian akan tampil lengkap dengan peta lokasi.',
  },
  {
    q: 'Di mana saya bisa melihat titik rawan?',
    a: 'Buka kartu "Peta Kerawanan" untuk melihat titik rawan yang terpetakan di kawasan pedestrian.',
  },
  {
    q: 'Apakah tersedia WiFi gratis di kawasan pedestrian?',
    a: 'Ya. Tersedia titik WiFi gratis yang ditandai pada SIPEDAS VIEW. Gunakan jaringan tersebut saat berada di area pedestrian agar browsingan lebih cepat.',
  },
  {
    q: 'Jam berapa petugas melayani laporan?',
    a: 'Layanan tersedia 24 jam. Patroli rutin dilakukan pada hari Jumat dan Sabtu pukul 16.00-24.00 WIB.',
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-32 pt-10 sm:pt-12 reveal">
      <SectionLabel>FAQ</SectionLabel>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-7 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Informasi yang mungkin Anda cari sebelum menggunakan layanan
          </p>
        </div>

        <div className="space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const questionId = `faq-question-${i}`;
            const answerId = `faq-answer-${i}`;
            return (
              <div
                key={item.q}
                className={`rounded-xl border bg-white shadow-sm dark:bg-slate-900 transition-colors duration-200 ${
                  isOpen
                    ? 'border-blue-300 dark:border-blue-700'
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <h3>
                  <button
                    id={questionId}
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="group flex min-h-14 w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5"
                  >
                    <span className={`w-7 shrink-0 text-[10px] font-bold tabular-nums ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={questionId}
                  aria-hidden={!isOpen}
                  className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-4 pb-4 pl-14 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:px-5 sm:pl-16">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}