import React, { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { finishInterview } from '../services/api';

export const ProbePage = () => {
  const { topic, tone, answers, probeQuestions, setAnswers, setBrief, setBriefId, setPhase } = useWorkflow();
  const [probeAnswers, setProbeAnswers] = useState(() => {
    const initial = {};
    if (answers && answers.length > 0) {
      answers.forEach(a => {
        initial[a.question_id] = a;
      });
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleTextChange = (id, text, textTitle) => {
    setProbeAnswers(prev => ({
      ...prev,
      [id]: { question_id: id, question_text: textTitle, answer: text }
    }));
  };

  const getFinalAnswerList = () => {
    const probeIds = probeQuestions.map(q => q.id);
    const baseAnswers = answers.filter(a => !probeIds.includes(a.question_id));
    
    const newAnswers = probeQuestions.map(q => {
      const ans = probeAnswers[q.id];
      return ans || { question_id: q.id, question_text: q.text, answer: '' };
    });
    
    return [...baseAnswers, ...newAnswers];
  };

  const finalizeInterview = async (answerList, wasProbed) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await finishInterview(topic, tone, answerList, wasProbed);
      setBrief(data.brief);
      setBriefId(data.brief_id);
      setPhase('brief');
    } catch (err) {
      setError("Failed to create brief.");
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    const finalAnswers = getFinalAnswerList();
    setAnswers(finalAnswers);
    finalizeInterview(finalAnswers, true);
  };

  const handleSkip = () => {
    finalizeInterview(answers, false);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-10 w-full">
      <div className="mb-12">
        
        <h2 className="text-hero text-ink mb-5">There's more<br/>here to explore.</h2>
        <div className="border-b border-border pb-4">
          <p className="text-[13px] text-ink-secondary font-medium tracking-wide uppercase">{topic}</p>
        </div>
      </div>

      <div className="space-y-20 mb-16">
        {probeQuestions.map((q, idx) => (
          <div key={q.id} className="relative group">
            <span className="hidden md:block absolute -left-16 top-2 text-metadata text-ink-muted opacity-40">0{idx + 1}</span>
            <h3 className="font-editorial text-[28px] md:text-[36px] leading-[1.1] tracking-tight text-ink mb-6">{q.text}</h3>
            
            <div className="mb-6">
              <p className="text-metadata text-ink-muted mb-2">Why this matters</p>
              <p className="text-[15px] text-ink-secondary leading-relaxed max-w-2xl">{q.why}</p>
            </div>
            
            <div className="relative bg-surface rounded-card shadow-quiet border border-border p-5 focus-within:border-ink/30 focus-within:ring-1 focus-within:ring-ink/10 transition-all">
              <textarea
                className="w-full h-[180px] font-sans text-[16px] text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none bg-transparent custom-scrollbar"
                placeholder={q.placeholder}
                value={probeAnswers[q.id]?.answer || ''}
                onChange={(e) => handleTextChange(q.id, e.target.value, q.text)}
              ></textarea>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-control mb-8 text-[14px]">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-4 border-t border-border pt-8">
        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          className="w-full sm:w-1/3 bg-transparent text-ink-secondary font-sans font-semibold text-[14px] py-3.5 px-6 rounded-button border border-border hover:bg-surface-muted transition-all disabled:opacity-50 flex justify-center items-center"
        >
          Skip these
        </button>
        <button
          onClick={handleContinue}
          disabled={isSubmitting}
          className="w-full sm:w-2/3 bg-graphite text-surface font-sans font-semibold text-[14px] py-3.5 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Building your perspective brief...
            </>
          ) : 'Continue'}
        </button>
      </div>
    </div>
  );
};

