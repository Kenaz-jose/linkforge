import React, { useState, useEffect } from 'react';
import { useWorkflow } from './context/WorkflowContext';
import { TopicPage } from './pages/TopicPage';
import { InterviewPage } from './pages/InterviewPage';
import { ProbePage } from './pages/ProbePage';
import { BriefPage } from './pages/BriefPage';
import { ReviewPage } from './pages/ReviewPage';
import { ResultPage } from './pages/ResultPage';

import icon from './assets/icon.png';

function AppContent() {
  const { phase } = useWorkflow();
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('linkedinforge-theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('linkedinforge-theme', theme);
    } catch {}
  }, [theme]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleTheme = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    document.body.classList.add('theme-blur-in');
    
    setTimeout(() => {
      setTheme(t => t === 'dark' ? 'light' : 'dark');
      document.body.classList.remove('theme-blur-in');
      document.body.classList.add('theme-blur-out');
      
      setTimeout(() => {
        document.body.classList.remove('theme-blur-out');
        setIsTransitioning(false);
      }, 250);
    }, 150);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Header */}
      <header className="h-[76px] flex items-center justify-between px-6 md:px-10 max-w-[1320px] w-full mx-auto">
        <div className="flex items-center gap-3">
          <img src={icon} alt="LinkForge Logo" className="w-7 h-7 object-contain" />
          <div className="font-editorial text-[24px] md:text-[28px] tracking-tight text-ink font-semibold">LinkForge</div>
        </div>
        <button 
          onClick={toggleTheme}
          disabled={isTransitioning}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-full hover:bg-surface-muted transition-colors border border-transparent hover:border-border text-ink-secondary hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {theme === 'dark' ? (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Content Container */}
      <main className="flex-grow w-full max-w-[1320px] mx-auto px-6 md:px-10 pt-[56px] lg:pt-[80px] pb-24">
        {phase === 'topic' && <TopicPage />}
        {phase === 'interview' && <InterviewPage />}
        {phase === 'probe' && <ProbePage />}
        {phase === 'brief' && <BriefPage />}
        {phase === 'review' && <ReviewPage />}
        {phase === 'result' && <ResultPage />}
      </main>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
