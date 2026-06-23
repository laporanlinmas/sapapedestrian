'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, runTransaction, increment } from 'firebase/firestore';
import { Users } from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthKey() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
function yearKey()  { return String(new Date().getFullYear()); }

export default function VisitorCounter() {
  const [counts, setCounts] = useState({ today: 0, month: 0, year: 0 });

  useEffect(() => {
    const tk = todayKey(), mk = monthKey(), yk = yearKey();
    const sessionKey = `visitor_${tk}`;

    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1');
      runTransaction(db, async tx => {
        tx.set(doc(db, 'visitors', 'counters'), {
          [`day_${tk}`]: increment(1), [`month_${mk}`]: increment(1), [`year_${yk}`]: increment(1),
        }, { merge: true });
      }).catch(() => {});
    }

    return onSnapshot(doc(db, 'visitors', 'counters'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setCounts({ today: d[`day_${tk}`]||0, month: d[`month_${mk}`]||0, year: d[`year_${yk}`]||0 });
    });
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Statistik Pengunjung</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {[
            { label: 'Hari ini',  val: counts.today },
            { label: 'Bulan ini', val: counts.month },
            { label: 'Tahun ini', val: counts.year  },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{val.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
