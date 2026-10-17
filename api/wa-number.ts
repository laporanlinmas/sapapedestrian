import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, withApi } from '../src/lib/server/http.js';
import { getDb } from '../src/lib/server/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { NOWA_COLLECTION } from '../src/lib/apiClient.js';
import { hariIniWIB, resolveWa, type WaRow } from '../src/lib/waSchedule.js';

/**
 * GET /api/wa-number
 * Mengembalikan nomor WhatsApp petugas piket yang bertugas hari ini,
 * dibaca dari koleksi `nowa` (dikelola dari menu Pengaturan di sipedasadmin).
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 40, windowMs: 60_000, scope: 'wa-number' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: `Terlalu banyak permintaan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
    });
  }

  const db = await getDb();
  const snap = await getDocs(collection(db, NOWA_COLLECTION));
  const rows = snap.docs.map(d => d.data() as WaRow);

  const resolved = resolveWa(rows);
  if (!resolved) {
    // Tidak ada petugas terdaftar — balas JSON normal, bukan error.
    return res.status(200).json({ number: '', name: 'Piket Satlinmas', day: hariIniWIB(), jadwal: '' });
  }

  return res.status(200).json(resolved);
}

export default withApi(handler, { methods: ['GET'], name: 'wa-number' });