import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { uploadFile } from '../src/lib/cloudinary';
import { timestampWIB } from '../src/lib/wib';

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

const MAX_PHOTOS = 5;

function generateTicket(): string {
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ADU-${yy}${mm}${dd}-${rand}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nama, kategori, lokasi, deskripsi, source, photos } = req.body;
    const trimmedNama = (nama ?? '').trim();
    const trimmedKategori = (kategori ?? '').trim();
    const trimmedLokasi = (lokasi ?? '').trim();
    const trimmedDeskripsi = (deskripsi ?? '').trim();
    const cleanSource = (source ?? 'Form Web').trim();

    if (!trimmedNama || !trimmedKategori || !trimmedLokasi || !trimmedDeskripsi) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    const ticket = generateTicket();
    const photoLinks: string[] = [];

    if (photos && Array.isArray(photos) && photos.length > 0) {
      await Promise.all(
        photos.slice(0, MAX_PHOTOS).map(async (photo: { name: string; type: string; base64: string }, idx) => {
          try {
            if (!photo.base64) return;
            const buf = Buffer.from(photo.base64, 'base64');
            photoLinks[idx] = await uploadFile(buf, photo.type, 'sapapedestrian_aduan');
          } catch {
            photoLinks[idx] = '';
          }
        })
      );
    }

    const uploadedPhotos = photoLinks.filter(Boolean);
    const ts = timestampWIB();
    await setDoc(doc(db, 'aduan', ticket), {
      ticket, timestamp: ts, nama: trimmedNama, kategori: trimmedKategori,
      lokasi: trimmedLokasi, deskripsi: trimmedDeskripsi,
      fotos: uploadedPhotos, jumlahFoto: uploadedPhotos.length,
      status: 'Baru', catatan: '', updatedAt: ts, source: cleanSource,
    });

    return res.status(200).json({ success: true, ticketNumber: ticket });
  } catch (err: any) {
    console.error('[submit-complaint] Error:', err);
    return res.status(500).json({ error: 'Gagal mengirim laporan: ' + err.message });
  }
}
