'use client';

import { useState } from 'react';
import { TriangleAlert, Maximize2, MapPin } from 'lucide-react';
import FullscreenViewer from './FullscreenViewer';

export default function MapSection() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleOpen = () => {
    setExpanded(true);
    setMapLoaded(true);
  };

  return (
    <section id="peta" className="scroll-mt-32 reveal">

      <FullscreenViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        src={import.meta.env.VITE_MYMAPS_EMBED_URL || ''}
        title="Peta Kerawanan Pedestrian Ponorogo"
      />

      {/* ── Header ── */}
      <div className="mb-8 relative pl-3">
        <div className="absolute -left-4 top-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
          Peta Kerawanan Pedestrian
        </h2>
      </div>

      {/* ── Card peta ── */}
      <div className="glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-orange-400/40 dark:hover:border-orange-600/40 transition-all duration-300 hover:shadow-2xl group bg-white/80 dark:bg-slate-800/80 relative">

        {/* Shimmer hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/[0.04] to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl z-10" />

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">Peta Kerawanan Pedestrian</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Titik rawan &amp; kejadian terpetakan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <button
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-2 text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 text-slate-700 dark:text-slate-200 py-2 px-3.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Layar Penuh</span>
            </button>
          </div>
        </div>

        {/* ── Iframe peta ── */}
        <div className={`relative w-full overflow-hidden bg-slate-900 sm:h-[600px] transition-all duration-500 ease-in-out ${expanded ? 'h-[600px]' : 'h-48'}`}>
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 z-20 rounded-tl-lg m-3 opacity-70 pointer-events-none" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 z-20 rounded-tr-lg m-3 opacity-70 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 z-20 rounded-bl-lg m-3 opacity-70 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 z-20 rounded-br-lg m-3 opacity-70 pointer-events-none" />

          {!mapLoaded ? (
            <button
              onClick={handleOpen}
              className="absolute inset-0 w-full h-full group overflow-hidden z-10"
            >
              <img src="/assets/kerawanan.jpg" alt="Preview Peta Kerawanan" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center gap-3 group-hover:bg-black/35 transition-colors">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500/25 border-2 border-orange-400/70 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                  <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide drop-shadow">Klik untuk membuka peta kerawanan</p>
              </div>
            </button>
          ) : (
            <iframe
              src={import.meta.env.VITE_MYMAPS_EMBED_URL || ''}
              className="absolute top-[-55px] left-0 w-full border-0"
              style={{ height: 'calc(100% + 55px)' }}
              title="Peta Kerawanan Pedestrian Ponorogo"
              allowFullScreen
            />
          )}
        </div>

      </div>

    </section>
  );
}
