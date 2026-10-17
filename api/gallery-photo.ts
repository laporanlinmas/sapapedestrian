import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getQuery, rateLimit, withApi } from '../src/lib/server/http.js';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../src/lib/server/firebase.js';
import { getDriveToken } from '../src/lib/server/driveAuth.js';
import { getCached, setCached } from '../src/lib/server/galleryCache.js';

/**
 * GET /api/gallery-photo?id=p000123&w=400
 * ═══════════════════════════════════════════════════════════════════════════
 *  Proxy fotoPRA PUBLIK dari Google Drive.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Alasan endpoint ini ada:
 *
 *  1. ID file Google tidak pernah sampai ke browser. Frontend hanya mengenal
 *     token opaque ("p000123") yang tidak bisa diterka ke URL Drive.
 *
 *  2. Beban bisa dibatasi per IP, sehingga galeri tidak bisa di-scrape massal.
 *
 *  3. Ukuran dikendalikan server: thumbnails 400px (±50 KB) jauh lebih ringan
 *     daripada file asli (±390 KB), menghemat bandwidth untuk warga di
 *     jaringan seluler.
 *
 *  ⚠️ KEJUJURAN TENTANG KEAMANAN
 *  ─────────────────────────────────────────────────────────────────────────
 *  Berkas di Google Drive saat ini berstatus publik ("anyone with the link").
 *  Artinya siapa pun yang MEMILIKI ID file lama masih bisa mengunduh langsung
 *  dari Drive, melewati proxy ini. Yang dilakukan endpoint ini:
 *    ✅ mencegah penemuan ID baru secara bulk (harus lewat rate limit)
 *    ✅ menjauhkan struktur internal dari frontend
 *    ✅ menghemat bandwidth
 *    ❌ BUKAN penyandar pengunduhan — untuk itu Drive harus privat.
 *  Jangan klaim proxy ini "mencegah download".
 *
 *  Watermark ditambahkan sebagai CSS overlay di sisi klien (bukan di-burn ke
 *  piksel), jadi ini penanda visual, bukan DRM.
 */

// Lebar yang diizinkan → mencegah penyimpangan dari penggunaan tak terduga.
const WIDTHS: Record<number, number> = {
  400: 400,   // thumbnail grid
  1200: 1200, // tampilan lightbox
};

async function handler(req: VercelRequest, res: VercelResponse) {
  // 300 permintaan/menit: cukup untuk menggulir grid (24 thumbnail per halaman
  // + lightbox), tidak cukup untuk mengunduh seluruh arsip.
  const limit = rateLimit(req, { limit: 300, windowMs: 60_000, scope: 'gallery-photo' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Terlalu banyak permintaan gambar.' });
  }

  const q = getQuery(req);
  const id = (q.id || '').trim();

  // Token harus berpola persis: huruf 'p' + 10 karakter heksadesimal.
  // Pola ini menutup celah path traversal dan akses dokumen lain (_meta, dst).
  if (!/^p[0-9a-f]{10}$/.test(id)) {
    return res.status(400).json({ error: 'ID foto tidak valid.' });
  }

  const width = WIDTHS[Number(q.w)] ?? 400;

  try {
    const db = await getDb();
    const snap = await getDoc(doc(db, 'gallery_photos', id));
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Foto tidak ditemukan.' });
    }
    const driveId: string = snap.data()?.driveId;
    if (!driveId) {
      return res.status(404).json({ error: 'Foto tidak ditemukan.' });
    }

    const cacheKey = `${id}:${width}`;

    // Cache instance panas: tanpa bolak-balik ke Drive sama sekali.
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Content-Length', String(cached.bytes.byteLength));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      return res.status(200).end(cached.bytes);
    }

    const token = await getDriveToken();

    // Endpoint thumbnail Drive sudah mengubah ukuran di sisi Google:
    // ±390 KB (asal) → ±47 KB (400px) → ±318 KB (1200px).
    const upstream = await fetch(
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${width}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: 'Gagal memuat foto dari penyimpanan.' });
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    setCached(cacheKey, bytes, contentType);

    // Header ini penting:
    //  - nosniff mencegah browser menebak tipe lain dari isi
    //  - immutable + max-age panjang karena foto tidak pernah berubah
    //  - no-store untuk respons error agar tidak ikut ter-cache
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(bytes.byteLength));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.status(200).end(bytes);
  } catch (err: any) {
    console.error('[gallery-photo]', err?.message || err);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Gagal memuat foto.' });
  }
}

export default withApi(handler, { methods: ['GET'], name: 'gallery-photo' });
