import { useEffect } from 'react';

/**
 * Jembatan tema & sinyal "sudah hidup".
 *
 * Portal ini berada di tengah dua peran:
 *  • ANAK — portal dibungkus iframe oleh halaman `index.html` dan dashboard
 *    SIPEDAS; portal ikut tema yang dikirim induk lewat
 *    `postMessage({ type: 'SIPEDAS_THEME_CHANGE', theme })` atau `?theme=`.
 *  • INDUK — portal membungkus sipedas-view di halaman CCTV/Peta; sinyal
 *    "saya hidup" di sini juga yang dipakai WebViewScreen untuk menyinkronkan
 *    tema ke frame di bawahnya.
 *
 * Peringatan: event `load` di halaman induk menyala bahkan saat frame ditolak
 * browser karena header anti-embed, sehingga `sipedas:frame-ready` inilah yang
 * dipakai induk untuk memastikan aplikasi benar-benar hidup.
 */

const THEME_MSG = 'SIPEDAS_THEME_CHANGE';
const READY_MSG = 'SIPEDAS_VIEWER_READY';
const FRAME_READY_MSG = 'sipedas:frame-ready';

type ThemeMode = 'dark' | 'light';

const isTheme = (v: unknown): v is ThemeMode => v === 'dark' || v === 'light';

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export default function FrameThemeBridge() {
  useEffect(() => {
    const framed = window.parent !== window;

    // 1. Tema awal dari query param (dikirim induk).
    try {
      const q = new URLSearchParams(window.location.search).get('theme');
      if (isTheme(q)) applyTheme(q);
    } catch { /* abaikan */ }

    // 2. Perubahan tema dari induk.
    const onMessage = (ev: MessageEvent) => {
      const data = ev?.data;
      if (!data || typeof data !== 'object') return;
      if ((data as { type?: string }).type === THEME_MSG) {
        const theme = (data as { theme?: unknown }).theme;
        if (isTheme(theme)) applyTheme(theme);
      }
    };
    window.addEventListener('message', onMessage);

    // 3. Beri tahu induk (dan frame-frame anak kita) bahwa kita siap.
    const announce = () => {
      try {
        window.parent.postMessage({ type: READY_MSG }, '*');
        window.parent.postMessage({ type: FRAME_READY_MSG }, '*');
      } catch {
        /* induk sudah ditutup — abaikan */
      }
    };

    const timers: Array<ReturnType<typeof setTimeout>> = framed
      ? [400, 1200, 2500].map((ms) => setTimeout(announce, ms))
      : [];
    if (framed) announce();

    return () => {
      window.removeEventListener('message', onMessage);
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}