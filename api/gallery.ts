import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  collection, doc, getDoc, getDocs, limit as qLimit,
  orderBy, query, startAfter,
} from 'firebase/firestore';
import { withApi, getQuery, rateLimit } from '../src/lib/server/http.js';
import { getDb } from '../src/lib/server/firebase.js';
import { refreshGallerySource } from '../src/lib/server/gallerySource.js';
import { GALLERY_PUBLIC_LIMIT, GALLERY_RESERVE_LIMIT } from '../src/lib/galleryConfig.js';

/**
 * GET /api/gallery?page=1&perPage=12&start=0
 * ═══════════════════════════════════════════════════════════════════════════
 *  Daftar foto untuk galeri kegiatan.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Foto TIDAK dikirim lewat endpoint ini — hanya token opaque + tanggal.
 *  Gambarnya diambil terpisah lewat /api/gallery-photo (proxy), sehingga ID
 *  file Google tidak pernah muncul di browser.
 *
 *  Foto disusun berdasarkan TANGGAL LAPORAN yang diambil dari Google Sheets
 *  (lihat scripts/build-gallery-index.mts) — bukan dari nama folder Drive.
 *
 *  Parameternya:
 *   page     halaman ke-berapa (untuk tombol pagination)
 *   perPage  jumlah foto per halaman
 *   start    indeks offset di dalam daftar publik. Dipakai klien untuk
 *            mengambil FOTO PENGGANTI ketika ada foto yang gagal dimuat,
 *            sehingga jumlah foto yang tampil tetap utuh.
 */

const PER_PAGE_MAX = 24;

/** Batas foto yang dibuka ke publik. */
interface PhotoDoc {
  driveId: string;
  tanggal: string;
  sortKey: string;
  sortTime: string;
  size: number;
}

function toItem(d: any): Record<string, string> {
  const data = d.data() as PhotoDoc;
  const token = encodeURIComponent(d.id);
  return {
    id: d.id,
    tanggal: data.tanggal,
    thumb: `/api/gallery-photo?id=${token}&w=400`,
    large: `/api/gallery-photo?id=${token}&w=1200`,
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  // 120 permintaan daftar per menit: cukup untuk pagination normal, tidak
  // cukup untuk mengunduh seluruh arsip.
  const limit = rateLimit(req, { limit: 120, windowMs: 60_000, scope: 'gallery-list' });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
  }

  const q = getQuery(req);
  const page = Math.max(1, Number(q.page) || 1);
  const start = Math.max(0, Math.min(GALLERY_PUBLIC_LIMIT + GALLERY_RESERVE_LIMIT, Number(q.start) || 0));
  const perPage = Math.min(PER_PAGE_MAX, Math.max(1, Number(q.perPage) || 12));

  const db = await getDb();
  // Keep the existing Firestore lookup for opaque image IDs, but refresh it
  // from the report sheet so new Drive photos appear without a manual rebuild.
  try {
    await refreshGallerySource(db);
  } catch (error) {
    console.error('[gallery-source]', error instanceof Error ? error.message : error);
  }
  const ref = collection(db, 'gallery_photos');

  // Rangkuman ditulis saat indeks dibangun.
  const metaSnap = await getDoc(doc(db, 'gallery_photos', '_meta'));
  const arsip: number = (metaSnap.exists ? metaSnap.data() : null)?.total ?? 0;
  const total = Math.min(arsip, GALLERY_PUBLIC_LIMIT);

  // Indeks belum dibangun — balas JSON supaya frontend tidak error.
  if (!total) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true, total: 0, limit: GALLERY_PUBLIC_LIMIT, pool: 0,
      page, start: 0, perPage, pages: 0, items: [],
      message: 'Galeri sedang disiapkan.',
    });
  }

  const pages = Math.ceil(total / perPage);

  // Ambil daftar foto terbaru sekaligus: 60 publik + cadangan pengganti.
  // Satu round-trip; jumlahnya jauh di bawah batas 1 MB per query.
  const snap = await getDocs(query(ref, orderBy('sortKey', 'desc'), qLimit(GALLERY_PUBLIC_LIMIT + GALLERY_RESERVE_LIMIT)));
  const pool = snap.docs.filter((d) => d.id !== '_meta');

  let docs: any[];
  if (start > 0) {
    // Pengambilan foto pengganti: lewati `start` foto pertama.
    docs = pool.slice(start, start + perPage);
  } else if (page > 1) {
    // Halaman berikutnya lewat startAfter (lebih murah daripada offset besar).
    const cursor = await getDocs(query(ref, orderBy('sortKey', 'desc'), qLimit((page - 1) * perPage)));
    const last = cursor.docs[cursor.docs.length - 1];
    if (!last) {
      return res.status(200).json({
        ok: true, total, limit: GALLERY_PUBLIC_LIMIT, pool: pool.length,
        page: 1, start: 0, perPage, pages, items: [],
      });
    }
    const next = await getDocs(query(ref, orderBy('sortKey', 'desc'), startAfter(last), qLimit(perPage)));
    docs = next.docs.filter((d) => d.id !== '_meta');
  } else {
    // Halaman 1: foto paling depan, dipastikan tidak melewati batas publik.
    docs = pool.slice(0, perPage);
  }

  // Cegah agar halaman terakhir tidak keluar dari batas 60 foto publik.
  if (start === 0 && page === 1) {
    docs = pool.slice(0, Math.min(perPage, GALLERY_PUBLIC_LIMIT));
  }

  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    ok: true,
    total,              // jumlah foto untuk publik (60)
    limit: GALLERY_PUBLIC_LIMIT,
    pool: pool.length,  // total terverifikasi (publik + cadangan)
    page,
    start,
    perPage,
    pages,
    items: docs.map(toItem),
  });
}

export default withApi(handler, { methods: ['GET'], name: 'gallery' });
