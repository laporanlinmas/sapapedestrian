'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, RotateCw, ExternalLink, TriangleAlert } from 'lucide-react';
import { useCurrentTheme } from '../lib/useCurrentTheme';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  WEB VIEW — halaman penuh untuk layanan eksternal (/cctv, /mymaps)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Berbeda dari modal: occupies 100% layar, punya topbar datar (bukan pill),
 *  dan menampilkan spinner di tengah selagi konten dimuat.
 *
 *  Ringan: tanpa portal, tanpa pushState (diurus router halaman), tanpa
 *  filter blur, tanpa shadow glow — hanya warna solid + border.
 */

interface WebViewScreenProps {
  src: string;
  title: string;
  /** Label tombol kembali, mis. "Beranda". */
  backLabel?: string;
  onBack: () => void;
  /** Kirim tema (dark/light) ke konten via query param & postMessage. */
  syncTheme?: boolean;
}

const LOAD_TIMEOUT_MS = 15_000;

function withTheme(urlStr: string, theme: string): string {
  if (!urlStr) return urlStr;
  try {
    const u = new URL(urlStr, window.location.origin);
    u.searchParams.set('theme', theme);
    return u.toString();
  } catch {
    const sep = urlStr.includes('?') ? '&' : '?';
    return `${urlStr}${sep}theme=${encodeURIComponent(theme)}`;
  }
}

export default function WebViewScreen({
  src,
  title,
  backLabel = 'Beranda',
  onBack,
  syncTheme = true,
}: WebViewScreenProps) {
  const theme = useCurrentTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  // ── Topbar ratakan saat halaman webview aktif ────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── ESC untuk kembali ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  // ── Jaring pengaman: konten lambat / diblokir ───────────────────────────
  useEffect(() => {
    if (!src || !loading) return;
    setSlow(false);
    const t = setTimeout(() => setSlow(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [src, loading, loadKey]);

  const postTheme = useCallback(() => {
    if (!syncTheme) return;
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SIPEDAS_THEME_CHANGE', theme }, '*');
    } catch { /* ignore */ }
  }, [syncTheme, theme]);

  useEffect(() => {
    postTheme();
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'SIPEDAS_VIEWER_READY') postTheme();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [postTheme]);

  const reload = () => {
    setLoading(true);
    setSlow(false);
    setLoadKey(k => k + 1);
  };

  const frameSrc = syncTheme ? withTheme(src, theme) : src;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      {/* ── Topbar datar, tipis, warna penuh ── */}
      <header className="flex h-11 shrink-0 items-center gap-2 bg-blue-700 px-2 text-white dark:bg-slate-800 sm:h-12 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-xs font-bold
                     transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-white/70 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>

        <span className="h-4 w-px shrink-0 bg-white/25" aria-hidden="true" />

        {/* Logo: kotak rounded sesuai bentuk logonya */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/15">
          <img src="/assets/icon-48.png" alt="" width={18} height={18} decoding="async" className="object-contain" />
        </span>

        <h1 className="min-w-0 truncate text-[13px] font-extrabold tracking-tight">{title}</h1>
      </header>

      {/* ── Konten + spinner tengah ── */}
      <div className="relative min-h-0 flex-1 bg-slate-100 dark:bg-slate-900">
        {!src ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <TriangleAlert className="h-9 w-9 text-amber-500" aria-hidden="true" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">{title} belum dikonfigurasi.</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Tautan layanan ini belum tersedia. Silakan kembali ke beranda.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            key={loadKey}
            ref={iframeRef}
            src={frameSrc}
            title={title}
            allow="fullscreen; autoplay; encrypted-media"
            allowFullScreen
            loading="eager"
            onLoad={() => {
              setLoading(false);
              postTheme();
            }}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}

        {src && (
          <div
            aria-hidden={!loading}
            aria-busy={loading}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center transition-opacity duration-200 dark:bg-slate-950 motion-reduce:transition-none ${loading ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <div className="relative h-10 w-10">
              <span className="absolute inset-0 rounded-full border-2 border-slate-300 dark:border-slate-800" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-600 border-r-indigo-500" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Memuat {title}…
            </p>
            <p className="text-[11px] text-slate-400">Mohon tunggu sebentar</p>

            {slow && (
              <div className="mt-1 max-w-xs space-y-2.5">
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  Memuat lebih lama dari biasanya.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={reload}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    <RotateCw className="h-3 w-3" /> Coba lagi
                  </button>
                  {src && (
                    <a
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5
                                 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100
                                 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3 w-3" /> Tab baru
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}