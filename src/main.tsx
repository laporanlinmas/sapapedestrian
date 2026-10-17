import React from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from '@/app/page';
import '@/styles/landing.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HomePage />
  </React.StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('[pwa] service worker gagal didaftarkan:', error);
    });
  }, { once: true });
}
