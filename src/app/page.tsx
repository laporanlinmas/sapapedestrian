'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { MessageCircle, PenLine, Star } from 'lucide-react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SectionLabel from '@/components/SectionLabel';
import MonitoringSection from '@/components/MonitoringSection';
import ComplaintSection from '@/components/ComplaintSection';
import VideoSection from '@/components/VideoSection';
import InfoSection from '@/components/InfoSection';
import Footer from '@/components/Footer';
import FaqSection from '@/components/FaqSection';
import GallerySection from '@/components/GallerySection';

import ProgramModal from '@/components/ProgramModal';
import JadwalModal from '@/components/JadwalModal';
const ChatbotUnified = lazy(() => import('@/components/ChatbotUnified'));
const AduanPanel     = lazy(() => import('@/components/AduanPanel'));
const VisitorCounter = lazy(() => import('@/components/VisitorCounter'));
const SurveyPage     = lazy(() => import('@/components/SurveyPage'));
const WebViewScreen  = lazy(() => import('@/components/WebViewScreen'));
const GalleryPage    = lazy(() => import('@/components/GalleryPage'));

/**
 * Tunda mounting komponen berat sampai browser menganggur.
 * VisitorCounter menarik paket firebase/firestore (~485 KB); menundanya membuat
 * halaman utama selesai dimuat jauh lebih cepat tanpa mengorbankan fiturnya.
 */
function useIdleMount(timeoutMs = 2500): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as any;
    let handle: number;
    if (typeof w.requestIdleCallback === 'function') {
      handle = w.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(handle);
    }
    handle = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(handle);
  }, [timeoutMs]);
  return ready;
}

type Route = 'home' | 'rating' | 'cctv' | 'mymaps' | 'galeri';

/** Placeholder selagi modul web view diunduh (chunk kecil, hampir instan). */
function WebViewFallback({ title }: { title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      <div className="flex h-11 shrink-0 items-center gap-2 bg-blue-700 px-2 text-white dark:bg-slate-800 sm:h-12 sm:px-3">
        <span className="h-7 w-16 rounded-lg bg-white/15" />
        <span className="h-4 w-px shrink-0 bg-white/25" />
        <span className="h-6 w-6 shrink-0 rounded-md bg-white/15" />
        <span className="text-[13px] font-extrabold tracking-tight">{title}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-800 dark:border-t-blue-400" />
      </div>
    </div>
  );
}

function SurveyPageFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <div className="page-backdrop" aria-hidden="true" />
      <Header isSurveyPage onBack={onBack} />
      <main
        className="mx-auto max-w-7xl px-3 pb-12 pt-24 sm:px-6"
        role="status"
        aria-label="Memuat halaman penilaian"
        aria-busy="true"
      >
        <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-9 motion-reduce:animate-none">
          <div className="mx-auto mb-2 h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-800 sm:h-7" />
          <div className="mx-auto mb-7 h-4 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="mb-7 flex justify-center gap-2" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 sm:h-11 sm:w-11" />
            ))}
          </div>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
            <span className="h-[68px] rounded-xl bg-slate-100 dark:bg-slate-800" />
            <span className="h-[68px] rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="mb-6 h-28 rounded-xl bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
          <div className="mx-auto h-11 w-44 rounded-lg bg-blue-100 dark:bg-blue-950/60" aria-hidden="true" />
        </div>
      </main>
    </div>
  );
}

function ChatbotFallback({ opened, onOpen }: { opened: boolean; onOpen: () => void }) {
  if (!opened) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Buka Chatbot SIPEDAS"
        className="fixed bottom-5 right-5 z-[1000] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[1001] flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(680px,92vh)] sm:w-[400px] sm:rounded-2xl" role="status" aria-label="Memuat chatbot" aria-busy="true">
      <div className="flex h-[72px] shrink-0 items-center gap-3 bg-blue-700 px-5 pt-[env(safe-area-inset-top)] sm:pt-0">
        <span className="h-10 w-10 animate-pulse rounded-xl bg-white/20" />
        <span className="space-y-2"><span className="block h-3 w-32 animate-pulse rounded bg-white/30" /><span className="block h-2 w-40 animate-pulse rounded bg-white/20" /></span>
      </div>
      <div className="min-h-0 flex-1 space-y-5 bg-slate-50 p-5 dark:bg-slate-900">
        <span className="block h-14 w-3/4 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        <span className="ml-auto block h-12 w-2/3 animate-pulse rounded-2xl bg-blue-100 dark:bg-blue-950/60" />
      </div>
      <div className="h-[72px] shrink-0 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
    </div>
  );
}

