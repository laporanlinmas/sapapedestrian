/**
 * Upload foto langsung dari browser ke Cloudinary memakai unsigned preset.
 * Dipakai HANYA sebagai jalur cadangan ketika serverless function tidak tersedia.
 * Kegagalan tidak pernah menggagalkan pengiriman laporan — foto просто dilewati.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dym9koebf';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'sapapedestrian';

export async function uploadPhotoPublic(
  base64: string,
  mimeType: string,
  folder = 'sapapedestrian_aduan',
): Promise<string> {
  const body = new FormData();
  body.append('file', `data:${mimeType || 'image/jpeg'};base64,${base64}`);
  body.append('upload_preset', UPLOAD_PRESET);
  body.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw new Error(`Cloudinary HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.secure_url) throw new Error(data?.error?.message || 'URL foto tidak dikembalikan.');
  return data.secure_url as string;
}