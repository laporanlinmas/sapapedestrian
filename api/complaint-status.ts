import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getQuery, rateLimit, withApi } from '../src/lib/server/http.js';
import { getDb } from '../src/lib/server/firebase.js';
import { ADUAN_COLLECTION, normalizeAduanStatus } from '../src/lib/apiClient.js';
import { doc, getDoc } from 'firebase/firestore';

/**
 * GET /api/complaint-status?ticket=ADU-XXXX
 * Pencarian status tiket + respons petugas (catatan & foto tindak lanjut).
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 30, windowMs: 60_000, scope: 'complaint-status' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: `Terlalu banyak permintaan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
    });
  }

  const ticket = (getQuery(req).ticket || '').trim().toUpperCase();
  if (!ticket) return res.status(400).json({ error: 'ticket wajib diisi' });
  if (ticket.length > 40) return res.status(400).json({ error: 'format tiket tidak valid' });

  const db = await getDb();
  const snap = await getDoc(doc(db, ADUAN_COLLECTION, ticket));

  if (!snap.exists()) {
    return res.status(404).json({
      found: false,
      ticket,
      message: 'Tiket tidak ditemukan. Periksa kembali nomor tiket Anda.',
    });
  }

  return res.status(200).json(normalizeAduanStatus(ticket, snap.data()));
}

export default withApi(handler, { methods: ['GET'], name: 'complaint-status' });