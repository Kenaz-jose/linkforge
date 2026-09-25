import React, { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { getCuratedTopics } from '../services/api';

const CATEGORIES = [
  "AI & Deep Learning", 
  "Quantum Mechanics", 
  "Evolutionary Biology", 
  "Productivity & Deep Work", 
  "World Affairs"
];

const TONES = [
  "Direct, punchy, and technical (like a senior engineer)",
  "Conversational, casual, and highly relatable (story-driven)",
  "Sharp, contrarian, and bold (challenging conventional wisdom)",
  "Witty, sarcastic, and funny (uses dry humor and developer self-deprecation without losing technical accuracy)",
  "Academic, measured, and deeply analytical"
];

export const TopicPage = () => {
  const { setTopic, tone, setTone, setPhase } = useWorkflow();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [curatedArticles, setCuratedArticles] = useState([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);
  const [curatedError, setCuratedError] = useState(null);
  const [manualTopic, setManualTopic] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);

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

  const handleStartInterview = (selectedTopic) => {
    if (!selectedTopic.trim()) {
      setStartError("Please enter a topic or select a news article above.");
      return;
    }

    setStartError(null);
    setIsStarting(true);

    setTopic(selectedTopic.trim());
    setPhase('interview');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 w-full">
      {/* PRIMARY WRITING COLUMN */}
      <div className="flex-1 max-w-3xl">
        <p className="text-metadata text-ink-muted mb-3">Step 1 / The Idea</p>
        <h2 className="text-hero mb-5 text-ink">What should we<br/>write about?</h2>
        <p className="text-[15px] text-ink-secondary mb-10">Bring a point of view. We'll shape the rest.</p>
        
        {/* INSPIRATION BLOCK MOVED HERE */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-metadata text-ink-muted">Inspiration</h3>
            <span className="text-[10px] text-ink-muted tracking-widest uppercase px-2 py-0.5 rounded-full border border-border">Optional</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-4 py-2 rounded-pill border text-[13px] font-medium transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-selected border-selected text-ink' 
                    : 'bg-transparent border-border hover:bg-surface-muted text-ink-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoadingCurated && (
            <div className="text-info flex items-center text-[13px] font-medium">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-info/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Curating trending topics...
            </div>
          )}

          {curatedError && (
            <div className="bg-error/10 text-error p-4 rounded-control text-[13px] leading-relaxed border border-error/30 font-medium">
              {curatedError}
            </div>
          )}

          {!isLoadingCurated && selectedCategory && curatedArticles.length > 0 && (
            <div className="space-y-3">
              {curatedArticles.map((article, idx) => (
                <div key={idx} className="border border-border rounded-card p-4 shadow-quiet bg-surface hover:bg-surface-muted transition-colors group">
                  <h4 className="text-[14px] font-semibold mb-1 text-ink leading-snug">{article.headline}</h4>
                  <p className="text-ink-secondary mb-3 text-[13px] leading-relaxed line-clamp-3">{article.summary}</p>
                  <button 
                    onClick={() => handleStartInterview(`${article.headline}: ${article.summary}`)}
                    disabled={isStarting}
                    className="text-graphite font-semibold text-[13px] group-hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    Write about this →
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoadingCurated && selectedCategory && curatedArticles.length === 0 && !curatedError && (
            <p className="text-ink-secondary text-[13px]">No articles found for this category right now.</p>
          )}
        </div>

        <div className="relative mb-6 bg-surface rounded-card shadow-quiet border border-border p-5 focus-within:border-ink/30 focus-within:ring-1 focus-within:ring-ink/10 transition-all">
          <textarea 
            value={manualTopic}
            onChange={(e) => setManualTopic(e.target.value)}
            maxLength={1300}
            placeholder="Start with a thought, a tension, or a useful detail..."
            className="w-full h-[160px] font-sans text-[16px] text-ink placeholder:text-ink-muted resize-none focus:outline-none bg-transparent custom-scrollbar"
          ></textarea>
          <div className="absolute bottom-4 right-5 text-[12px] text-ink-muted pointer-events-none">
             {manualTopic.length} / 1,300
          </div>
        </div>

        {startError && (
          <div className="bg-error/10 text-error p-4 rounded-control mb-6 text-[14px] border border-error/30 font-medium">
            {startError}
          </div>
        )}

        <button 
          onClick={() => handleStartInterview(manualTopic)}
          disabled={isStarting}
          className="w-full bg-graphite text-surface font-sans font-semibold text-[14px] py-3.5 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
        >
          {isStarting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Getting your interview ready...
            </>
          ) : (
            "Start interview"
          )}
        </button>

        <div className="flex flex-wrap gap-8 text-metadata text-ink-muted mt-12 pt-6 border-t border-border/50">
           <p>Private Draft</p>
           <p>Autosave On — LinkForge / 2026</p>
        </div>
      </div>

      {/* SECONDARY RAIL */}
      <div className="w-full lg:w-[340px] flex flex-col gap-12">
        <div className="hidden lg:block pt-12">
          <p className="text-metadata text-ink-muted mb-1">A QUIET SPACE FOR</p>
          <p className="text-metadata text-ink-muted">BETTER FIRST DRAFTS.</p>
        </div>

        <div>
          <p className="text-metadata text-ink-muted mb-4">Voice Direction</p>
          <div className="flex flex-col gap-3">
             {TONES.map(t => (
                <label key={t} className={`flex items-start gap-3 p-4 rounded-option border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ink/20 focus-within:outline-none ${tone === t ? 'bg-selected border-selected' : 'bg-transparent border-border hover:bg-surface-muted'}`}>
                   <input type="radio" name="tone" value={t} checked={tone === t} onChange={(e) => setTone(e.target.value)} className="sr-only" />
                   <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${tone === t ? 'border-graphite bg-graphite' : 'border-ink-muted'}`}>
                      {tone === t && <div className="w-1.5 h-1.5 bg-surface rounded-full"></div>}
                   </div>
                   <p className="text-[13px] font-medium text-ink leading-snug">{t}</p>
                </label>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

