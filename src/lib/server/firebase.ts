import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Inisialisasi Firebase untuk runtime serverless (api/*.ts).
 * Dibuat SESUNGGUHNYA (lazy) agar proses import tidak gagal ketika
 * environment variable belum tersedia, dan agar pesan error bisa jelas.
 */

function readConfig() {
  const env = process.env || {};
  return {
    apiKey: env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.FIREBASE_DATABASE_URL || env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID,
  };
}

let dbPromise: Promise<Firestore> | null = null;

export function getDb(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const config = readConfig();
      if (!config.projectId || !config.apiKey) {
        throw new Error(
          'Konfigurasi Firebase server belum lengkap (FIREBASE_PROJECT_ID / FIREBASE_API_KEY). ' +
          'Tambahkan environment variable tersebut di Vercel Dashboard.',
        );
      }
      const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

export function firebaseConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.projectId && c.apiKey);
}