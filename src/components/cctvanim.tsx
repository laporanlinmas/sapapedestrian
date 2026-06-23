import React, { useState, useEffect } from 'react';

interface CCTVAnimProps {
  cctvUrl: string;
  cameraName: string;
  channelId: string;
}

export default function CCTVAnim({ cctvUrl, cameraName, channelId }: CCTVAnimProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Update real-time timestamp for the camera HUD overlay
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      setCurrentTime(`${dateStr}  ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // When hover is lost, reset loading state so next hover loads fresh
  useEffect(() => {
    if (!isHovered) {
      setIsIframeLoaded(false);
    }
  }, [isHovered]);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-full bg-[#080b10] overflow-hidden flex items-center justify-center select-none"
      style={{ minHeight: '320px' }}
    >
      {/* Dynamic Keyframes Injection (to keep component self-contained and easy to compile) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline-move {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes rotate-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotate-counter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes glitch-effect {
          0%, 100% { opacity: 0.15; }
          45% { opacity: 0.22; }
          50% { opacity: 0.1; }
          55% { opacity: 0.25; }
          95% { opacity: 0.12; }
        }
        .animate-scanline {
          animation: scanline-move 8s linear infinite;
        }
        .animate-hud-outer {
          animation: rotate-clockwise 15s linear infinite;
        }
        .animate-hud-inner {
          animation: rotate-counter 10s linear infinite;
        }
        .animate-glitch {
          animation: glitch-effect 4s linear infinite;
        }
        .bg-radar-sweep {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(0, 0, 0, 0) 75%);
        }
      `}} />

      {/* 1. Live Feed (Loaded on Hover) */}
      {isHovered && (
        <div className="absolute inset-0 w-full h-full z-10 transition-all duration-700 ease-in-out">
          <iframe 
            src={cctvUrl}
            className={`w-full h-full border-0 bg-[#080b10] transition-opacity duration-700 ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            title={cameraName}
            allowFullScreen
            loading="lazy"
            onLoad={() => setIsIframeLoaded(true)}
          />
          {!isIframeLoaded && (
            <div className="absolute inset-0 bg-[#080b10]/95 z-20 flex flex-col items-center justify-center gap-3">
              <span className="w-9 h-9 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <div className="flex flex-col items-center text-center font-mono">
                <span className="text-[10px] tracking-[0.2em] font-bold text-emerald-400 animate-pulse">CONNECTING SECURE CHANNEL...</span>
                <span className="text-[8px] text-slate-500 mt-1 uppercase">Loading GASTA Live Feed</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CCTV Animation Overlay (Runs automatically, shown when not hovered or as loading background) */}
      <div className={`absolute inset-0 z-0 flex flex-col justify-between p-4 transition-opacity duration-500 ${isHovered && isIframeLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Top Info Overlay */}
        <div className="flex justify-between items-start text-emerald-400 font-mono text-[10px] sm:text-xs z-10">
          <div className="flex flex-col gap-0.5">
            <span className="font-extrabold tracking-wider text-slate-100 uppercase">{cameraName}</span>
            <span className="text-emerald-500/70 text-[9px] uppercase tracking-widest">
              SYS_MONITOR // CH-{channelId}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-md shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-bold tracking-widest text-[9px] text-red-400 uppercase">REC</span>
          </div>
        </div>

        {/* Scanline & Glitch Background Effects */}
        <div className="absolute inset-0 bg-radar-sweep pointer-events-none z-0" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Animated horizontal scanline */}
          <div className="absolute w-full h-[120px] bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent top-0 animate-scanline" />
          {/* Static noise overlay */}
          <div className="absolute inset-0 opacity-[0.03] animate-glitch" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        </div>

        {/* Center Target Scanning HUD */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Outer HUD ring */}
            <div className="absolute w-full h-full border border-emerald-500/15 rounded-full border-dashed animate-hud-outer" />
            
            {/* Inner HUD brackets */}
            <div className="absolute w-36 h-36 border border-emerald-500/10 rounded-full animate-hud-inner">
              <div className="absolute w-2 h-2 border-t border-l border-emerald-400/50 top-1/4 left-1/4" />
              <div className="absolute w-2 h-2 border-t border-r border-emerald-400/50 top-1/4 right-1/4" />
              <div className="absolute w-2 h-2 border-b border-l border-emerald-400/50 bottom-1/4 left-1/4" />
              <div className="absolute w-2 h-2 border-b border-r border-emerald-400/50 bottom-1/4 right-1/4" />
            </div>

            {/* Scanning Reticle corner brackets */}
            <div className="absolute w-28 h-28">
              <div className="absolute w-4 h-4 border-t-2 border-l-2 border-emerald-500/40 top-0 left-0" />
              <div className="absolute w-4 h-4 border-t-2 border-r-2 border-emerald-500/40 top-0 right-0" />
              <div className="absolute w-4 h-4 border-b-2 border-l-2 border-emerald-500/40 bottom-0 left-0" />
              <div className="absolute w-4 h-4 border-b-2 border-r-2 border-emerald-500/40 bottom-0 right-0" />
            </div>

            {/* Scanning status */}
            <div className="absolute flex flex-col items-center gap-2 text-center font-mono">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-emerald-500/20 animate-pulse">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
              </svg>
              <div className="flex flex-col">
                <span className="text-[8px] tracking-[0.3em] font-extrabold text-emerald-400/80 uppercase">AUTOSCAN_ACTIVE</span>
                <span className="text-[7px] text-slate-500 mt-0.5 tracking-wider">HOVER TO INITIALIZE LIVE LINK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom HUD Metadata */}
        <div className="flex justify-between items-end text-emerald-500/70 font-mono text-[8px] sm:text-[9px] z-10 mt-auto pt-6 border-t border-emerald-950/20">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SIGNAL: EXCELLENT (98%)</span>
          </div>
          <div>{currentTime}</div>
          <div className="flex items-center gap-1.5 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/10">
            <span>RESOL:</span>
            <span className="font-bold text-slate-200">1080P_HD</span>
          </div>
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-emerald-500/20" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-emerald-500/20" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-emerald-500/20" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-emerald-500/20" />
    </div>
  );
}
