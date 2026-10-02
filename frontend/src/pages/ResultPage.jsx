import React, { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

export const ResultPage = () => {
  const { graphState, brief, resetWorkflow } = useWorkflow();
  const [activeTab, setActiveTab] = useState('post'); // post, brief, eval, scores

  if (!graphState) return null;

  const result = graphState;
  const evaluation = result.evaluation || {};
  const verdict = result.verdict || {};
  const decision = result.decision || null;

  const passesFaithfulness = verdict.passes_faithfulness;
  
  const winningPost = result.best_post || result.post || '';
  const paragraphs = winningPost.split('\n\n');
  const originalHook = paragraphs.length > 0 ? paragraphs[0] : '';
  const postBody = paragraphs.length > 1 ? paragraphs.slice(1).join('\n\n') : '';

  const altHooks = result.best_alternative_hooks || result.alternative_hooks || [];
  const [selectedHook, setSelectedHook] = useState(originalHook);

  const finalDisplayText = postBody ? `${selectedHook}\n\n${postBody}` : selectedHook;

  return (
    <div className="max-w-3xl mx-auto py-10 md:py-16 w-full">
      <div className="mb-10">
        <h2 className="text-hero text-ink mb-5">Your post is ready</h2>
        
        {!passesFaithfulness && (
          <div className="bg-warning/10 border border-warning/30 text-warning/90 px-5 py-4 rounded-control text-[14px] leading-relaxed mb-4 shadow-sm font-medium">
            No draft passed the faithfulness check. This post contains material not supported by your brief — review every specific claim before publishing.
          </div>
        )}
        {decision && (
          <p className="text-[14px] text-ink-secondary bg-surface-muted p-4 rounded-card border border-border">
            Stopped because: {decision.reason}
          </p>
        )}
      </div>

      {/* TABS */}
      <div className="border-b border-border mb-10">
        <nav className="flex space-x-10">
          <button 
            onClick={() => setActiveTab('post')}
            className={`py-3 font-sans font-medium text-[13px] transition-colors border-b-[2px] ${activeTab === 'post' ? 'border-ink text-ink' : 'border-transparent text-ink-secondary hover:text-ink'}`}
          >
            Final Post
          </button>
          <button 
            onClick={() => setActiveTab('brief')}
            className={`py-3 font-sans font-medium text-[13px] transition-colors border-b-[2px] ${activeTab === 'brief' ? 'border-ink text-ink' : 'border-transparent text-ink-secondary hover:text-ink'}`}
          >
            Your Brief
          </button>
          <button 
            onClick={() => setActiveTab('eval')}
            className={`py-3 font-sans font-medium text-[13px] transition-colors border-b-[2px] ${activeTab === 'eval' ? 'border-ink text-ink' : 'border-transparent text-ink-secondary hover:text-ink'}`}
          >
            Evaluation
          </button>
        </nav>
      </div>

      {/* TAB CONTENTS */}
      <div className="mb-10">
        {activeTab === 'post' && (
          <div className="space-y-8">
            {altHooks.length > 0 && (
              <div className="bg-surface-muted p-6 rounded-card border border-border">
                <p className="text-[14px] font-semibold text-ink mb-4">Want a different opening? Swap the hook:</p>
                <div className="flex flex-col gap-3">
                  <label className={`flex items-start gap-4 p-4 rounded-card border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ink/20 focus-within:outline-none ${selectedHook === originalHook ? 'bg-selected border-selected' : 'bg-surface border-border hover:bg-surface-muted'}`}>
                    <input type="radio" name="hook" checked={selectedHook === originalHook} onChange={() => setSelectedHook(originalHook)} className="sr-only" />
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${selectedHook === originalHook ? 'border-graphite bg-graphite' : 'border-ink-muted'}`}>
                       {selectedHook === originalHook && <div className="w-1.5 h-1.5 bg-surface rounded-full"></div>}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-ink mb-1">Original</p>
                      <p className="text-[14px] text-ink-secondary leading-relaxed">{originalHook}</p>
                    </div>
                  </label>
                  {altHooks.map((h, i) => (
                    <label key={i} className={`flex items-start gap-4 p-4 rounded-card border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ink/20 focus-within:outline-none ${selectedHook === h.text ? 'bg-selected border-selected' : 'bg-surface border-border hover:bg-surface-muted'}`}>
                      <input type="radio" name="hook" checked={selectedHook === h.text} onChange={() => setSelectedHook(h.text)} className="sr-only" />
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${selectedHook === h.text ? 'border-graphite bg-graphite' : 'border-ink-muted'}`}>
                         {selectedHook === h.text && <div className="w-1.5 h-1.5 bg-surface rounded-full"></div>}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-ink mb-1">{h.angle}</p>
                        <p className="text-[14px] text-ink-secondary leading-relaxed">{h.text}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-surface border border-border rounded-card p-6 md:p-10 shadow-quiet">
              <textarea 
                className="w-full h-[550px] font-sans text-[16px] leading-[1.7] text-ink focus:outline-none focus:border-ink/20 resize-none bg-transparent transition-colors custom-scrollbar"
                readOnly
                value={finalDisplayText}
              />
            </div>
          </div>
        )}

        {activeTab === 'brief' && (
          <div className="bg-surface border border-border rounded-card p-6 md:p-10 shadow-quiet">
            <div className="mb-10">
              <p className="text-metadata text-ink-muted mb-3">Thesis</p>
              <h3 className="font-editorial text-[26px] md:text-[30px] text-ink leading-[1.2]">
                {brief?.thesis || <span className="italic text-ink-secondary">No clear position captured.</span>}
              </h3>
            </div>

            <div className="mb-10">
              <p className="text-metadata text-ink-muted mb-3">Evidence</p>
              {brief?.evidence && brief.evidence.length > 0 ? (
                <ul className="space-y-3">
                  {brief.evidence.map((item, i) => (
                     <li key={i} className="flex items-start gap-4 text-[15px] text-ink-secondary leading-relaxed">
                       <span className="text-ink-muted/50 mt-1.5">•</span>
                       <span>{item}</span>
                     </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[15px] text-ink-muted italic">Nothing captured.</p>
              )}
            </div>

            {brief?.details && brief.details.length > 0 && (
              <div>
                <p className="text-metadata text-ink-muted mb-3">Details</p>
                <ul className="space-y-3">
                  {brief.details.map((item, i) => (
                     <li key={i} className="flex items-start gap-4 text-[15px] text-ink-secondary leading-relaxed">
                       <span className="text-ink-muted/50 mt-1.5">•</span>
                       <span>{item}</span>
                     </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'eval' && (
          <div className="space-y-12">
            {evaluation.unsupported_claims && evaluation.unsupported_claims.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 p-6 md:p-8 rounded-card shadow-sm">
                <p className="text-[14px] font-semibold text-warning mb-4">Claims Not Supported by Your Brief</p>
                <ul className="space-y-3">
                   {evaluation.unsupported_claims.map((claim, idx) => (
                      <li key={idx} className="text-[13px] text-warning/90 leading-relaxed flex items-start gap-3"><span className="opacity-50 mt-1">•</span><span>{claim}</span></li>
                   ))}
                </ul>
              </div>
            )}

            {evaluation.scores && Object.keys(evaluation.scores).length > 0 && (
              <div>
                <p className="text-metadata text-ink-muted mb-6 border-b border-border pb-4">Score Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(evaluation.scores).map(([metric, data]) => {
                    const scoreValue = data?.score || 0;
                    return (
                      <div key={metric} className="bg-surface border border-border rounded-card p-6 shadow-quiet">
                        <div className="flex justify-between items-end mb-4">
                          <span className="font-semibold capitalize text-ink text-[14px]">{metric}</span>
                          <span className="text-[13px] font-medium text-ink-secondary">{scoreValue}/10</span>
                        </div>
                        <p className="text-[13px] text-ink-secondary leading-relaxed">{data?.observation || ''}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div>
                <p className="text-metadata text-ink-muted mb-6 border-b border-border pb-4">Strengths</p>
                <ul className="space-y-3">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-ink-secondary leading-relaxed">
                      <span className="text-ink-muted/50 mt-1">•</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
              <div>
                <p className="text-metadata text-ink-muted mb-6 border-b border-border pb-4">Areas to Improve</p>
                <ul className="space-y-3">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-ink-secondary leading-relaxed">
                      <span className="text-ink-muted/50 mt-1">•</span><span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.improvement_opportunities && evaluation.improvement_opportunities.length > 0 && (
              <div>
                <p className="text-metadata text-ink-muted mb-6 border-b border-border pb-4">Improvement Opportunities</p>
                <div className="space-y-4">
                  {evaluation.improvement_opportunities.map((opp, i) => (
                    <div key={i} className="bg-surface-muted border border-border rounded-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-widest bg-surface border border-border px-2 py-1 rounded">
                          {opp.category || 'General'}
                        </span>
                        {opp.priority && (
                          <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                            opp.priority.toLowerCase() === 'high' ? 'bg-error/10 text-error border-error/30' : 
                            opp.priority.toLowerCase() === 'medium' ? 'bg-warning/10 text-warning border-warning/30' : 
                            'bg-surface text-ink-secondary border-border'
                          }`}>
                            {opp.priority} Priority
                          </span>
                        )}
                      </div>
                      {opp.reason && <p className="text-[13px] text-ink-secondary mb-2"><strong>Reason:</strong> {opp.reason}</p>}
                      {opp.recommendation && <p className="text-[13px] text-ink-secondary"><strong>Recommendation:</strong> {opp.recommendation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-16 pt-10 border-t border-border flex justify-center">
        <button 
          onClick={resetWorkflow}
          className="w-full sm:w-auto bg-graphite text-surface font-sans font-semibold text-[14px] py-3.5 px-8 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all shadow-quiet"
        >
          Write another post
        </button>
      </div>
    </div>
  );
};

