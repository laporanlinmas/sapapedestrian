import { v2 as cloudinary } from 'cloudinary';

/**
 * Helper Cloudinary untuk serverless function.
 * Konfigurasi dilakukan SESUNGGUHNYA: jika credential belum di-set, error
 * baru muncul saat upload — bukan saat modul di-import (yang bisa membuat
 * seluruh endpoint gagal dengan "A server error occurred").
 */

export const CLOUDINARY_FOLDER = 'sapapedestrian_aduan';

export function cloudinaryConfigured(): boolean {
  const env = process.env || {};
  return Boolean(
    (env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME) &&
    (env.CLOUDINARY_API_KEY || env.VITE_CLOUDINARY_API_KEY) &&
    (env.CLOUDINARY_API_SECRET || env.VITE_CLOUDINARY_API_SECRET),
  );
}

function ensureConfigured(): void {
  const env = process.env || {};
  const cloudName = env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY || env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET || env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Kredensial Cloudinary belum dikonfigurasi (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).',
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  folder: string = CLOUDINARY_FOLDER,
): Promise<string> {
  ensureConfigured();
  const base64 = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  const res = await cloudinary.uploader.upload(base64, { folder });
  if (!res?.secure_url) throw new Error('Cloudinary tidak mengembalikan URL.');
  return res.secure_url;
}