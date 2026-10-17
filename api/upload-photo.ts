import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseBody, rateLimit, withApi } from '../src/lib/server/http.js';
import { uploadPhotos } from '../src/lib/server/aduan.js';

/**
 * POST /api/upload-photo  { base64, type, name }
 * Endpoint terpisah untuk mengunggah satu foto ke Cloudinary.
 *
 * Dipisahkan dari /api/submit-complaint agar:
 *  - unggahan dapat diulang bila gagal tanpa mengulang seluruh laporan,
 *  - body tiap permintaan kecil sehingga tidak melewati batas 4.5 MB,
 *  - handler aduan tetap cepat dan tidak kehabisan waktu (maxDuration).
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 25, windowMs: 60_000, scope: 'upload-photo' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: `Terlalu banyak unggahan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
    });
  }

  const body = parseBody(req);
  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  if (!base64) return res.status(400).json({ error: 'Foto tidak ditemukan.' });

  // Batas kasar: ~4 MB data base64.
  if (base64.length > 6 * 1024 * 1024) {
    return res.status(413).json({ error: 'Ukuran foto terlalu besar. Maksimal sekitar 4 MB.' });
  }

  const links = await uploadPhotos([
    { base64, type: String(body.type || 'image/jpeg'), name: String(body.name || 'foto') },
  ]);

  if (!links.length) {
    return res.status(502).json({ error: 'Gagal mengunggah foto ke penyimpanan.' });
  }

  return res.status(200).json({ success: true, url: links[0] });
}

export default withApi(handler, { methods: ['POST'], name: 'upload-photo' });