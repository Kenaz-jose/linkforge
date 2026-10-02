import React, { useState, useRef, useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { getCuratedTopics, generatePOVOptions, startInterview } from '../services/api';

const CATEGORIES = [
  "AI & Deep Learning", 
  "Quantum Mechanics", 
  "Evolutionary Biology", 
  "Productivity & Deep Work", 
  "World Affairs"
];

const TONES = [
  "Direct & Technical",
  "Conversational & Casual",
  "Sharp & Bold",
  "Witty & Sarcastic",
  "Academic & Analytical"
];

export const TopicPage = () => {
  const { setTopic, tone, setTone, setPhase, setGeneratedOptions, setQuestions } = useWorkflow();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [curatedArticles, setCuratedArticles] = useState([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);
  const [curatedError, setCuratedError] = useState(null);
  const [manualTopic, setManualTopic] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const textareaRef = useRef(null);

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setIsLoadingCurated(true);
    setCuratedError(null);
    try {
      const data = await getCuratedTopics(category);
      setCuratedArticles(data.articles || []);
    } catch (err) {
      setCuratedError("Could not fetch trending news right now. Try another category or enter manually.");
    } finally {
      setIsLoadingCurated(false);
    }
  };

  const handleStartInterview = async (selectedTopic) => {
    if (!selectedTopic.trim()) {
      setStartError("Please enter a topic or select a news article above.");
      return;
    }

    setStartError(null);
    setIsStarting(true);

    const trimmedTopic = selectedTopic.trim();
    setTopic(trimmedTopic);
    
    try {
      const [povData, questionData] = await Promise.all([
        generatePOVOptions(trimmedTopic),
        startInterview(trimmedTopic, tone)
      ]);

      setGeneratedOptions({
          opinion: Array.isArray(povData?.opinion) ? povData.opinion : [],
          experience: Array.isArray(povData?.experience) ? povData.experience : [],
          message: Array.isArray(povData?.message) ? povData.message : [],
          audience: Array.isArray(povData?.audience) ? povData.audience : [],
      });

      if (questionData && Array.isArray(questionData.questions)) {
        setQuestions(questionData.questions);
      } else {
        setQuestions([]);
      }
      
      setPhase('interview');
    } catch (err) {
      console.error(err);
      setStartError("Could not start interview. Please try again.");
      setIsStarting(false);
    }
  };

  const handleTextareaChange = (e) => {
    setManualTopic(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto pt-10 md:pt-20">
      
      {/* HERO */}
      <div className="text-center mb-10 w-full">
        <h2 className="text-[32px] md:text-[40px] font-editorial text-ink tracking-tight mb-3">
          What are you thinking about?
        </h2>
        <p className="text-[15px] md:text-[17px] text-ink-secondary">
          Turn an idea into a perspective worth sharing.
        </p>
      </div>
      
      {/* MAIN COMPOSER */}
      <div className="w-full bg-surface rounded-card border border-border p-2 focus-within:border-ink/30 focus-within:ring-2 focus-within:ring-ink/10 transition-all shadow-quiet relative group">
         
         <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={manualTopic}
              onChange={handleTextareaChange}
              className="w-full min-h-[60px] max-h-[300px] font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink-muted/70 resize-none focus:outline-none bg-transparent custom-scrollbar leading-relaxed"
              placeholder="Start with a thought, a tension, or a useful detail..."
            />
         </div>

         <div className="flex items-center justify-between px-2 pb-1 pt-3 border-t border-border/40 mt-1">
            
            {/* TONE SELECTOR */}
            <div className="relative">
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="appearance-none bg-surface-muted hover:bg-border/60 text-[13px] text-ink-secondary font-medium px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink/20 pr-8 transition-colors max-w-[200px] md:max-w-[350px] truncate"
              >
                 {TONES.map(t => (
                    <option key={t} value={t} className="bg-surface text-ink">{t}</option>
                 ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <button 
              onClick={() => handleStartInterview(manualTopic)}
              disabled={isStarting || !manualTopic.trim()}
              className="bg-graphite text-surface font-sans font-semibold text-[13px] py-2 px-5 rounded-full hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isStarting ? (
                <svg className="animate-spin h-4 w-4 text-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Start"}
            </button>
         </div>
      </div>

      {startError && (
        <div className="bg-error/10 text-error p-3 rounded-control mt-4 text-[13px] border border-error/30 font-medium w-full text-center">
          {startError}
        </div>
      )}

      {/* INSPIRATION */}
      <div className="w-full mt-12 flex flex-col items-start">
        <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider mb-6 ml-4">Need inspiration?</p>
        
        <div className="w-full overflow-x-auto custom-scrollbar pb-2 px-2 flex md:justify-center">
          <div className="flex gap-2 mx-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border text-[13px] font-medium transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-selected border-selected text-ink' 
                    : 'bg-surface border-border hover:bg-surface-muted text-ink-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* CURATED RESULTS */}
        <div className="w-full mt-6">
          {isLoadingCurated && (
            <div className="text-info flex justify-center items-center text-[13px] font-medium">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-info/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Curating trending topics...
            </div>
          )}

          {curatedError && (
            <div className="bg-error/10 text-error p-4 rounded-control text-[13px] text-center border border-error/30 font-medium">
              {curatedError}
            </div>
          )}

          {!isLoadingCurated && selectedCategory && curatedArticles.length > 0 && (
            <div className="gap-12">
              {curatedArticles.map((article, idx) => (
                <div key={idx} className="border border-border rounded-card p-4 shadow-quiet bg-surface hover:bg-surface-muted transition-colors group flex flex-col mb-6">
                  <h4 className="text-[14px] font-semibold mb-2 text-ink leading-snug">{article.headline}</h4>
                  <p className="text-ink-secondary mb-4 text-[13px] leading-relaxed line-clamp-2 flex-grow">{article.summary}</p>
                  <button 
                    onClick={() => handleStartInterview(`${article.headline}: ${article.summary}`)}
                    disabled={isStarting}
                    className="text-graphite font-semibold text-[13px] group-hover:underline disabled:opacity-50 disabled:no-underline text-left mt-auto"
                  >
                    Write about this →
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoadingCurated && selectedCategory && curatedArticles.length === 0 && !curatedError && (
            <p className="text-ink-secondary text-[13px] text-center">No articles found for this category right now.</p>
          )}
        </div>
      </div>
    </div>
  );
};
