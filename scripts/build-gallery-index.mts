/**
 * build-gallery-index.mts
 * ═══════════════════════════════════════════════════════════════════════════
 *  Membangun indeks foto aduan dari DATA LAPORAN (Google Sheets) → Firestore.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Sumber kebenaran adalah SPREADSHEET, bukan folder Google Drive.
 *
 *  Kenapa? Karena nama folder Drive berasal dari tanggal saat FOLDER dibuat,
 *  yang tidak selalu sama dengan tanggal laporan. Artinya memakai folder Drive
 *  bisa menampilkan tanggal yang SALAH. Kolom "Tanggal Laporan" di sheet
 *  adalah data yang benar.
 *
 *  Sheet yang dibaca:
 *   - `Detail Foto` : satu baris per foto. Berisi "Tanggal Laporan" (tanggal
 *                     laporan yang benar) dan "Link Drive" (ID file langsung).
 *   - `INPUT`       : daftar laporan. Dipakai sebagai cadangan: saat kolom
 *                     "Tanggal Laporan" kosong, tanggal diambil dari baris
 *                     INPUT yang dicocokkan lewat Timestamp Upload.
 *
 *  Resolusi tanggal (berurutan dari paling dipercaya):
 *    1. Kolom "Tanggal Laporan" di Detail Foto
 *    2. Tanggal laporan di INPUT, dicocokkan lewat Timestamp Upload
 *    3. Tanggal yang tertulis di nama file (mis. "..._16 Oktober 2026_...")
 *    4. Timestamp Upload
 *
 *  Verifikasi:
 *    Setiap foto diuji dulu ke Google Drive. Foto yang gagal dimuat TIDAK
 *    disimpan, sehingga galeri hanya berisi foto yang benar-benar bisa dibuka.
 *
 *  CARA PAKAI:
 *    npm run build:gallery-index
 *
 *  Environment (lihat .env):
 *    GOOGLE_SERVICE_ACCOUNT_JSON, SPREADSHEET_ID, FIREBASE_*
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { extractDriveFileId, normalizeUploadTimestamp, parseGalleryDate } from '../src/lib/galleryDate.ts';
import { GALLERY_PUBLIC_LIMIT, GALLERY_RESERVE_LIMIT } from '../src/lib/galleryConfig.ts';

/* ── 1. Environment ─────────────────────────────────────────────────────── */
function loadEnv() {
  const p = path.join(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv();

const SA = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SHEET_ID = process.env.SPREADSHEET_ID;
if (!SA) { console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON belum diisi'); process.exit(1); }
if (!SHEET_ID) { console.error('❌ SPREADSHEET_ID belum diisi'); process.exit(1); }
const creds = JSON.parse(SA);

/* ── 2. Autentikasi Google (JWT manual, tanpa googleapis) ───────────────── */
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const scopes = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({
    iss: creds.client_email, scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(head + '.' + body);
  const sig = b64u(signer.sign(creds.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + body + '.' + sig }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Token gagal (${r.status}): ${JSON.stringify(j).slice(0, 200)}`);
  if (!j.access_token) throw new Error('Token gagal: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

const TOKEN = await getToken();

async function readSheet(name) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(name)}?majorDimension=ROWS`,
    { headers: { Authorization: 'Bearer ' + TOKEN } },
  );
  const j = await r.json();
  if (!r.ok) throw new Error(`Gagal baca sheet "${name}": ${JSON.stringify(j).slice(0, 200)}`);
  return j.values || [];
}

/* ── 3. Baca sheet ──────────────────────────────────────────────────────── */
console.log('📄 Membaca Google Sheets…');
const [rowsFoto, rowsLaporan] = await Promise.all([
  readSheet('Detail Foto'),
  readSheet('INPUT'),
]);
const foto = rowsFoto.slice(1);
const laporan = rowsLaporan.slice(1);
console.log(`   Detail Foto: ${foto.length} baris | INPUT: ${laporan.length} baris`);

// Peta: timestamp ternormalkan → tanggal laporan (dari INPUT)
const tanggalDariLaporan = new Map();
for (const r of laporan) {
  const key = normalizeUploadTimestamp(r[0]);
  const t = parseGalleryDate(r[4]);
  if (key && t) tanggalDariLaporan.set(key, t);
}

/* ── 5. Susun kandidat ──────────────────────────────────────────────────── */
const asal = { sheet: 0, laporan: 0, tanpaLaporan: 0 };
const kandidat = [];
const sudah = new Set();

// ⚠️ URUTAN PENTING: tanggal HARUS dihitung lebih dulu, baru dedup.
//
// Sheet "Detail Foto" memuat baris kembar untuk file yang sama. Sebagian
// baris kembar punya kolom "Tanggal Laporan" kosong. Kalau dedup dijalankan
// lebih dulu, baris kosong itu akan "merebut" ID file sehingga baris yang
//baris yang justru memuat tanggal benar ikut terbuang — dan laporan terbaru (mis. 16
// Oktober 2026) lenyap dari galeri.
for (const r of foto) {
  const driveId = extractDriveFileId(r[12]);
  if (!driveId) continue;                        // tanpa link drive

  const ts = normalizeUploadTimestamp(r[0]);
  // ⚠️ HANYA foto yang punya LAPORAN yang boleh masuk galeri.
  //
  // Ada banyak foto di Drive yang tanggalnya hanya bisa dibaca dari nama file
  // (mis. "..._10 Oktober 2026_...") sementara TIDAK ADA baris laporan untuk
  // tanggal tersebut di INPUT. Foto seperti itu diunggah langsung ke Drive
  // tanpa membuat laporan. Menampilkannya di galeri "berdasarkan laporan"
  // akan menampilkan tanggal yang menyesatkan — jadi dibuang.
  //
  // Dua sumber yang sah:
  //   1. Kolom "Tanggal Laporan" di Detail Foto
  //   2. Baris INPUT yang dicocokkan lewat Timestamp Upload
  let t = parseGalleryDate(r[1]);
  if (t) asal.sheet++;
  if (!t) { t = tanggalDariLaporan.get(ts) || null; if (t) asal.laporan++; }
  if (!t) { asal.tanpaLaporan++; continue; }

  // Baru dedup, setelah tanggal dipastikan ada.
  if (sudah.has(driveId)) continue;
  sudah.add(driveId);


  kandidat.push({
    driveId,
    tanggal: t.label,
    sortKey: t.urut,          // YYYY-MM-DD, bisa diurutkan sebagai teks
    ts,
  });
}

console.log('\n📌 Sumber tanggal (data laporan diutamakan):');
console.log(`   kolom "Tanggal Laporan" (Detail Foto)   : ${asal.sheet}`);
console.log(`   join ke baris laporan (INPUT)           : ${asal.laporan}`);
console.log(`   tanpa laporan (dibuang)                  : ${asal.tanpaLaporan}`);
console.log(`   kandidat siap                            : ${kandidat.length}`);

// Terbaru → terlama berdasarkan TANGGAL LAPORAN.
kandidat.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || b.ts.localeCompare(a.ts));

/* ── 6. Verifikasi: hanya foto yang benar-benar bisa dimuat ─────────────── */
// Simpan lebih dari yang ditampilkan (HEADROOM) supaya galeri tetap bisa
// menampilkan 60 foto walau sebagian di antaranya lalu rusak / dihapus.
const HEADROOM = GALLERY_RESERVE_LIMIT;
const TARGET = GALLERY_PUBLIC_LIMIT;
const requiredCount = GALLERY_PUBLIC_LIMIT + GALLERY_RESERVE_LIMIT;
const VERIFY_CONCURRENCY = 8;

console.log(`\n🔍 Memverifikasi foto (dengan buffer ${HEADROOM} di atas ${TARGET})…`);

async function bisaDimuat(driveId) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);
  try {
    // Ukuran kecil: cukup untuk membuktikan file ada & bisa dibaca.
    const r = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w64`, {
      headers: { Authorization: `Bearer ${TOKEN}` }, signal: ctrl.signal,
    });
    if (!r.ok) return false;
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const terverifikasi = [];
let gagal = 0;
let nextProgressLog = 50;
for (let offset = 0; offset < kandidat.length && terverifikasi.length < requiredCount; offset += VERIFY_CONCURRENCY) {
  const group = kandidat.slice(offset, offset + VERIFY_CONCURRENCY);
  const results = await Promise.all(group.map(async (item) => ({ item, valid: await bisaDimuat(item.driveId) })));
  for (const { item, valid } of results) {
    if (valid) terverifikasi.push(item);
    else gagal++;
  }

  const checked = Math.min(offset + group.length, kandidat.length);
  if (checked >= nextProgressLog || checked === kandidat.length) {
    console.log(`   … ${checked} dicek, ${terverifikasi.length} lolos / ${gagal} gagal`);
    nextProgressLog += 50;
  }
}
console.log(`   ✅ lolos: ${terverifikasi.length} | ❌ tidak termuat: ${gagal}`);

if (terverifikasi.length < TARGET) {
  console.error(`\n❌ Hanya ${terverifikasi.length} foto terverifikasi — kurang dari ${TARGET}.`);
  console.error('   Indeks lama dipertahankan. Periksa izin Drive service account.');
  process.exit(1);
}

/* ── 7. Simpan ke Firestore ─────────────────────────────────────────────── */
const { initializeApp, getApps, getApp } = await import('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, getDocs } =
  await import('firebase/firestore');

const env = process.env;
const app = getApps().length ? getApp() : initializeApp({
  apiKey: env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID,
  databaseURL: env.FIREBASE_DATABASE_URL || env.VITE_FIREBASE_DATABASE_URL,
});
const db = getFirestore(app);
const COL = 'gallery_photos';

/** ID dokumen stabil: hash dari driveId (bukan nomor urut). */
const hashId = (driveId) => 'p' + crypto.createHash('sha256').update(driveId).digest('hex').slice(0, 10);

console.log(`\n💾 Menyimpan ke Firestore (${COL})…`);
const BATCH = 400;
for (let i = 0; i < terverifikasi.length; i += BATCH) {
  const batch = writeBatch(db);
  for (const p of terverifikasi.slice(i, i + BATCH)) {
    batch.set(doc(db, COL, hashId(p.driveId)), {
      driveId: p.driveId,
      tanggal: p.tanggal,
      sortKey: p.sortKey,
      sortTime: p.ts,
    });
  }
  await batch.commit();
  console.log(`   → ${Math.min(i + BATCH, terverifikasi.length)}/${terverifikasi.length}`);
}

// Buang dokumen lama yang tidak lagi termasuk daftar (mis. setelah difilter).
const lama = (await getDocs(collection(db, COL))).docs
  .map((d) => d.id)
  .filter((id) => id !== '_meta' && !terverifikasi.some((p) => hashId(p.driveId) === id));
if (lama.length) {
  console.log(`   🧹 menghapus ${lama.length} dokumen usang…`);
  for (let i = 0; i < lama.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of lama.slice(i, i + 400)) batch.delete(doc(db, COL, id));
    await batch.commit();
  }
}

const tanggalUnik = [...new Set(terverifikasi.slice(0, TARGET).map((p) => p.tanggal))];
await setDoc(doc(db, COL, '_meta'), {
  // Yang ditampilkan publik tetap 50 foto terbaru.
  total: Math.min(TARGET, terverifikasi.length),
  tersedia: terverifikasi.length,
  tanggalTerbaru: terverifikasi[0]?.tanggal ?? '',
  tanggalTerlama: terverifikasi[Math.min(TARGET, terverifikasi.length) - 1]?.tanggal ?? '',
  jumlahTanggal: tanggalUnik.length,
  dibangunPada: new Date().toISOString(),
});

console.log(`\n🎉 Indeks galeri siap`);
console.log(`   ditampilkan : ${Math.min(TARGET, terverifikasi.length)} foto terbaru`);
console.log(`   terverifikasi: ${terverifikasi.length} (buffer ${terverifikasi.length - Math.min(TARGET, terverifikasi.length)})`);
console.log(`   rentang     : ${terverifikasi[0]?.tanggal} … ${terverifikasi[Math.min(TARGET, terverifikasi.length) - 1]?.tanggal}`);
console.log(`   ${tanggalUnik.length} tanggal berbeda dalam ${TARGET} foto terbaru`);
process.exit(0);
