import React from 'react';
import { MonitorPlay, Map, MessageCircle, Info, ChevronRight } from 'lucide-react';

export default function Hero() {
  const actionCards = [
    { 
      id: '#cctv',      
      Icon: MonitorPlay,   
      title: 'CCTV Realtime',   
      desc: 'Pantauan langsung',
      color: 'text-blue-600 dark:text-blue-400',       
      bg: 'bg-blue-50/70 dark:bg-blue-900/20',
      border: 'border-blue-200/60 dark:border-blue-800/50',
      glow: 'group-hover:shadow-blue-500/20'
    },
    { 
      id: '#peta',      
      Icon: Map,           
      title: 'Peta Kerawanan',  
      desc: 'Zonasi wilayah',
      color: 'text-indigo-600 dark:text-indigo-400',   
      bg: 'bg-indigo-50/70 dark:bg-indigo-900/20',
      border: 'border-indigo-200/60 dark:border-indigo-800/50',
      glow: 'group-hover:shadow-indigo-500/20'
    },
    { 
      id: '#pengaduan', 
      Icon: MessageCircle, 
      title: 'Aduan & Laporan', 
      desc: 'Respon cepat',
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-50/70 dark:bg-emerald-900/20',
      border: 'border-emerald-200/60 dark:border-emerald-800/50',
      glow: 'group-hover:shadow-emerald-500/20'
    },
    { 
      id: '#informasi', 
      Icon: Info,          
      title: 'Informasi',       
      desc: 'Pusat data terpadu',
      color: 'text-amber-600 dark:text-amber-400',     
      bg: 'bg-amber-50/70 dark:bg-amber-900/20',
      border: 'border-amber-200/60 dark:border-amber-800/50',
      glow: 'group-hover:shadow-amber-500/20'
    },
  ];

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="relative w-full min-h-[100vh] lg:min-h-[95vh] bg-slate-50 dark:bg-slate-950 flex items-center overflow-hidden font-sans">
      
      {/* --- Latar Belakang & Efek Dekoratif --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 dark:bg-blue-600/15 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/15 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] rounded-full bg-orange-500/[0.02] dark:bg-orange-500/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      {/* --- Latar Belakang Video Kanan --- */}
      <div
        aria-hidden="true"
        className="absolute z-10 pointer-events-none select-none top-0 right-0 w-full h-full flex justify-end items-center overflow-hidden"
      >
        <div className="relative w-[110%] sm:w-[115%] md:w-[95%] lg:w-[72%] xl:w-[68%] h-full flex items-center justify-end opacity-70 sm:opacity-45 lg:opacity-95 transition-opacity duration-1000 -translate-x-[8%] sm:translate-x-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto max-h-[95vh] object-contain scale-[1.18]"
            style={{
              clipPath: 'inset(0 8.5% 0 8.5%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            }}
          >
            <source src="/assets/video.webm" type="video/webm" />
            <source src="/assets/video.mov" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* --- Konten Utama Kiri --- */}
      <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 xl:col-span-7 flex flex-col justify-center text-center lg:text-left">
            
            {/* Teks Identitas Sistem (Menggantikan Badge Terpadu Aktif) */}
            <div className="flex items-center justify-center lg:justify-start px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm mb-8 mx-auto lg:mx-0 max-w-full w-max cursor-default">
              <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-[13px] font-black tracking-[0.1em] sm:tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 uppercase text-center leading-snug">
                Sistem Informasi Pedestrian & Aksi Satgas Linmas
              </span>
            </div>

            {/* Tipografi Utama Berjenjang */}
            <h1 className="flex flex-col gap-1 sm:gap-2 mb-8">
              {/* Sapa Pedestrian — satu baris */}
              <span className="text-[2.6rem] sm:text-5xl md:text-6xl lg:text-[5rem] xl:text-[6rem] font-extrabold tracking-tighter leading-[0.95] text-slate-900 dark:text-white drop-shadow-sm pb-1 sm:pb-2 whitespace-nowrap">
                Sapa <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-300">Pedestrian</span>
              </span>
              
              {/* Teks Bawah (Menengah) */}
              <span className="text-2xl sm:text-4xl lg:text-5xl text-slate-700 dark:text-slate-300 font-bold tracking-tight mt-1 sm:mt-2">
                Ponorogo
              </span>
            </h1>

            {/* Deskripsi */}
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed mb-3 mt-[45vw] sm:mt-0 mx-auto lg:mx-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-slate-700/50 rounded-2xl px-4 py-3">
              Platform komprehensif untuk pengawasan ruang publik. Dilengkapi dengan{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-semibold">CCTV real-time</strong>,{' '}
              analisis <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">zona kerawanan</strong>, 
              serta layanan respons cepat masyarakat.
            </p>

            {/* Kartu Navigasi / Aksi */}
            <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto lg:mx-0 relative z-30">
              {actionCards.map((card) => (
                <a
                  key={card.id}
                  href={card.id}
                  onClick={(e) => { e.preventDefault(); scrollTo(card.id); }}
                  className="group flex flex-col items-center justify-center gap-1 px-1 py-2 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-slate-700/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 h-[60px] sm:h-auto"
                >
                  <div className={`flex-shrink-0 p-1 sm:p-1.5 rounded-full ${card.bg}`}>
                    <card.Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${card.color}`} />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-800 dark:text-white text-center leading-tight">
                    {card.title}
                  </span>
                </a>
              ))}
            </div>


          </div>
        </div>
      </div>

      {/* --- Transisi Gradasi Bawah Seamless --- */}
      {/* Untuk mode terang */}
      <div 
        aria-hidden="true"
        className="dark:hidden absolute bottom-0 left-0 w-full h-48 sm:h-64 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(248, 250, 252, 0.5) 55%, rgba(248, 250, 252, 1) 100%)' }}
      />
      {/* Untuk mode gelap */}
      <div 
        aria-hidden="true"
        className="hidden dark:block absolute bottom-0 left-0 w-full h-48 sm:h-64 z-10 pointer-events-none bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950"
      />
    </header>
  );
}
