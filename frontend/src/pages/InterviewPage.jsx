import React, { useState, useRef, useEffect } from 'react';
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
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  
  const [currentStep, setCurrentStep] = useState(0);
  const textareaRef = useRef(null);

  // Added customVisible to track the toggle state for the textbox
  const [categoryState, setCategoryState] = useState({
    opinion: { selected: [], customText: '', customVisible: false },
    experience: { selected: [], customText: '', customVisible: false },
    message: { selected: [], customText: '', customVisible: false },
    audience: { selected: [], customText: '', customVisible: false }
  });

  const toggleOption = (categoryKey, optionText) => {
    setCategoryState(prev => {
      const currentSelected = prev[categoryKey].selected;
      const newSelected = currentSelected.includes(optionText)
        ? currentSelected.filter(item => item !== optionText)
        : [...currentSelected, optionText];
        
      return {
        ...prev,
        [categoryKey]: { ...prev[categoryKey], selected: newSelected }
      };
    });
    setError(null);
  };

  const toggleCustomVisible = (categoryKey) => {
    setCategoryState(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], customVisible: !prev[categoryKey].customVisible }
    }));
  };

  const handleTextareaChange = (categoryKey, e) => {
    setCategoryState(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], customText: e.target.value }
    }));
    setError(null);
    
    // Dynamically adjust height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Ensure textarea resizes correctly when navigating between steps
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentStep, categoryState[POV_SECTIONS[currentStep]?.key]?.customVisible]);

  const getContributionCount = () => {
    let count = 0;
    Object.values(categoryState).forEach(state => {
      count += state.selected.length;
      if (state.customText.trim().length > 0) count += 1;
    });
    return count;
  };

  const getCompletedSectionsCount = () => {
    return Object.values(categoryState).filter(
      state => state.selected.length > 0 || state.customText.trim().length > 0
    ).length;
  };

  const buildPayloadPOV = () => {
    const finalPov = {};
    Object.keys(categoryState).forEach(key => {
      finalPov[key] = {
        selected: categoryState[key].selected,
        custom: categoryState[key].customText.trim()
      };
    });
    return finalPov;
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep < POV_SECTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (getContributionCount() === 0) {
      setError('Please add at least one contribution before generating the brief.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const povPayload = buildPayloadPOV();

    try {
      const gapResponse = await fetch('/api/pov/gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, pov: povPayload }),
      });

      if (!gapResponse.ok) throw new Error('Failed to analyze POV');

      const gapData = await gapResponse.json();
      if (gapData.gap?.has_gap) {
        setGapAnalysis(gapData.gap);
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

  const activeSection = POV_SECTIONS[currentStep];
  const dynamicQuestion = questions?.[currentStep];
  const sectionOptions = generatedOptions?.[activeSection.key] || [];
  const currentState = categoryState[activeSection.key];

  return (
    <div className="max-w-4xl mx-auto pt-2 pb-6 md:pt-4 md:pb-10 w-full min-h-[80vh] flex flex-col">      
      <div className="mb-6 flex-shrink-0">
        <h2 className="font-editorial text-[32px] md:text-[42px] leading-tight text-ink mb-6">
          Shape your narrative.
        </h2>
        
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <p className="text-[14px] md:text-[15px] text-ink-secondary font-sans leading-relaxed pr-4 max-w-3xl">
            {topic}
          </p>
          <p className="text-[12px] text-ink-muted uppercase tracking-wider font-semibold whitespace-nowrap md:mb-1">
            STEP {currentStep + 1} OF 4
          </p>
        </div>
      </div>

      <div className="flex-grow mb-8 animate-fade-in relative">
        <span className="hidden md:block absolute -left-16 top-2 text-metadata text-ink-muted opacity-40">
          0{currentStep + 1}
        </span>
        
        <h3 className="font-editorial text-[28px] md:text-[36px] leading-[1.1] tracking-tight text-ink mb-4">
          {dynamicQuestion ? dynamicQuestion.text : activeSection.title}
        </h3>
        
        {dynamicQuestion?.why ? (
          <details className="mb-8 group">
            <summary className="text-[12px] text-ink-muted uppercase tracking-wider font-semibold cursor-pointer list-none flex items-center gap-2 hover:text-ink transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Why are we asking this?
            </summary>
            <p className="text-[14px] text-ink-secondary leading-relaxed max-w-2xl mt-3 pl-6 border-l-2 border-border/50">
              {dynamicQuestion.why}
            </p>
          </details>
        ) : (
          <p className="text-[15px] text-ink-secondary leading-relaxed max-w-2xl mb-8">
            {activeSection.description}
          </p>
        )}

        {sectionOptions.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            {sectionOptions.map((opt, optIdx) => {
              const isSelected = currentState.selected.includes(opt);
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => toggleOption(activeSection.key, opt)}
                  disabled={isSubmitting || gapAnalysis?.has_gap}
                  className={[
                    'text-left p-4 rounded-control border transition-all text-[14px] leading-relaxed',
                    isSelected
                      ? 'bg-selected border-ink text-ink shadow-sm'
                      : 'border-border bg-surface text-ink-secondary hover:text-ink hover:border-ink/40 hover:bg-surface-muted',
                    'disabled:opacity-50 flex items-start gap-4'
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-5 h-5 rounded-sm border flex-shrink-0 flex items-center justify-center text-[12px] font-bold transition-colors mt-0.5',
                      isSelected
                        ? 'border-ink bg-ink text-surface'
                        : 'border-ink-muted/40 bg-surface text-transparent'
                    ].join(' ')}
                  >
                    ✓
                  </div>
                  <span className="leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Text Toggle Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => toggleCustomVisible(activeSection.key)}
            disabled={isSubmitting || gapAnalysis?.has_gap}
            className={[
              'flex items-center gap-3 px-4 py-2.5 rounded-control border transition-all focus:outline-none focus:ring-2 focus:ring-ink/20 w-fit',
              currentState.customVisible
                ? 'border-ink bg-ink text-surface shadow-sm'
                : 'border-border bg-surface text-ink-secondary hover:text-ink hover:border-ink/40 hover:bg-surface-muted',
              'disabled:opacity-50'
            ].join(' ')}
          >
            <div
              className={[
                'w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors',
                currentState.customVisible
                  ? 'border-surface bg-surface text-ink'
                  : 'border-ink-muted/40 bg-surface text-transparent',
              ].join(' ')}
            >
              ✓
            </div>
            <span className="text-[14px] font-medium leading-none mt-0.5">
              Add your own thoughts?
            </span>
          </button>
        </div>

        {/* Dynamic Textarea */}
        {currentState.customVisible && (
          <div className="bg-surface rounded-card border border-border p-4 focus-within:border-ink/30 focus-within:ring-2 focus-within:ring-ink/10 transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full min-h-[28px] font-sans text-[15px] text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none bg-transparent custom-scrollbar leading-relaxed"
              placeholder={activeSection.placeholder}
              value={currentState.customText}
              onChange={(e) => handleTextareaChange(activeSection.key, e)}
              disabled={isSubmitting || gapAnalysis?.has_gap}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-control mb-4 text-[14px] border border-error/30 font-medium text-center">
          {error}
        </div>
      )}

      {/* Progress & Navigation Footer */}
      <div className="flex-shrink-0 flex items-center justify-between w-full py-6 mt-4 border-t border-border/40">
        
        <div className="flex items-center gap-4 w-1/3">
           {currentStep > 0 && !gapAnalysis?.has_gap && (
             <button
               onClick={handlePrevStep}
               disabled={isSubmitting}
               className="text-ink-secondary hover:text-ink text-[13px] font-semibold tracking-wide uppercase transition-colors"
             >
               ← Back
             </button>
           )}
        </div>
        
        <div className="flex-1 px-4 md:px-8 max-w-[200px] flex flex-col items-center">
          <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-ink h-full transition-all duration-300 ease-out" 
              style={{ width: `${(getCompletedSectionsCount() / 4) * 100}%` }} 
            />
          </div>
          <span className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold">
            {getContributionCount()} {getContributionCount() === 1 ? 'Added' : 'Added'}
          </span>
        </div>

        <div className="flex justify-end w-1/3">
          {currentStep < 3 ? (
            <button
              onClick={handleNextStep}
              disabled={isSubmitting || gapAnalysis?.has_gap}
              className="bg-surface-muted text-ink border border-border hover:border-ink/40 font-sans font-semibold text-[13px] py-2.5 px-6 rounded-full transition-all flex items-center gap-2"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || gapAnalysis?.has_gap}
              className="bg-ink text-surface font-sans font-semibold text-[13px] py-2.5 px-6 rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-sm"
            >
              {isSubmitting && !gapAnalysis?.has_gap ? 'Processing...' : 'Generate Brief'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};