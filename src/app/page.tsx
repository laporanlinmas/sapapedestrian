'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { MessageCircle, FileText, PenLine } from 'lucide-react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import CCTVSection from '@/components/CCTVSection';
import MapSection from '@/components/MapSection';
import ComplaintSection from '@/components/ComplaintSection';
import VideoSection from '@/components/VideoSection';
import InfoSection from '@/components/InfoSection';
import Footer from '@/components/Footer';

const ProgramModal   = lazy(() => import('@/components/ProgramModal'));
const JadwalModal    = lazy(() => import('@/components/JadwalModal'));
const ChatbotUnified = lazy(() => import('@/components/ChatbotUnified'));
const AduanPanel     = lazy(() => import('@/components/AduanPanel'));
const VisitorCounter = lazy(() => import('@/components/VisitorCounter'));
const SurveyPage     = lazy(() => import('@/components/SurveyPage'));

export default function HomePage() {
  const [activeModal,    setActiveModal]    = useState<string | null>(null);
  const [chatbotOpen,    setChatbotOpen]    = useState(false);
  const [aduanOpen,      setAduanOpen]      = useState(false);

  const openChatbot = () => { setAduanOpen(false); setChatbotOpen(true); };
  const openAduan   = () => { setChatbotOpen(false); setAduanOpen(true); };

  // Simple state-based routing
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/survey' ? 'survey' : 'home';
    }
    return 'home';
  });

  useEffect(() => {
    const onPopState = () => {
      setPage(window.location.pathname === '/survey' ? 'survey' : 'home');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (p: 'home' | 'survey') => {
    window.history.pushState({}, '', p === 'survey' ? '/survey' : '/');
    setPage(p);
  };

  // Scroll-reveal
  useEffect(() => {
    if (page !== 'home') return;
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('active'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [page]);

  const open  = (id: string) => setActiveModal(id);
  const close = () => setActiveModal(null);

  if (page === 'survey') {
    return (
      <Suspense fallback={null}>
        <SurveyPage onBack={() => navigateTo('home')} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 overflow-x-hidden">

      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 dark:bg-blue-600/[0.08] blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-400/10 dark:bg-purple-600/[0.08] blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-amber-300/10 dark:bg-amber-600/[0.06] blur-3xl animate-blob animation-delay-4000" />
      </div>

      <Header />
      <Hero />

      <main id="main-content" className="max-w-7xl mx-auto px-2 sm:px-6 py-8 space-y-12">
        <CCTVSection />
        <MapSection />
        <ComplaintSection
          onOpenChatbot={openChatbot}
          onOpenAduan={openAduan}
        />
        <VideoSection />

        <InfoSection onOpenModal={open} />

        {/* Evaluasi — Survey CTA */}
        <section id="survei" className="scroll-mt-32 pt-16 reveal">
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Evaluasi Layanan</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
          </div>

          <div className="max-w-3xl mx-auto text-center sm:text-center p-4 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            {/* Mobile: horizontal layout */}
            <div className="flex items-center gap-4 sm:block">
              <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-blue-100 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center sm:mx-auto sm:mb-6 border border-blue-200 dark:border-blue-900 shadow-sm">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="flex-1 sm:block text-left sm:text-center">
                <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 dark:text-white sm:mb-3">Survei Kepuasan Masyarakat</h3>
                <p className="hidden sm:block text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed mb-8">
                  Bantu kami meningkatkan kualitas layanan Sapa Pedestrian dengan memberikan penilaian Anda.
                </p>
                <p className="sm:hidden text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  Berikan penilaian layanan Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('survey')}
                className="sm:hidden shrink-0 flex items-center justify-center w-10 h-10 rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('survey')}
              className="hidden sm:inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <PenLine className="w-4 h-4" />
              Mulai Isi Survei
            </button>
          </div>
        </section>

        {/* Statistik Pengunjung */}
      </main>

      <Suspense fallback={null}><VisitorCounter /></Suspense>
      <Footer />

      {/* Modals informasi */}
      <Suspense fallback={null}>
        <ProgramModal isOpen={activeModal === 'programModal'} onClose={close} />
        <JadwalModal  isOpen={activeModal === 'jadwalModal'}  onClose={close} />
      </Suspense>

      {/* ── Chatbot Terpadu ── */}
      <Suspense fallback={null}>
        <ChatbotUnified opened={chatbotOpen} onToggle={(o: boolean) => { setChatbotOpen(o); if (o) setAduanOpen(false); }} />
      </Suspense>

      {/* ── Form Aduan Panel ── */}
      <Suspense fallback={null}>
        <AduanPanel opened={aduanOpen} onClose={() => setAduanOpen(false)} />
      </Suspense>

    </div>
  );
}
