import { useEffect } from 'react';
import Header from './Header';
import SurveySection from './SurveySection';
import Footer from './Footer';

interface SurveyPageProps {
  onBack: () => void;
}

export default function SurveyPage({ onBack }: SurveyPageProps) {
  // Scroll to top on page mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 overflow-x-hidden">
      {/* Latar lembut — radial-gradient statis (tanpa filter blur per-frame) */}
      <div className="page-backdrop" aria-hidden />

      <Header isSurveyPage={true} onBack={onBack} />

      <main id="main-content" className="max-w-7xl mx-auto px-2 sm:px-6 pt-24 pb-12" tabIndex={-1}>
        <SurveySection />
      </main>

      <Footer />
    </div>
  );
}
