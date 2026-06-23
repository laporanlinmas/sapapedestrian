'use client';

import React, { useState, useEffect } from 'react';

interface SurveyQuestion {
  key: string;
  label: string;
  description: string;
}

const QUESTIONS: SurveyQuestion[] = [
  {
    key: 'kemudahan',
    label: 'Kemudahan Sistem',
    description: 'Seberapa mudah Anda menggunakan dan menavigasi portal Sapa Pedestrian?',
  },
  {
    key: 'kegunaan',
    label: 'Kemanfaatan / Kegunaan',
    description: 'Seberapa membantu informasi CCTV, peta kerawanan, dan chatbot bagi Anda?',
  },
  {
    key: 'kecepatan',
    label: 'Kecepatan Respon',
    description: 'Seberapa cepat dan lancar portal merespon navigasi serta pemuatan data?',
  },
  {
    key: 'keakuratan',
    label: 'Keakuratan Informasi',
    description: 'Seberapa akurat dan relevan data laporan serta monitoring yang ditampilkan?',
  },
  {
    key: 'rekomendasi',
    label: 'Rekomendasi Layanan',
    description: 'Seberapa besar keinginan Anda merekomendasikan layanan ini ke warga lain?',
  },
];

export default function SurveySection() {
  const [nama, setNama] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredRatings, setHoveredRatings] = useState<Record<string, number>>({});
  const [saran, setSaran] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('sapapedestrian_survey_done') === 'true') {
      setSubmitted(true);
    }
  }, []);

  const handleStarClick = (questionKey: string, ratingValue: number) => {
    setRatings((prev) => ({ ...prev, [questionKey]: ratingValue }));
    setError(null);
  };

  const handleStarHover = (questionKey: string, ratingValue: number) => {
    setHoveredRatings((prev) => ({ ...prev, [questionKey]: ratingValue }));
  };

  const handleStarLeave = (questionKey: string) => {
    setHoveredRatings((prev) => ({ ...prev, [questionKey]: 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim() || !pekerjaan.trim()) {
      setError('Nama dan pekerjaan wajib diisi.');
      return;
    }

    // Validate that all questions are answered
    const unanswered = QUESTIONS.filter((q) => !ratings[q.key]);
    if (unanswered.length > 0) {
      setError(`Mohon berikan rating untuk semua pertanyaan (${unanswered.length} tersisa).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama,
          pekerjaan,
          ...ratings,
          saran,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Terjadi kesalahan sistem.');
      }

      localStorage.setItem('sapapedestrian_survey_done', 'true');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim survei. Coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="survei" className="scroll-mt-32 pt-4">
        <div className="max-w-3xl mx-auto text-center p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Terima Kasih atas Partisipasi Anda!</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Tanggapan Anda telah disimpan. Umpan balik Anda sangat berharga bagi kami untuk terus meningkatkan kualitas layanan dan keamanan pedestrian Ponorogo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="survei" className="scroll-mt-32 pt-4">
      <div className="flex items-center gap-4 mb-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.439.817-.439.99 0l3 6 .013.013.013.013a1 1 0 0 1-.74 1.34l-6.4 1a1 1 0 0 1-1.34-.74c-.03-.272.06-.547.248-.756L11 8.5v-5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Evaluasi Layanan</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />
          
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Survei Kepuasan Pengguna</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Bantu kami meningkatkan kualitas layanan Sapa Pedestrian dengan mengisi kuisioner penilaian singkat di bawah ini.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identitas Responden */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nama-survey" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  id="nama-survey"
                  type="text"
                  placeholder="Masukkan nama Anda..."
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300 transition-all placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pekerjaan-survey" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Pekerjaan <span className="text-red-500">*</span>
                </label>
                <input
                  id="pekerjaan-survey"
                  type="text"
                  placeholder="Masukkan pekerjaan Anda..."
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300 transition-all placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
              {QUESTIONS.map((question, index) => {
                const currentRating = ratings[question.key] || 0;
                const hoverRating = hoveredRatings[question.key] || 0;
                const activeStars = hoverRating || currentRating;

                return (
                  <div
                    key={question.key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 ${
                      index === 0 ? '' : 'pt-5'
                    }`}
                  >
                    <div className="max-w-lg">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{question.label}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mt-0.5">{question.description}</p>
                    </div>

                    <div 
                      className="flex items-center gap-1.5 self-start sm:self-center"
                      onMouseLeave={() => handleStarLeave(question.key)}
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleStarClick(question.key, val)}
                          onMouseEnter={() => handleStarHover(question.key, val)}
                          className="p-1 focus:outline-none transition-transform hover:scale-125 duration-150 cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={val <= activeStars ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className={`w-7 h-7 ${
                              val <= activeStars
                                ? 'text-amber-450 dark:text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            } transition-colors`}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499c.173-.439.817-.439.99 0l3 6 .013.013.013.013a1 1 0 0 1-.74 1.34l-6.4 1a1 1 0 0 1-1.34-.74c-.03-.272.06-.547.248-.756L11 8.5v-5Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Saran & Masukan */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <label htmlFor="saran-survey" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Saran & Masukan Tambahan (Opsional)
              </label>
              <textarea
                id="saran-survey"
                rows={3}
                placeholder="Tuliskan kritik, saran, atau masukan untuk perbaikan layanan di sini..."
                value={saran}
                onChange={(e) => setSaran(e.target.value)}
                className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-100 transition-all placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Submit */}
            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-fit px-5 py-2 rounded-lg text-white font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-[1.02] shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="truncate">Mengirim...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-4.5 sm:h-4.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                    Kirim Evaluasi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
