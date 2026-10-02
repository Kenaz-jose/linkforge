import React, { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { fetchLiveContext } from '../services/api';

export const BriefPage = () => {
  const { brief, topic, setPhase, setThreadId, selectedReferences, setSelectedReferences } = useWorkflow();
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  const [rawSearchResults, setRawSearchResults] = useState(null);
  const [contextError, setContextError] = useState(null);
  const [isReturning, setIsReturning] = useState(false);
  
  if (!brief) return null;

  const gaps = [];
  if (!brief.evidence || brief.evidence.length === 0) gaps.push("first-hand experience");
  if (!brief.thesis || brief.thesis.split(' ').length < 5) gaps.push("a clear position");
  if (!brief.details || brief.details.length === 0) gaps.push("concrete specifics (numbers, tools, timeframes)");
  if (!brief.takeaway) gaps.push("a reader takeaway");

  const hasNoEvidence = !brief.evidence || brief.evidence.length === 0;

  const handleFetchContext = async () => {
    if (rawSearchResults) return;
    setIsFetchingContext(true);
    setContextError(null);
    try {
      const results = await fetchLiveContext(topic, brief.thesis || '');
      setRawSearchResults(results);
    } catch (err) {
      setContextError("Failed to fetch live context.");
    } finally {
      setIsFetchingContext(false);
    }
  };

  const toggleReference = (ref) => {
    setSelectedReferences(prev => {
      const exists = prev.find(p => p.url === ref.url);
      if (exists) return prev.filter(p => p.url !== ref.url);
      return [...prev, ref];
    });
  };

  const handleWritePost = () => {
    const newThreadId = crypto.randomUUID();
    setThreadId(newThreadId);
    setPhase('review');
  };

  return (
    <div className="max-w-3xl mx-auto pt-2 pb-6 md:pt-4 md:pb-10 w-full">
      
      {/* HEADER SECTION */}
      <div className="mb-8">
        <h2 className="font-editorial text-[32px] md:text-[42px] leading-tight tracking-tight text-ink mb-5">Your narrative blueprint</h2>
        <div className="border-b border-border pb-4">
          <p className="text-[14px] md:text-[15px] text-ink-secondary font-sans leading-relaxed">
            {topic}
          </p>
        </div>
      </div>

      {/* MAIN BRIEF CARD */}
      <div className="bg-surface border border-border rounded-card p-6 md:p-10 shadow-quiet mb-12">
        
        {/* Thesis */}
        <div className="mb-8">
          <p className="text-metadata text-ink-muted mb-4">Thesis</p>
          <div className="border-l-2 border-ink pl-5 py-1">
            <h3 className="font-editorial text-[26px] md:text-[30px] text-ink leading-[1.2]">
              {brief.thesis || <span className="italic text-ink-secondary">No clear position captured.</span>}
            </h3>
          </div>
        </div>

        <hr className="border-border/30 my-8" />

        {/* Evidence & Experience */}
        <div className="mb-8">
          <p className="text-metadata text-ink-muted mb-4">Evidence & Experience</p>
          {brief.evidence && brief.evidence.length > 0 ? (
            <ul className="space-y-4">
              {brief.evidence.map((item, i) => (
                 <li key={i} className="flex items-start gap-4 text-[15px] text-ink-secondary leading-relaxed">
                   <span className="text-ink-muted/50 text-[18px] leading-none mt-[2px]">•</span>
                   <span>{item}</span>
                 </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-muted italic">Nothing captured. The post will have no first-hand material to draw on.</p>
          )}
        </div>

        {/* Details & Specifics */}
        {brief.details && brief.details.length > 0 && (
          <>
            <hr className="border-border/30 my-8" />
            <div className="mb-8">
              <p className="text-metadata text-ink-muted mb-4">Details & Specifics</p>
              <ul className="space-y-4">
                {brief.details.map((item, i) => (
                   <li key={i} className="flex items-start gap-4 text-[15px] text-ink-secondary leading-relaxed">
                     <span className="text-ink-muted/50 text-[18px] leading-none mt-[2px]">•</span>
                     <span>{item}</span>
                   </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <hr className="border-border/30 my-8" />

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-metadata text-ink-muted mb-3">Written for</p>
            <p className="text-[14px] text-ink-secondary">{brief.audience || "Professionals on LinkedIn"}</p>
          </div>
          <div>
            <p className="text-metadata text-ink-muted mb-3">The Takeaway</p>
            <p className="text-[14px] text-ink-secondary">{brief.takeaway || <span className="italic text-ink-muted">Nothing specific captured</span>}</p>
          </div>
        </div>
      </div>

      {/* WARNINGS & ALERTS */}
      {hasNoEvidence && (
        <div className="bg-error/10 text-error p-6 md:p-8 rounded-card mb-12 border border-error/30 shadow-sm">
          <strong className="block mb-4 text-[15px] font-semibold">This brief has no first-hand experience.</strong>
          <p className="text-[14px] leading-relaxed mb-4 text-error/90">The writer would have nothing to draw on and would invent specifics, which the faithfulness check then rejects. That cycle costs several minutes and produces a post you cannot publish.</p>
          <p className="text-[14px] leading-relaxed text-error/90">Go back and answer at least one question with something that actually happened — a project, a decision, a thing that broke.</p>
        </div>
      )}

      {!hasNoEvidence && gaps.length > 0 && (
        <div className="bg-warning/10 text-warning/90 p-6 md:p-8 rounded-card mb-12 border border-warning/30 shadow-sm">
          <p className="text-[14px] font-medium mb-4 text-warning">The brief is usable, but these would strengthen it:</p>
          <ul className="space-y-3">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-center gap-4 text-[13px]">
                 <span className="w-1.5 h-1.5 rounded-full bg-warning/50"></span>
                 {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* OPTIONAL CONTEXT SECTION */}
      <div className="mb-12">
        <p className="text-metadata text-ink-muted mb-2">Supporting Evidence</p>
        <p className="text-[14px] text-ink-secondary mb-6">A few current sources that may help strengthen the post.</p>
        
        {!rawSearchResults && (
          <label className="flex items-center justify-between p-5 rounded-card border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ink/20 focus-within:outline-none bg-surface border-border hover:bg-surface-muted group">
            <input 
              type="checkbox" 
              className="sr-only"
              onChange={(e) => e.target.checked && handleFetchContext()}
              disabled={isFetchingContext}
            />
            <div className="flex items-center gap-4">
              <svg className="w-5 h-5 text-ink-muted group-hover:text-ink transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[14px] font-medium text-ink">Search the web for current data supporting your thesis</span>
            </div>
            
            <div className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors border relative ${
              isFetchingContext 
                ? 'bg-ink border-ink' 
                : 'bg-surface-muted border-border group-hover:border-ink/40'
            }`}>
              <div className={`w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${
                isFetchingContext 
                  ? 'translate-x-5 bg-surface' 
                  : 'bg-ink-muted'
              }`}></div>
            </div>
          </label>
        )}

        {isFetchingContext && (
          <div className="flex items-center text-info p-5 border border-info/30 rounded-card bg-info/10 text-[13px] mt-6 font-medium">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-info/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Finding relevant context...
          </div>
        )}

        {contextError && (
          <div className="bg-error/10 text-error p-4 rounded-control text-[13px] mt-6 border border-error/30 font-medium">
            {contextError}
          </div>
        )}

        {rawSearchResults && rawSearchResults.length > 0 && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-secondary font-medium mb-4">Select the facts you want to explicitly include in your draft:</p>
            {rawSearchResults.map((ref, i) => {
              const isSelected = selectedReferences.some(p => p.url === ref.url);
              return (
                <label key={i} className={`flex items-start gap-4 p-5 rounded-card border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ink/20 focus-within:outline-none ${isSelected ? 'bg-selected border-selected' : 'bg-surface border-border hover:bg-surface-muted'}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => toggleReference(ref)}
                  />
                  <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-graphite bg-graphite' : 'border-ink-muted'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[14px] text-ink mb-1">{ref.title}</p>
                    <p className="text-[13px] text-ink-secondary leading-relaxed mb-2">{ref.snippet}</p>
                    <a href={ref.url} target="_blank" rel="noreferrer" className="text-[11px] uppercase tracking-widest font-medium text-ink-muted hover:text-ink transition-colors" onClick={(e) => e.stopPropagation()}>Source Link ↗</a>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {rawSearchResults && rawSearchResults.length === 0 && (
          <div className="bg-warning/10 text-warning p-4 rounded-control text-[13px] mt-6 border border-warning/30 font-medium">
            No relevant live data found right now.
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col-reverse sm:flex-row gap-4 border-t border-border pt-8">
        <button
          onClick={() => {
            setIsReturning(true);
            Promise.resolve().then(() => setPhase('interview'));
          }}
          disabled={isReturning}
          className="w-full sm:w-1/3 bg-transparent text-ink-secondary font-sans font-semibold text-[14px] py-3.5 px-6 rounded-button border border-border hover:bg-surface-muted transition-all disabled:opacity-50 flex justify-center items-center"
        >
          {isReturning ? 'Returning...' : 'Back to answers'}
        </button>
        <button
          onClick={handleWritePost}
          disabled={hasNoEvidence}
          className="w-full sm:w-2/3 bg-ink text-surface font-sans font-semibold text-[14px] py-3.5 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-md transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-sm"
        >
          Write the post
        </button>
      </div>
    </div>
  );
};