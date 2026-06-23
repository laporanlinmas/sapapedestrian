'use client';

import { useState } from 'react';
import { MonitorPlay, Maximize2, Play } from 'lucide-react';
import FullscreenViewer from './FullscreenViewer';

const CCTV_URL = import.meta.env.VITE_CCTV_URL || 'https://gasta.ponorogo.go.id/';

export default function CCTVSection() {
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handlePlay = () => {
    setExpanded(true);
    setPlaying(true);
  };

  return (
    <section id="cctv" className="scroll-mt-32 reveal">

      <FullscreenViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        src={CCTV_URL}
        title="Pemantauan CCTV Kawasan Pedestrian"
      />

      {/* Header */}
      <div className="mb-6 relative pl-3">
        <div className="absolute -left-4 top-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full" />
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
          Pantauan CCTV & Wifi Gratis Kawasan Pedestrian
        </h2>
      </div>

      {/* Card */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-xl">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Pantauan Realtime Pedestrian</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="sm:hidden">Titik CCTV & Wifi Gratis</span>
                <span className="hidden sm:inline">Titik CCTV & Wifi Gratis Kawasan Pedestrian Ponorogo</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-2 text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 py-2 px-3.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Layar Penuh</span>
          </button>
        </div>

        {/* Thumbnail / Player — compact on mobile, expand on click */}
        <div
          className="relative w-full overflow-hidden transition-all duration-500 ease-in-out"
          style={{ height: expanded ? '600px' : undefined }}
          // eslint-disable-next-line react/no-unknown-property
        >
          <div className={`sm:h-[600px] ${expanded ? 'h-[600px]' : 'h-48'} transition-all duration-500 ease-in-out relative`}>
            {!playing ? (
              <button
                onClick={handlePlay}
                className="absolute inset-0 w-full h-full group overflow-hidden"
              >
                <img src="/assets/cctv.jpg" alt="Preview CCTV" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3 group-hover:bg-black/40 transition-colors">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/25 border-2 border-blue-400/70 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white translate-x-0.5" />
                  </div>
                  <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide drop-shadow">Klik untuk membuka pantauan CCTV</p>
                </div>
              </button>
            ) : (
              <iframe
                src={CCTV_URL}
                className="w-full h-full border-0"
                title="CCTV Pedestrian Ponorogo"
                allowFullScreen
              />
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