function AduanPanelFallback() {
  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/55 sm:bg-transparent" role="status" aria-label="Memuat formulir aduan" aria-busy="true">
      <div className="fixed bottom-0 right-0 z-[1000] flex min-h-[480px] max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-6 sm:right-6 sm:min-h-[520px] sm:max-h-[min(680px,92vh)] sm:rounded-2xl">
        <div className="h-1 shrink-0 bg-gradient-to-r from-orange-400 to-red-500" />
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-300 px-3 py-2.5 dark:border-slate-800 sm:px-5 sm:py-3">
          <div className="flex gap-1.5">
            <span className="h-8 w-28 animate-pulse rounded-full bg-orange-200 dark:bg-orange-950/70" />
            <span className="h-8 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
          <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4 sm:p-5">
          <span className="block h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <span className="block h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <span className="block h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <span className="block h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="shrink-0 border-t border-slate-300 p-4 dark:border-slate-800 sm:px-5">
          <span className="block h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

const PATH: Record<Route, string> = {
  home: '/',
  rating: '/rating',
  cctv: '/cctv',
  mymaps: '/mymaps',
  galeri: '/galeri',
};

const ROUTE_BY_PATH: Record<string, Route> = {
  '/': 'home',
  '/rating': 'rating',
  '/survey': 'rating', // tautan lama
  '/cctv': 'cctv',
  '/mymaps': 'mymaps',
  '/galeri': 'galeri',
  '/gallery': 'galeri', // tautan lama
};

const CCTV_URL = import.meta.env.VITE_CCTV_URL || 'https://sipedasview.vercel.app/';
const MAP_URL  = import.meta.env.VITE_MYMAPS_EMBED_URL || '';

function routeFromPath(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return ROUTE_BY_PATH[clean] ?? 'home';
}

export default function HomePage() {
  const [activeModal,    setActiveModal]    = useState<string | null>(null);
  const [chatbotOpen,    setChatbotOpen]    = useState(false);
  const [aduanOpen,      setAduanOpen]      = useState(false);
  const chatbotReady                    = useIdleMount(1200);
  const visitorReady                     = useIdleMount();

  const openChatbot = () => { setActiveModal(null); setAduanOpen(false); setChatbotOpen(true); };
  const openAduan   = () => { setActiveModal(null); setChatbotOpen(false); setAduanOpen(true); };

  // Routing sederhana: / · /survey · /cctv · /mymaps
  const [page, setPage] = useState<Route>(() =>
    typeof window === 'undefined' ? 'home' : routeFromPath(window.location.pathname),
  );

  useEffect(() => {
    const onPopState = () => setPage(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const siteOrigin = import.meta.env.VITE_SITE_URL || window.location.origin;
    const canonicalUrl = new URL(PATH[page], siteOrigin).href;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const openGraphUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (canonical) canonical.href = canonicalUrl;
    if (openGraphUrl) openGraphUrl.content = canonicalUrl;
  }, [page]);

  const navigateTo = (p: Route) => {
    if (p === page) return;
    window.history.pushState({ sipedas: p }, '', PATH[p]);
    setPage(p);
    window.scrollTo({ top: 0 });
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

  const open  = (id: string) => {
    setChatbotOpen(false);
    setAduanOpen(false);
    setActiveModal(id);
  };
  const close = useCallback(() => setActiveModal(null), []);

  if (page === 'rating') {
    return (
      <Suspense fallback={<SurveyPageFallback onBack={() => navigateTo('home')} />}>
        <SurveyPage onBack={() => navigateTo('home')} />
      </Suspense>
    );
  }

  if (page === 'galeri') {
    return (
      <Suspense fallback={null}>
        <GalleryPage onBack={() => navigateTo('home')} />
      </Suspense>
    );
  }

  // Halaman monitor (web view penuh)
  if (page === 'cctv' || page === 'mymaps') {
    const isCctv = page === 'cctv';
    return (
      <Suspense fallback={<WebViewFallback title={isCctv ? 'SIPEDAS VIEW' : 'Peta Kerawanan'} />}>
        <WebViewScreen
          src={isCctv ? CCTV_URL : MAP_URL}
          title={isCctv ? 'SIPEDAS VIEW' : 'Peta Kerawanan'}
          syncTheme={isCctv}
          onBack={() => navigateTo('home')}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 overflow-x-hidden">

      {/* Latar lembut — radial-gradient statis (tanpa filter blur per-frame) */}
      <div className="page-backdrop" aria-hidden />

      <Header />
      <Hero />

      <main id="main-content" className="max-w-7xl mx-auto px-2 sm:px-6 pt-4 pb-10 sm:pt-6 sm:pb-12">
        {/* ── Layanan Pemantauan: SIPEDAS VIEW + Peta Kerawanan ── */}
        <MonitoringSection
          onOpenCctv={() => navigateTo('cctv')}
          onOpenMap={() => navigateTo('mymaps')}
        />

        <ComplaintSection
          onOpenChatbot={openChatbot}
          onOpenAduan={openAduan}
        />
        <GallerySection onOpenPage={() => navigateTo('galeri')} />
        <InfoSection onOpenModal={open} />
        <VideoSection />

        {/* Rating — CTA */}
        <section id="rating" className="scroll-mt-32 pt-10 sm:pt-12 reveal">
          <SectionLabel className="mb-7 sm:mb-8">Rating Layanan</SectionLabel>

          <div className="max-w-3xl mx-auto text-center p-5 sm:p-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl">
            {/* Mobile: horizontal layout */}
            <div className="flex items-center gap-4 sm:block">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-amber-100 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center sm:mx-auto sm:mb-5 border border-amber-200 dark:border-amber-900">
                <Star className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="flex-1 sm:block text-left sm:text-center">
                <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 dark:text-white sm:mb-2">
                  Berikan Rating Layanan
                </h3>
                <p className="hidden sm:block text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed sm:mb-6">
                  Bantu kami meningkatkan kualitas layanan Sapa Pedestrian dengan penilaian bintang Anda.
                </p>
                <p className="sm:hidden text-xs text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
                  Berikan penilaian bintang layanan Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('rating')}
                aria-label="Buka Rating"
                className="sm:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('rating')}
              className="hidden sm:inline-flex items-center gap-2.5 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 cursor-pointer"
            >
              <PenLine className="w-4 h-4" />
              Beri Rating
            </button>
          </div>
        </section>

        {/* FAQ */}
        <FaqSection />
      </main>

      {/* Statistik Pengunjung — dimuat saat browser menganggur */}
      {visitorReady
        ? <Suspense fallback={null}><VisitorCounter /></Suspense>
        : <div className="h-[46px] bg-white dark:bg-slate-900 border-t border-b border-slate-300 dark:border-slate-700" aria-hidden="true" />}
      <Footer />

      {/* Modals informasi */}
      <ProgramModal isOpen={activeModal === 'programModal'} onClose={close} />
      <JadwalModal isOpen={activeModal === 'jadwalModal'} onClose={close} />

      {/* ── Chatbot Terpadu ── */}
      {(chatbotReady || chatbotOpen) && (
        <Suspense fallback={<ChatbotFallback opened={chatbotOpen} onOpen={() => setChatbotOpen(true)} />}>
          <ChatbotUnified
            opened={chatbotOpen}
            onToggle={(o: boolean) => {
              setChatbotOpen(o);
              if (o) { setAduanOpen(false); setActiveModal(null); }
            }}
            onOpenResource={(resource) => { setChatbotOpen(false); navigateTo(resource); }}
            onOpenModal={(modal) => { setChatbotOpen(false); setAduanOpen(false); open(modal); }}
            onOpenAduan={openAduan}
            launcherHidden={activeModal !== null}
          />
        </Suspense>
      )}

      {/* ── Form Aduan Panel ── */}
      {aduanOpen && (
        <Suspense fallback={<AduanPanelFallback />}>
          <AduanPanel opened onClose={() => setAduanOpen(false)} />
        </Suspense>
      )}

    </div>
  );
}
