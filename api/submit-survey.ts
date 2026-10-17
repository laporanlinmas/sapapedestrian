import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseBody, rateLimit, withApi } from '../src/lib/server/http.js';
import { getDb } from '../src/lib/server/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SURVEY_COLLECTION } from '../src/lib/apiClient.js';

/**
 * POST /api/submit-survey
 * Menyimpan penilaian kepuasan (skala tunggal 1–5 bintang) ke `survey_kepuasan`.
 *
 * Kolom `rating` adalah sumber data utama. Kolom lama (kemudahan/kegunaan/
 * kecepatan/keakuratan/rekomendasi) tetap dibaca oleh dashboard sebagai
 * cadangan untuk data historis sebelum perubahan ini.
 */

const clampText = (value: unknown, max: number): string =>
  String(value ?? '').trim().slice(0, max);

async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 6, windowMs: 60_000, scope: 'submit-survey' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: `Terlalu banyak permintaan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
    });
  }

  const body = parseBody(req);
  const rating = Number(body.rating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Penilaian harus berupa angka 1 sampai 5.' });
  }

  const db = await getDb();
  await addDoc(collection(db, SURVEY_COLLECTION), {
    nama: clampText(body.nama, 120),
    pekerjaan: clampText(body.pekerjaan, 120),
    rating: Math.round(rating),
    saran: clampText(body.saran, 2000),
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString(),
  });

  return res.status(200).json({ success: true, rating: Math.round(rating) });
}

export default withApi(handler, { methods: ['POST'], name: 'submit-survey' });