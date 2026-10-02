import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { buildBriefFromPOV } from '../services/api';

const POV_SECTIONS = [
  {
    key: 'opinion',
    title: 'What do you think?',
    description: 'Choose the statements that best describe your point of view, then add your own words if you want.',
    placeholder: 'Add your own opinion, nuance, disagreement, or explanation...',
  },
  {
    key: 'experience',
    title: 'What have you experienced?',
    description: 'These suggestions are based on things you have shared previously. Select what genuinely matches you, then add your own details.',
    placeholder: 'Add your own experience, project, problem, observation, or specific detail...',
    memoryBased: true,
  },
  {
    key: 'message',
    title: 'What should the reader take away?',
    description: 'Choose what you want people to think, learn, or do after reading.',
    placeholder: 'Add the takeaway in your own words...',
  },
  {
    key: 'audience',
    title: 'Who is this for?',
    description: 'Choose the people you want this post to speak to, and add anyone specific you have in mind.',
    placeholder: 'Describe your target audience or a specific group...',
  },
];

export const InterviewPage = () => {
  const {
    topic,
    tone,
    setBrief,
    setBriefId,
    setPhase,
    questions,
    generatedOptions,
  } = useWorkflow();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Gap analysis state
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  // Per-question state for categories and custom text
  const [questionState, setQuestionState] = useState({});

  // Initialize question state once questions are loaded
  useEffect(() => {
    if (questions && questions.length > 0 && Object.keys(questionState).length === 0) {
      const initialState = {};
      questions.forEach(q => {
        initialState[q.id] = {
          selectedCategories: [],
          customVisible: false,
          customText: ''
        };
      });
      setQuestionState(initialState);
    }
  }, [questions]);

  const toggleCategory = (qId, categoryKey) => {
    setQuestionState(prev => {
      const qState = prev[qId] || { selectedCategories: [], customVisible: false, customText: '' };
      const cats = qState.selectedCategories;
      const newCats = cats.includes(categoryKey)
        ? cats.filter(c => c !== categoryKey)
        : [...cats, categoryKey];
      return { ...prev, [qId]: { ...qState, selectedCategories: newCats } };
    });
    setGapAnalysis(null);
    setFollowUpAnswer('');
    setError(null);
  };

  const toggleCustomVisible = (qId) => {
    setQuestionState(prev => {
      const qState = prev[qId] || { selectedCategories: [], customVisible: false, customText: '' };
      return { ...prev, [qId]: { ...qState, customVisible: !qState.customVisible } };
    });
  };

  const updateCustomText = (qId, text) => {
    setQuestionState(prev => {
      const qState = prev[qId] || { selectedCategories: [], customVisible: false, customText: '' };
      return { ...prev, [qId]: { ...qState, customText: text } };
    });
    setGapAnalysis(null);
    setFollowUpAnswer('');
    setError(null);
  };

  const getContributionCount = () => {
    let count = 0;
    Object.values(questionState).forEach(qState => {
      count += qState.selectedCategories.length;
      if (qState.customText.trim().length > 0) {
        count += 1;
      }
    });
    return count;
  };

  const hasPOVInput = () => {
    return getContributionCount() > 0;
  };

  const buildPayloadPOV = () => {
    const finalPov = {
      opinion: { selected: [], custom: '' },
      experience: { selected: [], custom: '' },
      message: { selected: [], custom: '' },
      audience: { selected: [], custom: '' }
    };

    if (!questions) return finalPov;

    questions.forEach(q => {
      const qState = questionState[q.id];
      if (!qState) return;
      
      const text = qState.customText.trim();
      
      if (text && qState.selectedCategories.length === 0) {
        // Fallback: Custom text entered but no category selected
        finalPov.opinion.custom += (finalPov.opinion.custom ? '\n\n' : '') + `A: ${text}`;
      } else {
        // Append to all selected categories
        qState.selectedCategories.forEach(catKey => {
          if (!finalPov[catKey].selected.includes(q.text)) {
             finalPov[catKey].selected.push(q.text);
          }
          if (text) {
            finalPov[catKey].custom += (finalPov[catKey].custom ? '\n\n' : '') + `A: ${text}`;
          }
        });
      }
    });
    return finalPov;
  };

  const handleSubmit = async () => {
    if (!hasPOVInput()) {
      setError('Choose at least one option or tell us something in your own words.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const povPayload = buildPayloadPOV();

    try {
      const gapResponse = await fetch('/api/pov/gap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          pov: povPayload,
        }),
      });

      if (!gapResponse.ok) {
        throw new Error('Failed to analyze POV');
      }

      const gapData = await gapResponse.json();
      const gap = gapData.gap;

      if (gap?.has_gap) {
        setGapAnalysis(gap);
        setIsSubmitting(false);
        return;
      }

      const data = await buildBriefFromPOV(topic, tone, povPayload);

      setBrief(data.brief);
      setBriefId(data.brief_id);
      setPhase('brief');
    } catch (err) {
      console.error(err);
      setError('We could not analyze your perspective right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpAnswer.trim()) {
      setError('Please answer the question before continuing.');
      return;
    }

    if (!gapAnalysis?.missing_area) {
      setError('Something went wrong with the follow-up question. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const missingArea = gapAnalysis.missing_area;
      const basePov = buildPayloadPOV();

      const existingCustom = basePov[missingArea].custom.trim();
      const newAnswer = `Follow-up Answer:\n${followUpAnswer.trim()}`;
      const finalCustom = existingCustom ? `${existingCustom}\n\n${newAnswer}` : newAnswer;

      const updatedPOV = {
        ...basePov,
        [missingArea]: {
          ...basePov[missingArea],
          custom: finalCustom,
        },
      };

      const data = await buildBriefFromPOV(topic, tone, updatedPOV);

      setBrief(data.brief);
      setBriefId(data.brief_id);
      setPhase('brief');
    } catch (err) {
      console.error(err);
      setError('Failed to create your perspective brief. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPossible = questions ? questions.length * 4 : 0;
  const contributionCount = getContributionCount();
  const progressPercentage = totalPossible > 0 ? Math.min((contributionCount / totalPossible) * 100, 100) : 0;

  
  return (
    <div className="max-w-4xl mx-auto py-6 md:py-10 w-full">
      
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="mb-12">
        <h2 className="text-hero text-ink mb-5">
          Let's find
          <br />
          your angle.
        </h2>
        <div className="border-b border-border pb-4">
          <p className="text-[13px] text-ink-secondary font-medium tracking-wide uppercase">
            {topic}
          </p>
        </div>
      </div>

      {/* =====================================================
          QUESTIONS DISPLAY
      ===================================================== */}
      {questions && questions.length > 0 ? (
        <div className="space-y-16 mb-16">
          {questions.map((q, idx) => {
            const qState = questionState[q.id] || { selectedCategories: [], customVisible: false, customText: '' };
            
            
  return (
              <div key={q.id} className="relative group">
                <span className="hidden md:block absolute -left-16 top-2 text-metadata text-ink-muted opacity-40">0{idx + 1}</span>
                <h3 className="font-editorial text-[28px] md:text-[36px] leading-[1.1] tracking-tight text-ink mb-6">
                  {q.text}
                </h3>
                
                {q.why && (
                  <div className="mb-8">
                    <p className="text-metadata text-ink-muted mb-2">Why this matters</p>
                    <p className="text-[15px] text-ink-secondary leading-relaxed max-w-2xl">
                      {q.why}
                    </p>
                  </div>
                )}

                {/* 2x2 Category Grid for this Question */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {POV_SECTIONS.map((section) => {
                    const isSelected = qState.selectedCategories.includes(section.key);
                    
  return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => toggleCategory(q.id, section.key)}
                        disabled={isSubmitting}
                        className={[
                          'text-left p-4 rounded-control border transition-all text-[14px] leading-relaxed font-semibold uppercase tracking-wider',
                          isSelected
                            ? 'bg-selected border-selected text-ink shadow-quiet'
                            : 'border-border bg-surface text-ink-secondary hover:text-ink hover:border-ink/40 hover:bg-surface-muted',
                          'disabled:opacity-50 flex items-start gap-3'
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'w-5 h-5 rounded-sm border flex-shrink-0 flex items-center justify-center text-[12px] font-bold transition-colors',
                            isSelected
                              ? 'border-ink bg-ink text-surface'
                              : 'border-ink-muted/40 bg-surface text-transparent'
                          ].join(' ')}
                        >
                          ✓
                        </div>
                        <div className="flex flex-col text-left pt-0.5">
                          <span className="font-semibold uppercase tracking-wider mb-1.5">{section.key}</span>
                          <span className="text-[13.5px] font-normal normal-case leading-relaxed opacity-90">
                            {generatedOptions?.[section.key]?.[idx] || section.placeholder}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Text Toggle for this Question */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => toggleCustomVisible(q.id)}
                    disabled={isSubmitting}
                    className={[
                      'flex items-center gap-3 px-4 py-2.5 rounded-control border transition-all focus:outline-none focus:ring-2 focus:ring-ink/20 w-fit',
                      qState.customVisible
                        ? 'border-ink bg-ink text-surface shadow-quiet'
                        : 'border-border bg-surface text-ink-secondary hover:text-ink hover:border-ink/40 hover:bg-surface-muted',
                      'disabled:opacity-50'
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors',
                        qState.customVisible
                          ? 'border-surface bg-surface text-ink'
                          : 'border-ink-muted/40 bg-surface text-transparent',
                      ].join(' ')}
                    >
                      ✓
                    </div>
                    <span className="text-[14px] font-medium leading-none mt-0.5">
                      Add a little more?
                    </span>
                  </button>
                </div>

                {/* Custom Textarea for this Question */}
                {qState.customVisible && (
                  <div className="bg-surface rounded-card border border-border p-4 focus-within:border-ink/30 focus-within:ring-1 focus-within:ring-ink/10 transition-all shadow-quiet">
                    <textarea
                      className="w-full min-h-[120px] font-sans text-[15px] text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none bg-transparent custom-scrollbar"
                      placeholder={q.placeholder || "Tell us what you think..."}
                      value={qState.customText}
                      onChange={(e) => updateCustomText(q.id, e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-8 p-5 border border-dashed border-border rounded-card bg-surface-muted">
          <p className="text-[15px] text-ink-secondary">
            No questions available for this topic.
          </p>
        </div>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <div className="bg-error/10 text-error p-4 rounded-control mt-4 text-[14px] border border-error/30 font-medium">
          {error}
        </div>
      )}

      {/* =====================================================
          GAP FOLLOW-UP
      ===================================================== */}
      {gapAnalysis?.has_gap && (
        <div className="mt-10 border border-border bg-surface-muted rounded-card p-6">
          <p className="text-metadata text-ink-muted mb-3">ONE MORE THING</p>
          <h3 className="font-editorial text-[28px] leading-[1.1] tracking-tight text-ink mb-3">
            {gapAnalysis.question}
          </h3>
          {gapAnalysis.reason && (
            <p className="text-[14px] text-ink-secondary leading-relaxed mb-5">
              {gapAnalysis.reason}
            </p>
          )}
          <textarea
            className="w-full min-h-[140px] font-sans text-[15px] text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none bg-surface rounded-card border border-border p-4"
            placeholder="A few sentences are enough..."
            value={followUpAnswer}
            onChange={(e) => setFollowUpAnswer(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handleFollowUpSubmit}
            disabled={isSubmitting}
            className="w-full mt-4 bg-graphite text-surface font-sans font-semibold text-[14px] py-4 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
          >
            {isSubmitting ? 'Building your perspective...' : 'Continue to brief'}
          </button>
          <p className="text-[12px] text-ink-muted text-center mt-3">
            Your previous selections and written responses will be preserved.
          </p>
        </div>
      )}

      {/* =====================================================
          PROGRESS
      ===================================================== */}
      <div className="flex justify-between items-center w-full py-8 mt-4 border-t border-border/40">
        <span className="text-metadata text-ink-muted">
          {contributionCount} {contributionCount === 1 ? 'CONTRIBUTION' : 'CONTRIBUTIONS'} ADDED
        </span>
        <div className="flex-1 mx-4 bg-surface-muted h-1 rounded-full overflow-hidden">
          <div className="bg-ink-muted h-full transition-all" style={{ width: `${progressPercentage}%` }} />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || gapAnalysis?.has_gap}
          className="bg-graphite text-surface font-sans font-semibold text-[13px] py-3 px-8 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
        >
          {isSubmitting && !gapAnalysis?.has_gap ? 'Processing...' : 'Continue'}
        </button>
      </div>

    </div>
  );
};
