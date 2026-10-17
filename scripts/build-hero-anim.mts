#!/usr/bin/env node
/**
 * build-hero-anim.mjs — ubah `.lottie` / `.json` Lottie menjadi WebP animasi
 * untuk hero, plus poster frame pertama.
 *
 * Kenapa perlu: file Lottie hasil ekspor MP4->Lottie (EasyLottie / Lottielab)
 * berisi 50 frame WebP berkualitas raster, bukan vektor. Memakai `lottie-web`
 * untuk memutarinya berarti membayar ~250 KB library + 2,3 MB JSON base64
 * demi gambar yang isinya sama persis dengan satu file WebP animasi.
 *
 * Hasil:
 *   public/assets/hero-petugas.webp         (animasi, alpha, loop)
 *   public/assets/hero-petugas-poster.webp  (frame 0, untuk fallback)
 *
 * Pemakaian:
 *   node scripts/build-hero-anim.mjs ./pedestrian.lottie
 *
 * Butuh: `unzip` (untuk .lottie) dan `ffmpeg` (untuk mux WebP animasi).
 */

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';

/** Konfigurasi encode — boleh diubah tanpa menyentuh kode. */
const CONFIG = {
  outAnim: 'public/assets/hero-petugas.webp',
  outPoster: 'public/assets/hero-petugas-poster.webp',
  fps: 20, // 50 frame / 2,5 detik -> 20 fps
  quality: 58, // 50 & 70 nyaris tak-bedanya di ukuran tampil; 58 titik tengah
  preset: 'picture', // karakter 3D, bukan garis tajam
};

function run(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    const msg = String(err.stderr || err.message);
    throw new Error(`${cmd} gagal: ${msg.trim().split('\n').slice(-3).join(' ')}`);
  }
}

/**
 * Salin frame ke direktori kerja dengan nama berurutan `frame_0.webp`,
 * `frame_1.webp`, … supaya pola input ffmpeg (`frame_%d`) selalu cocok —
 * nama asli bisa 1 digit (img_9) maupun 2 digit (img_10) atau campur.
 */
function normalize(frames, destDir) {
  mkdirSync(destDir, { recursive: true });
  const ext = extname(frames[0]).toLowerCase();
  const safeExt = ext === '.jpg' ? '.jpeg' : ext;
  frames.forEach((file, i) => copyFileSync(file, join(destDir, `frame_${i}${safeExt}`)));
  return safeExt;
}

/* ── Sumber frame ─────────────────────────────────────────────────────────── */

/** Urutkan nama berkas secara numerik (img_2 sebelum img_10). */
function sortByIndex(dir, files) {
  return files
    .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return na - nb || a.localeCompare(b);
    })
    .map((f) => join(dir, f));
}

/** `.lottie` = zip berisi images/*.webp + animations/main.json. */
function framesFromLottie(src, work) {
  run('unzip', ['-q', '-o', src, '-d', work]);
  const imgDir = join(work, 'images');
  return sortByIndex(imgDir, readdirSync(imgDir));
}

/** JSON Lottie dengan gambar tertanam base64 -> tulis ke disk lalu urutkan
 *  mengikuti waktu mulai tiap layer (bukan nama aset). */
function framesFromJson(src, work) {
  const raw = JSON.parse(readFileSync(src, 'utf8'));
  if (!Array.isArray(raw.assets)) throw new Error('JSON ini tidak punya array `assets`');

  const imgDir = join(work, 'raw');
  mkdirSync(imgDir, { recursive: true });

  const byId = new Map();
  for (const asset of raw.assets) {
    if (!asset?.p) continue;
    const data = String(asset.p);
    const ext = (/^data:image\/(\w+)/i.exec(data)?.[1] || 'webp').toLowerCase();
    const file = join(imgDir, `${asset.id}.${ext === 'jpeg' ? 'jpg' : ext}`);
    writeFileSync(file, Buffer.from(data.replace(/^data:[^,]+,/, ''), 'base64'));
    byId.set(asset.id, file);
  }

  const fps = Number(raw.fr) || CONFIG.fps;
  return (raw.layers || [])
    .map((layer) => {
      const file = byId.get(layer.refId);
      if (!file) return null;
      return { file, at: (Number(layer.ip ?? layer.st ?? 0)) / fps };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at)
    .map((f) => f.file);
}

/* ── Main ────────────────────────────────────────────────────────────────── */

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Pemakaian: node scripts/build-hero-anim.mjs <file.lottie|file.json>');
    process.exit(1);
  }

  const src = resolve(input);
  if (!/\.(lottie|json)$/i.test(src)) {
    console.error(`Format tidak dikenali: ${src} (harus .lottie atau .json)`);
    process.exit(1);
  }

  const work = mkdtempSync(join(tmpdir(), 'hero-anim-'));

  try {
    const frames = src.endsWith('.lottie')
      ? framesFromLottie(src, work)
      : framesFromJson(src, work);

    if (frames.length < 2) {
      throw new Error(`Hanya ditemukan ${frames.length} frame — ini bukan animasi.`);
    }
    console.log(`Sumber: ${frames.length} frame (${basename(src)})`);

    const normDir = join(work, 'seq');
    const ext = normalize(frames, normDir);

    // Poster: frame pertama apa adanya — sudah WebP terkompresi ±33 KB.
    copyFileSync(frames[0], CONFIG.outPoster);
    console.log(`✓ ${CONFIG.outPoster}`);

    /* ffmpeg memotong tiap frame ke bounding box-nya sendiri lalu menulis
     * offset-nya di header ANMF, jadi hasilnya lebih kecil daripada
     * menjumlahkan seluruh frame individual. Alpha dipertahankan (ALPH). */
    run('ffmpeg', [
      '-y', '-v', 'error',
      '-framerate', String(CONFIG.fps),
      '-start_number', '0',
      '-i', join(normDir, `frame_%d${ext}`),
      '-loop', '0',
      '-quality', String(CONFIG.quality),
      '-preset', CONFIG.preset,
      '-compression_level', '6',
      CONFIG.outAnim,
    ]);
    console.log(`✓ ${CONFIG.outAnim}`);

    // Sanity check: file harus punya chunk ANIM (bukan cuma satu gambar diam).
    const head = readFileSync(CONFIG.outAnim).subarray(0, 4096);
    if (!head.includes(Buffer.from('ANIM'))) {
      throw new Error('Output tidak tampak beranimasi (chunk ANIM tidak ditemukan).');
    }
    console.log(
      '\nSelesai. Ukuran animasi biasanya jauh lebih kecil daripada jumlah ' +
        'seluruh frame, karena ffmpeg hanya mengstores bagian yang berubah ' +
        'serta channel alpha-nya.',
    );
  } catch (err) {
    console.error(`\nGagal: ${err.message}`);
    process.exit(1);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();