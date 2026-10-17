import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseBody, rateLimit, withApi } from '../src/lib/server/http.js';
import { createComplaint, validateAduan, sanitizeAduan } from '../src/lib/server/aduan.js';
import type { AduanInput } from '../src/lib/apiClient.js';

/**
 * POST /api/submit-complaint
 *
 * Menerima laporan aduan dan menyimpannya ke koleksi `aduan` pada Firestore —
 * koleksi yang sama dibaca dashboard sipedasadmin secara real-time.
 *
 * Foto dikirim lewat endpoint /api/upload-photo terlebih dahulu (satu per satu,
 * agar body tetap kecil), lalu URL-nya diteruskan di `fotoUrls`.
 * Field `photos` (base64) tetap didukung demi kompatibilitas.
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 8, windowMs: 60_000, scope: 'submit-complaint' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: `Terlalu banyak permintaan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
    });
  }

  const body = parseBody(req);

  const input: AduanInput = {
    nama: String(body.nama ?? ''),
    kategori: String(body.kategori ?? ''),
    lokasi: String(body.lokasi ?? ''),
    deskripsi: String(body.deskripsi ?? ''),
    source: String(body.source ?? 'Website'),
    photos: Array.isArray(body.photos) ? body.photos : [],
    fotoUrls: Array.isArray(body.fotoUrls)
      ? body.fotoUrls.map((u: unknown) => String(u ?? '').trim()).filter(Boolean).slice(0, 5)
      : [],
  };

  const invalid = validateAduan(sanitizeAduan(input));
  if (invalid) return res.status(400).json({ error: invalid });

  const result = await createComplaint(input);
  const fotoGagal = result.requested - result.jumlahFoto;

  return res.status(200).json({
    success: true,
    ticketNumber: result.ticket,
    jumlahFoto: result.jumlahFoto,
    ...(fotoGagal > 0 ? { warning: `${fotoGagal} foto gagal diunggah, laporan tetap tersimpan.` } : {}),
  });
}

export default withApi(handler, { methods: ['POST'], name: 'submit-complaint' });