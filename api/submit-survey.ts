import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nama, pekerjaan, kemudahan, kegunaan, kecepatan, keakuratan, rekomendasi, saran } = req.body;

    if (!nama || !pekerjaan) {
      return res.status(400).json({ error: 'Nama dan pekerjaan wajib diisi.' });
    }

    if (kemudahan === undefined || kegunaan === undefined || kecepatan === undefined ||
        keakuratan === undefined || rekomendasi === undefined) {
      return res.status(400).json({ error: 'Semua rating wajib diisi.' });
    }

    const colRef = collection(db, 'survey_kepuasan');
    await addDoc(colRef, {
      nama: String(nama).trim(),
      pekerjaan: String(pekerjaan).trim(),
      kemudahan: Number(kemudahan),
      kegunaan: Number(kegunaan),
      kecepatan: Number(kecepatan),
      keakuratan: Number(keakuratan),
      rekomendasi: Number(rekomendasi),
      saran: (saran || '').trim(),
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[submit-survey] Error:', err);
    return res.status(500).json({ error: 'Gagal mengirim survei: ' + err.message });
  }
}
