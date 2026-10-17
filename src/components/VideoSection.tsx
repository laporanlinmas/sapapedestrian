'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, ShieldCheck, Footprints, TreePine, MapPin } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';

const VIDEO_URL = import.meta.env.VITE_VIDEO_URL || '';

const FEATURES = [
  { Icon: ShieldCheck, label: 'Pemantauan CCTV real-time'                          },
  { Icon: Footprints,  label: 'Kanal aduan masyarakat'                             },
  { Icon: MapPin,      label: 'Pemetaan titik kerawanan pedestrian'                },
  { Icon: TreePine,    label: 'Pelaporan digital aksi Satgas Linmas'               },
] as const;

export default function VideoSection() {
  const [loaded, setLoaded] = useState(false);
  /**
   * Embed Cloudinary menarik JS player-nya sendiri (±1,5 detik). Embed baru
   * dipasang ketika bagian ini mendekati viewport, sehingga tidak menahan
   * render awal halaman.
   */
  const [mountEmbed, setMountEmbed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setMountEmbed(true); return; }
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { setMountEmbed(true); io.disconnect(); } }),
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="video" ref={sectionRef} className="scroll-mt-32 pt-10 sm:pt-12 reveal">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionLabel className="mb-10 sm:mb-12">Profil Program</SectionLabel>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Kolom Kiri: Penjelasan ── */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-5">
              Sapa{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                Pedestrian
              </span>{' '}
              Ponorogo
            </h2>

            <p className="text-slate-600 dark:text-slate-400 text-base lg:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Sapa Pedestrian hadir sebagai inovasi pelayanan publik Kabupaten Ponorogo untuk menyapa dan memberikan pelayanan pelindungan masyarakat demi terciptanya kawasan pedestrian yang aman, tertib, dan nyaman.
            </p>

            <ul className="space-y-3.5 text-left max-w-md mx-auto lg:mx-0">
              {FEATURES.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60 transition-colors duration-300">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">{label}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Kolom Kanan: Video Player ── */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[320px] xl:max-w-[360px]">

              {/* Bingkai video: tepi tegas, tanpa glow tebal dan tanpa animasi
                  berputar — jauh lebih murah untuk dirender. */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-slate-300 dark:ring-slate-700 shadow-[0_10px_30px_-12px_rgba(15,23,42,.45)] dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,.7)] flex flex-col">

                {/* ── Titlebar ── */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-white/10 shrink-0">
                  <span className="flex-1 min-w-0 text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="truncate">Profil Satgas Linmas Pedestrian</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 text-[10px] font-bold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    HD
                  </span>
                </div>

                {/* Portrait Player 9:16 */}
                <div className="relative w-full bg-slate-950" style={{ paddingBottom: '177.78%' }}>
                  {!loaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 z-20">
                      <div className="w-12 h-12 rounded-full border-4 border-red-600/30 border-t-red-600 animate-spin" />
                      <span className="text-slate-400 text-xs font-medium">Memuat Video...</span>
                    </div>
                  )}

                  {mountEmbed && (
                    <iframe
                      src={VIDEO_URL}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title="Profil Kawasan Pedestrian Ponorogo"
                      onLoad={() => setLoaded(true)}
                    />
                  )}
                </div>

                {/* ── Footer bar ── */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-white/5 shrink-0">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    Kawasan Pedestrian, Kab. Ponorogo
                  </span>
                  <span className="text-[10px] text-slate-600 font-semibold">&copy; 2026</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
