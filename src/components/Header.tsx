'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MonitorPlay, Megaphone, Info, Star, Play, ArrowLeft, Sun, Moon, X, Menu, HelpCircle, Camera } from 'lucide-react';

interface HeaderProps {
  isSurveyPage?: boolean;
  onBack?: () => void;
}

export default function Header({ isSurveyPage = false, onBack }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark]         = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const mobileNavigationRef = useRef<HTMLDivElement>(null);
  const themeTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => {
    if (themeTransitionTimeoutRef.current !== null) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (mobileNavigationRef.current) mobileNavigationRef.current.inert = !menuOpen;
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    const mode = next ? 'dark' : 'light';
    const root = document.documentElement;
    setDark(next);
    root.classList.add('theme-transitioning');
    root.classList.toggle('dark', next);
    if (themeTransitionTimeoutRef.current !== null) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
      themeTransitionTimeoutRef.current = null;
    }, 220);
    try {
      localStorage.setItem('theme', mode);
      localStorage.setItem('sipedas_theme', mode);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: mode } }));
    } catch {
      // Ignore
    }
  }, [dark]);

  const goto = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const navItems = [
    { id: 'pemantauan', label: 'CCTV & Peta', Icon: MonitorPlay, color: 'text-blue-500' },
    { id: 'pengaduan', label: 'Aduan',      Icon: Megaphone,   color: 'text-orange-500' },
    { id: 'galeri',    label: 'Galeri',     Icon: Camera,      color: 'text-emerald-500' },
    { id: 'informasi', label: 'Informasi',  Icon: Info,        color: 'text-amber-500' },
    { id: 'video',     label: 'Profil',     Icon: Play,        color: 'text-pink-500' },
    { id: 'rating',    label: 'Rating',     Icon: Star,        color: 'text-amber-500' },
    { id: 'faq',       label: 'FAQ',        Icon: HelpCircle,  color: 'text-violet-500' },
  ];

  return (
    <>
      {/* Nav bar */}
      <nav aria-label="Navigasi utama" className={`fixed w-full top-0 z-40 transition-[padding] duration-200 ${scrolled ? 'pt-1.5' : 'pt-2.5'} px-4 sm:px-6`}>
        <div className="max-w-7xl mx-auto">

          {/* Pill */}
          <div className={`
            flex items-center justify-between h-14 px-4 sm:px-5 rounded-2xl
            bg-gradient-to-r from-blue-700/78 via-indigo-700/76 to-purple-700/78
            dark:from-slate-800/78 dark:via-slate-800/78 dark:to-slate-900/82
            border border-white/15 dark:border-slate-700/40
            backdrop-blur-xl
            transition-[box-shadow,background-color] duration-300
            ${scrolled ? 'shadow-lg shadow-slate-950/20' : 'shadow-sm shadow-slate-950/10'}
          `}>

            {/* Logo & Judul */}
            <button
              onClick={isSurveyPage ? onBack : () => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 sm:gap-3 group"
              aria-label="Ke atas"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden group-hover:bg-white/20 transition-colors shrink-0">
                <img src="/assets/icon-48.png" alt="Icon SIPEDAS" width={28} height={28} loading="eager" decoding="async" className="object-contain" />
              </div>
              
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="text-[11px] sm:text-xs md:text-sm font-black text-white dark:text-amber-300 tracking-[0.15em] sm:tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-300">
                  SIPEDAS
                </span>
                <span className="w-px h-3 sm:h-4 bg-white/70 dark:bg-slate-600 rounded-full transition-colors duration-300" />
                <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-white dark:text-blue-400 tracking-wide uppercase whitespace-nowrap transition-colors duration-300 drop-shadow-sm dark:drop-shadow-none">
                  SAPA PEDESTRIAN
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <div className="hidden xl:flex items-center gap-0.5">
              {isSurveyPage ? (
                <button onClick={onBack}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </button>
              ) : (
                navItems.map(item => (
                  <button key={item.id} onClick={() => goto(item.id)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold text-white/85 hover:text-white hover:bg-white/15 transition-colors">
                    {item.label}
                  </button>
                ))
              )}
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button onClick={toggleTheme}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Toggle dark mode">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile controls */}
            <div className="xl:hidden flex items-center gap-1.5">
              <button onClick={toggleTheme}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Toggle dark mode">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {isSurveyPage ? (
                <button onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white bg-white/10 hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setMenuOpen(v => !v)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-navigation">
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile dropdown */}
          {!isSurveyPage && (
            <div
              className={`
                xl:hidden absolute left-4 right-4 z-30 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain
                transition-all duration-300 ease-out origin-top
                ${menuOpen
                  ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }
              `}
              ref={mobileNavigationRef}
              id="mobile-navigation"
              aria-hidden={!menuOpen}
              style={{ top: scrolled ? '62px' : '66px' }}
            >
              {/* Dropdown tanpa box-shadow: pemisahan cukup lewat border + latar terang,
                  sehingga navbar benar-benar bebas efek blur/glow yang berat. */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl px-3 py-3 border border-slate-300 dark:border-slate-700 space-y-1">
                {navItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => goto(item.id)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    style={{ transitionDelay: menuOpen ? `${i * 35}ms` : '0ms' }}
                  >
                    <item.Icon className={`w-5 h-5 ${item.color}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Backdrop klik-luar untuk tutup menu mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 xl:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
