import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadFile(buffer: Buffer, mimeType: string, folder = 'sapapedestrian_aduan'): Promise<string> {
  try {
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const res = await cloudinary.uploader.upload(base64, {
      folder: folder,
    });
    return res.secure_url;
  } catch (err: any) {
    console.error('[Cloudinary upload error]', err.message);
    throw new Error('Gagal mengupload file ke Cloudinary: ' + err.message);
  }
}
