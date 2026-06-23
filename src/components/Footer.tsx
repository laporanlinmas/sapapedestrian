import React, { useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { FacebookIcon, XIcon, InstagramIcon, WhatsAppIcon, TikTokIcon } from './BrandIcons';

const SOCIAL_LINKS = [
  { label: 'Facebook',   href: 'https://www.facebook.com/people/Satpol-PP-Kabupaten-Ponorogo/100067181276904/#', icon: <FacebookIcon />,  hoverBg: '#1877F2', hoverColor: '#fff' },
  { label: 'X / Twitter',href: 'https://x.com/SatpolppPonoro1',                                                  icon: <XIcon />,         hoverBg: '#000000', hoverColor: '#fff' },
  { label: 'Instagram',  href: 'https://instagram.com/satlinmas_ponorogo',                                        icon: <InstagramIcon />, hoverBg: '#E1306C', hoverColor: '#fff' },
  { label: 'WhatsApp',   href: 'https://wa.me/6282337017307',                                                     icon: <WhatsAppIcon />,  hoverBg: '#25D366', hoverColor: '#fff' },
  { label: 'TikTok',     href: 'https://www.tiktok.com/@satpol.pp.ponorogo',                                      icon: <TikTokIcon />,    hoverBg: '#010101', hoverColor: '#fff' },
];

const QUICK_LINKS = [
  { href: '#cctv',      label: 'Pantauan CCTV' },
  { href: '#peta',      label: 'Peta Kerawanan' },
  { href: '#pengaduan', label: 'Buat Laporan' },
  { href: '#informasi', label: 'Detail Program' },
];

export default function Footer() {
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  return (
    <footer className="bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Accent bottom */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-yellow-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* ── Brand ── */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <picture><source srcSet="/assets/linmas.svg" type="image/svg+xml" /><img src="/assets/icon-512.png" alt="SIPEDAS" width={36} height={36} className="object-contain" /></picture>
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">SIPEDAS</p>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sapa Pedestrian · Kab. Ponorogo</p>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 max-w-sm">
              Mewujudkan kawasan pejalan kaki yang aman, nyaman, dan tertib. Satlinmas Pedestrian siap melayani 24 jam.
            </p>

            {/* Sosmed */}
            <div className="flex gap-2.5">
              {SOCIAL_LINKS.map(s => {
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
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {s.icon}
                  </a>
                );
              })}
            </div>
          </div>

          {/* ── Kontak ── */}
          <div className="md:col-span-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
              Instansi
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                Jl. Trunojoyo No.147, Kauman, Kecamatan Ponorogo, Kabupaten Ponorogo, Jawa Timur 63419
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                Buka 24 Jam
              </li>

              {/* Website resmi */}
              <li className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <a
                  href="https://satpolpp.ponorogo.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 p-1">
                    <img src="/assets/satpol.svg" alt="Satpol PP" width={28} height={28} className="object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 group-hover:underline">
                      Satpol PP Ponorogo
                    </p>
                    <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70">
                      satpolpp.ponorogo.go.id
                    </p>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-400">
          <span>
            &copy; 2026 Pemerintah Kabupaten Ponorogo ·{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-300">Satlinmas Pedestrian</span>
          </span>
          <span className="font-semibold">v4.4.0</span>
        </div>
      </div>
    </footer>
  );
}
