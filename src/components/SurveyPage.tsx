import React, { useEffect } from 'react';
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
      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 dark:bg-blue-600/[0.08] blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-400/10 dark:bg-purple-600/[0.08] blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-amber-300/10 dark:bg-amber-600/[0.06] blur-3xl animate-blob animation-delay-4000" />
      </div>

      <Header isSurveyPage={true} onBack={onBack} />

      <main id="main-content" className="max-w-7xl mx-auto px-2 sm:px-6 pt-24 pb-12" tabIndex={-1}>
        <SurveySection />
      </main>

      <Footer />
    </div>
  );
}
