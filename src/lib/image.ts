/**
 * Kompresi gambar di sisi browser sebelum dikirim ke server.
 *
 * Alasan: Vercel membatasi body request fungsi serverless (4.5 MB).
 * Foto HPfull-res sebagai base64 bisa 3–5 MB per file, sehingga 2 foto saja
 * sudah melewati batas → server membalas halaman error (bukan JSON).
 * Dengan resize + kompres ke JPEG di canvas, payload turun ~90% dan
 * upload ke Cloudinary jauh lebih cepat.
 */

export interface PreparedPhoto {
  name: string;
  type: string;      // selalu image/jpeg atau image/webp setelah kompresi
  base64: string;    // base64 tanpa prefix data URL
  sizeKB: number;
}

const MAX_DIMENSION = 1600;
const MAX_EDGE_BYTES = 900 * 1024; // 900 KB per foto — 5 foto ≈ 4.5 MB, masih di bawah batas
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
    img.src = src;
  });
}

function stripDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function approxBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Kompres satu file gambar menjadi base64 yang aman dikirim.
 * Non-image (atau gambar yang gagal diproses) diteruskan apa adanya
 * supaya pengguna tetap bisa mengirim bukti.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    const base64 = stripDataUrl(dataUrl);
    return { name: file.name, type: file.type || 'application/octet-stream', base64, sizeKB: Math.round(approxBytes(base64) / 1024) };
  }

  try {
    const originalUrl = await fileToDataUrl(file);
    const img = await loadImage(originalUrl);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak tersedia.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let best = stripDataUrl(canvas.toDataURL('image/jpeg', QUALITY_STEPS[0]));
    for (const q of QUALITY_STEPS) {
      const candidate = stripDataUrl(canvas.toDataURL('image/jpeg', q));
      if (candidate.length < best.length) best = candidate;
      if (approxBytes(candidate) <= MAX_EDGE_BYTES) {
        best = candidate;
        break;
      }
    }

    const base64 = best;
    if (base64.length > 6 * 1024 * 1024) {
      // Masih terlalu besar — kirim apa adanya agar tidak gagal total.
      const fallback = stripDataUrl(originalUrl);
      return { name: file.name, type: file.type, base64: fallback, sizeKB: Math.round(approxBytes(fallback) / 1024) };
    }

    return { name: file.name, type: 'image/jpeg', base64, sizeKB: Math.round(approxBytes(base64) / 1024) };
  } catch {
    const dataUrl = await fileToDataUrl(file);
    const base64 = stripDataUrl(dataUrl);
    return { name: file.name, type: file.type, base64, sizeKB: Math.round(approxBytes(base64) / 1024) };
  }
}

/** Kompres banyak file sekaligus (dengan batas konkurensi ringan). */
export async function preparePhotos(files: File[]): Promise<PreparedPhoto[]> {
  const out: PreparedPhoto[] = [];
  const CONCURRENCY = 2;
  const queue = [...files];

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) return;
      try {
        out.push(await preparePhoto(file));
      } catch {
        /* abaikan file yang gagal diproses */
      }
    }
  });

  await Promise.all(workers);
  return out;
}