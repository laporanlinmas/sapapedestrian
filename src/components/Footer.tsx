import { useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { FacebookIcon, XIcon, InstagramIcon, WhatsAppIcon, TikTokIcon } from './BrandIcons';

const SOCIAL_LINKS = [
  { label: 'Facebook',   href: 'https://www.facebook.com/people/Satpol-PP-Kabupaten-Ponorogo/100067181276904/#', icon: <FacebookIcon />,  hoverBg: '#1877F2', hoverColor: '#fff' },
  { label: 'X / Twitter',href: 'https://x.com/SatpolppPonoro1',                                                  icon: <XIcon />,         hoverBg: '#000000', hoverColor: '#fff' },
  { label: 'Instagram',  href: 'https://instagram.com/satlinmas_ponorogo',                                        icon: <InstagramIcon />, hoverBg: '#E1306C', hoverColor: '#fff' },
  { label: 'WhatsApp',   href: 'https://wa.me/6282337017307',                                                     icon: <WhatsAppIcon />,  hoverBg: '#25D366', hoverColor: '#fff' },
  { label: 'TikTok',     href: 'https://www.tiktok.com/@satpol.pp.ponorogo',                                      icon: <TikTokIcon />,    hoverBg: '#010101', hoverColor: '#fff' },
];

const SOCIAL_BTN =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 ' +
  'bg-slate-100 text-slate-500 transition-colors duration-200 hover:-translate-y-0.5 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 md:h-9 md:w-9';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FOOTER
 * ═══════════════════════════════════════════════════════════════════════════
 *  Tata letaknya berbeda per ukuran layar, dan itu disengaja:
 *
 *  · ≥768 px (desktop) — dua kolom seperti biasa: brand di kiri, instansi di
 *    kanan, deretan ikon medsos tetap di bawah deskripsi brand.
 *
 *  · <768 px (mobile) — ikon medsos TIDAK lagi di bawah deskripsi brand,
 *    karena di layar sempit itu meluncur jauh ke atas dan terpisah dari
 *    informasi kontak yang paling dicari. Dia dipindah ke bawah baris
 *    "Buka 24 Jam", menyatu satu baris dengan tautan Satpol PP.
 *
 *  Baris yang dirender dua kali memang duplikat DOM, tapi hanya SATU yang
 *  tampil pada satu waktu (`md:hidden` / `hidden md:flex`), jadi tidak ada
 *  target focus ganda dan tidak ada duplikasi untuk pembaca layar.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default function Footer() {
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);

  const socialRow = (align: 'start' | 'between') => (
    <div
      className={`flex flex-nowrap items-center ${align === 'start' ? 'justify-start' : 'justify-between'} gap-1.5 md:gap-2.5`}
      aria-label="Media sosial SIPEDAS"
    >
      {SOCIAL_LINKS.map((s) => {
        const isHovered = hoveredSocial === s.label;
        return (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            onMouseEnter={() => setHoveredSocial(s.label)}
            onMouseLeave={() => setHoveredSocial(null)}
            style={{
              backgroundColor: isHovered ? s.hoverBg : '',
              color: isHovered ? s.hoverColor : '',
              borderColor: isHovered ? s.hoverBg : '',
            }}
            className={SOCIAL_BTN}
          >
            {s.icon}
          </a>
        );
      })}
    </div>
  );

  return (
    <footer className="bg-white dark:bg-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-10">

          {/* ── Brand ── */}
          <div className="md:col-span-6">
            <div className="mb-2 flex min-w-0 items-center gap-x-3 gap-y-2 sm:mb-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:h-11 sm:w-11">
                  <img src="/assets/linmas.webp" alt="Logo SIPEDAS" width={32} height={32} loading="lazy" decoding="async" className="object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-tight text-slate-900 dark:text-white sm:text-base">SIPEDAS</p>
                  <p className="text-[11px] font-semibold leading-tight text-blue-600 dark:text-blue-400 sm:text-xs">Sapa Pedestrian · Kab. Ponorogo</p>
                </div>
              </div>

            </div>

            <p className="mb-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:mb-3">
              Mewujudkan kawasan pejalan kaki yang aman, nyaman, dan tertib.
            </p>

            {/* Desktop: ikon medsos tetap di kolom brand. */}
            <div className="hidden md:block">{socialRow('start')}</div>
          </div>

          {/* ── Kontak ── */}
          <div className="md:col-span-6">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white sm:mb-4 sm:text-sm">
              Instansi
            </h4>
            <ul className="space-y-2 sm:space-y-4">
              <li className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 sm:gap-2.5 sm:text-xs">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-blue-500 sm:h-3.5 sm:w-3.5" />
                <div>
                  <p>Jl. Trunojoyo No.147, Kauman, Kecamatan Ponorogo, Kabupaten Ponorogo, Jawa Timur 63419</p>
                  <p className="mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3 shrink-0 text-blue-500 sm:h-3.5 sm:w-3.5" />
                    Buka 24 Jam
                  </p>
                </div>
              </li>
              <li>
                {/* Mobile: "Buka 24 Jam" sendiri di barisnya, lalu di bawahnya
                    satu baris berisi ikon medsos + Satpol PP. Desktop: satu
                    baris seperti semula (jam di kiri, Satpol PP di kanan). */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-3">
                  <div className="flex items-center gap-2 sm:gap-x-2.5">
                    {/* Mobile only — menyatu dengan Satpol PP dalam satu baris. */}
                    <div className="md:hidden">{socialRow('start')}</div>

                    <a
                      href="https://satpolpp.ponorogo.go.id"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex min-h-8 items-center gap-1.5 rounded-lg text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-300 sm:gap-2 sm:text-sm"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 sm:h-8 sm:w-8">
                        <img
                          src="/assets/satpol.webp"
                          alt="Satpol PP"
                          width={24}
                          height={24}
                          loading="lazy"
                          decoding="async"
                          className="object-contain"
                        />
                      </div>
                      <span className="whitespace-nowrap">
                        {/* Nama penuhnya dipangkas hanya di layar sempit,
                            supaya lima ikon medsos + tautan ini tetap MUAT
                            satu baris. ≥640 px baru tampil utuh. */}
                        <span className="sm:hidden">Satpol PP</span>
                        <span className="hidden sm:inline">Satpol PP Ponorogo</span>
                      </span>
                    </a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex flex-col items-start justify-between gap-1.5 border-t border-slate-300 pt-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:mt-6 sm:flex-row sm:items-center sm:gap-2 sm:pt-4 sm:text-xs">
          <span className="max-w-full">
            &copy; 2026 Pemerintah Kabupaten Ponorogo ·{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">Satgas Linmas Pedestrian</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="font-semibold">v4.4.0</span>
            <span aria-hidden="true" className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
            <span>
              Built by{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">Ahmad Basith</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}