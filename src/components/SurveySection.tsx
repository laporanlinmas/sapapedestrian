'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { submitSurvey } from '@/lib/apiClient';

/**
 * Rating Kepuasan Layanan.
 *
 * Satu pertanyaan utama dengan skala 1–5 bintang, plus komentar opsional.
 * Skema yang disimpan ke Firestore: `rating` (1–5).
 */
const STORAGE_KEY = 'sipedas_rating_done';

const LABELS = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat Baik'];

export default function SurveySection() {
  const [nama, setNama] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [saran, setSaran] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setSubmitted(true);
    } catch {
      // localStorage tidak tersedia (mis. mode privat) — abaikan.
    }
  }, []);

  const active = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Mohon pilih bintang penilaian terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitSurvey({
        nama: nama.trim(),
        pekerjaan: pekerjaan.trim(),
        rating,
        saran,
      });
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* abaikan */ }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim penilaian. Coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="rating" className="scroll-mt-32 pt-4">
        <div className="max-w-3xl mx-auto text-center p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Terima Kasih atas Penilaian Anda!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Masukan Anda sangat berarti bagi kami untuk terus meningkatkan kualitas dan keamanan
            kawasan pedestrian Ponorogo.
          </p>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setRating(0); }}
            className="mt-6 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Ubah penilaian saya
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="rating" className="scroll-mt-32 pt-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 sm:p-9">

          <div className="text-center mb-7">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
              Berikan Penilaian Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Seberapa puas Anda dengan layanan Sapa Pedestrian Ponorogo?
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Bintang ── */}
            <div className="text-center">
              <div
                className="inline-flex items-center gap-1.5 sm:gap-2"
                role="radiogroup"
                aria-label="Penilaian kepuasan"
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={rating === v}
                    aria-label={`${v} bintang — ${LABELS[v]}`}
                    onClick={() => { setRating(v); setError(null); }}
                    onMouseEnter={() => setHover(v)}
                    onFocus={() => setHover(v)}
                    className="p-1 rounded-lg transition-transform duration-150 hover:scale-110
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Star
                      className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-150 ${
                        v <= active
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <p className="mt-3 h-5 text-sm font-bold text-slate-700 dark:text-slate-300">
                {active ? LABELS[active] : 'Pilih jumlah bintang'}
              </p>
            </div>

            {/* ── Identitas (opsional) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rating-nama" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <input
                  id="rating-nama"
                  type="text"
                  maxLength={120}
                  placeholder="Nama Anda"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700
                             rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400
                             outline-none text-slate-800 dark:text-slate-200 transition-colors
                             placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rating-pekerjaan" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pekerjaan <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <input
                  id="rating-pekerjaan"
                  type="text"
                  maxLength={120}
                  placeholder="Pekerjaan Anda"
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700
                             rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400
                             outline-none text-slate-800 dark:text-slate-200 transition-colors
                             placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* ── Komentar ── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rating-saran" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                Masukan <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <textarea
                id="rating-saran"
                rows={3}
                maxLength={2000}
                placeholder="Ada yang perlu kami perbaiki atau tingkatkan?"
                value={saran}
                onChange={(e) => setSaran(e.target.value)}
                className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700
                           rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400
                           outline-none text-slate-800 dark:text-slate-200 transition-colors resize-y
                           placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !rating}
              className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                         bg-blue-600 text-white dark:bg-blue-500 dark:text-white text-sm font-bold
                         hover:bg-blue-700 dark:hover:bg-blue-400
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                         disabled:opacity-45 disabled:pointer-events-none transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Mengirim…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" /> Kirim Penilaian
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}