import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ticket = ((req.query.ticket as string) ?? '').trim().toUpperCase();
  if (!ticket) return res.status(400).json({ error: 'ticket wajib diisi' });

  try {
    const snap = await getDoc(doc(db, 'aduan', ticket));
    if (!snap.exists()) return res.status(404).json({ found: false, ticket, message: 'Tiket tidak ditemukan.' });
    const d = snap.data();
    return res.status(200).json({
      found: true, ticket: d.ticket || ticket, timestamp: d.timestamp || '',
      nama: d.nama || '', kategori: d.kategori || '', lokasi: d.lokasi || '',
      deskripsi: d.deskripsi || '', fotos: d.fotos || [],
      status: d.status || 'Baru', catatan: d.catatan || '', updatedAt: d.updatedAt || '',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Gagal mengambil status tiket.' });
  }
}
