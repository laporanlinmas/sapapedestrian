import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Inlined from src/lib/wib.ts (avoids .ts import in Node ESM runtime)
const HARI_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const HARI_MAP: Record<string, number> = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
function dayOfWeekWIB(): number {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', weekday: 'short' });
  const parts = fmt.formatToParts(new Date());
  const short = parts.find(p => p.type === 'weekday')?.value ?? '';
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? new Date().getDay();
}
function hariIniWIB(): string { return HARI_LABEL[dayOfWeekWIB()]; }

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db  = getFirestore(app);

const DEFAULT = { number: '', name: 'Piket Satlinmas', day: '', jadwal: '' };

function jadwalCocok(jadwalRaw: string, todayIdx: number): boolean {
  const j = jadwalRaw.toLowerCase().trim();
  if (!j) return false;
  if (j === 'semua' || j === '*' || j === 'senin-minggu' || j === 'minggu-sabtu') return true;

  if (j.includes('-')) {
    const [rawStart, rawEnd] = j.split('-').map(s => s.trim());
    const s = HARI_MAP[rawStart], e = HARI_MAP[rawEnd];
    if (s === undefined || e === undefined) return false;
    if (s <= e) return todayIdx >= s && todayIdx <= e;
    return todayIdx >= s || todayIdx <= e;
  }

  if (j.includes(',')) {
    return j.split(',').map(s => s.trim()).some(h => HARI_MAP[h] === todayIdx);
  }

  return HARI_MAP[j] === todayIdx;
}

function cleanWANumber(raw: string): string {
  let num = raw.replace(/^wa:\s*/i, '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('0'))   return '62' + num.slice(1);
  if (!num.startsWith('62')) return '62' + num;
  return num;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const todayIdx   = dayOfWeekWIB();
  const todayLabel = hariIniWIB();

  try {
    const snap = await getDocs(collection(db, 'nowa'));
    const rows = snap.docs
      .map(d => d.data())
      .filter(r => (r.number ?? '').toString().trim());

    if (!rows.length) return res.status(200).json({ ...DEFAULT, day: todayLabel });

    const matched = rows.find(r => jadwalCocok(r.jadwal ?? '', todayIdx));
    const row     = matched ?? rows[0];
    const number  = cleanWANumber((row.number ?? '').toString());

    return res.status(200).json({
      number,
      name:   (row.nama ?? '').trim() || DEFAULT.name,
      day:    todayLabel,
      jadwal: (row.jadwal ?? '').trim(),
    });

  } catch (err) {
    console.error('[wa-number]', err);
    return res.status(500).json({ error: 'Gagal mengambil data petugas.' });
  }
}
