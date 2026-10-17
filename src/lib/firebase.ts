import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Klien Firestore untuk browser.
 * Sengaja di-import secara dinamis (dynamic import) supaya paket `firebase`
 * hanya diunduh ketika benar-benar dipakai —misalnya saat fallback diperlukan.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.projectId && config.apiKey);

let dbPromise: Promise<Firestore> | null = null;

export function getDb(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      if (!config.projectId) throw new Error('Konfigurasi Firebase belum lengkap.');
      const app = getApps().length ? getApp() : initializeApp(config);
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

/** Reset cache — dipakai pada hot-reload saat dev. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => { dbPromise = null; });
}