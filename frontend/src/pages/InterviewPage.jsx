import React, { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import {
  buildBriefFromPOV,
  generatePOVOptions,
} from '../services/api';

const POV_SECTIONS = [
  {
    key: 'opinion',
    title: 'What do you think?',
    description:
      'Choose the statements that best describe your point of view, then add your own words if you want.',
    placeholder:
      'Add your own opinion, nuance, disagreement, or explanation...',
  },
  {
    key: 'experience',
    title: 'What have you experienced?',
    description:
      'These suggestions are based on things you have shared previously. Select what genuinely matches you, then add your own details.',
    placeholder:
      'Add your own experience, project, problem, observation, or specific detail...',
    memoryBased: true,
  },
  {
    key: 'message',
    title: 'What should the reader take away?',
    description:
      'Choose what you want people to think, learn, or do after reading.',
    placeholder:
      'Add the takeaway in your own words...',
  },
  {
    key: 'audience',
    title: 'Who is this for?',
    description:
      'Choose the people you want this post to speak to, and add anyone specific you have in mind.',
    placeholder:
      'Describe your target audience or a specific group...',
  },
];

const createInitialPOV = () => ({
  opinion: {
    selected: [],
    custom: '',
  },
  experience: {
    selected: [],
    custom: '',
  },
  message: {
    selected: [],
    custom: '',
  },
  audience: {
    selected: [],
    custom: '',
  },
});

const createEmptyOptions = () => ({
  opinion: [],
  experience: [],
  message: [],
  audience: [],
});

export const InterviewPage = () => {
  const {
    topic,
    tone,
    setBrief,
    setBriefId,
    setPhase,
  } = useWorkflow();

  const [pov, setPov] = useState(createInitialPOV);

  const [generatedOptions, setGeneratedOptions] = useState(
    createEmptyOptions
  );

  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Gap analysis state
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  /*
   * Generate POV options whenever the topic changes.
   *
   * These are suggestions only.
   * Nothing becomes part of the user's POV until selected.
   */
  useEffect(() => {
    const loadPOVOptions = async () => {
      if (!topic?.trim()) {
        setGeneratedOptions(createEmptyOptions());
        setIsLoadingOptions(false);
        return;
      }

      setIsLoadingOptions(true);
      setError(null);
      setGapAnalysis(null);
      setFollowUpAnswer('');

      try {
        const data = await generatePOVOptions(topic);

        setGeneratedOptions({
          opinion: Array.isArray(data?.opinion)
            ? data.opinion
            : [],

          experience: Array.isArray(data?.experience)
            ? data.experience
            : [],

          message: Array.isArray(data?.message)
            ? data.message
            : [],

          audience: Array.isArray(data?.audience)
            ? data.audience
            : [],
        });
      } catch (err) {
        console.error(
          'Failed to generate POV options:',
          err
        );

        setGeneratedOptions(createEmptyOptions());

        setError(
          'We could not generate suggestions right now. You can still add your perspective in your own words.'
        );
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadPOVOptions();
  }, [topic]);

  /*
   * Toggle a checkbox option.
   *
   * This does NOT affect custom text.
   *
   * Therefore the user can:
   *
   *   select a checkbox
   *   +
   *   type their own explanation
   *
   * at the same time.
   */
  const toggleOption = (sectionKey, option) => {
    setPov((current) => {
      const section = current[sectionKey];

      const selected = section.selected.includes(option)
        ? section.selected.filter(
            (item) => item !== option
          )
        : [...section.selected, option];

      return {
        ...current,

        [sectionKey]: {
          ...section,
          selected,
        },
      };
    });

    /*
     * If a gap question was previously generated,
     * changing the POV means the old gap analysis may
     * no longer be valid.
     */
    setGapAnalysis(null);
    setFollowUpAnswer('');
    setError(null);
  };

  /*
   * Update custom text.
   *
   * Custom text is completely independent from checkbox
   * selections.
   */
  const updateCustom = (sectionKey, value) => {
    setPov((current) => ({
      ...current,

      [sectionKey]: {
        ...current[sectionKey],
        custom: value,
      },
    }));

    /*
     * Editing the POV invalidates an existing gap analysis.
     */
    setGapAnalysis(null);
    setFollowUpAnswer('');
    setError(null);
  };

  /*
   * Check whether the user has provided anything at all.
   */
  const hasPOVInput = () => {
    return Object.values(pov).some(
      (section) =>
        section.selected.length > 0 ||
        section.custom.trim().length > 0
    );
  };

  /*
   * Count both:
   *
   * 1. selected checkbox options
   * 2. sections where the user added custom text
   *
   * This makes the progress indicator reflect actual
   * user contribution rather than only checkbox clicks.
   */
  const getContributionCount = () => {
    return Object.values(pov).reduce(
      (total, section) => {
        const selectionCount = section.selected.length;

        const customContribution =
          section.custom.trim().length > 0 ? 1 : 0;

        return total + selectionCount + customContribution;
      },
      0
    );
  };

  /*
   * First submission.
   *
   * Flow:
   *
   * 1. Validate POV.
   * 2. Ask backend to detect an important gap.
   * 3. If a gap exists, ask ONE follow-up.
   * 4. Otherwise build the brief immediately.
   */
  const handleSubmit = async () => {
    if (!hasPOVInput()) {
      setError(
        'Choose at least one option or tell us something in your own words.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const gapResponse = await fetch('/api/pov/gap', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          topic,
          pov,
        }),
      });

      if (!gapResponse.ok) {
        throw new Error('Failed to analyze POV');
      }

      const gapData = await gapResponse.json();
      const gap = gapData.gap;

      /*
       * Important:
       *
       * We do NOT immediately ask another question unless
       * the backend believes that something important is
       * missing.
       */
      if (gap?.has_gap) {
        setGapAnalysis(gap);
        setIsSubmitting(false);
        return;
      }

      /*
       * POV is sufficiently grounded.
       * Build the brief immediately.
       */
      const data = await buildBriefFromPOV(
        topic,
        tone,
        pov
      );

      setBrief(data.brief);
      setBriefId(data.brief_id);
      setPhase('brief');
    } catch (err) {
      console.error(err);

      setError(
        'We could not analyze your perspective right now. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Follow-up submission.
   *
   * IMPORTANT:
   *
   * Do not replace the user's existing custom text.
   *
   * Example:
   *
   * Existing:
   * "I used this while working on a robotics project."
   *
   * Follow-up:
   * "The biggest improvement came from having one measurable goal."
   *
   * Final:
   * "I used this while working on a robotics project.
   *  The biggest improvement came from having one measurable goal."
   */
  const handleFollowUpSubmit = async () => {
    if (!followUpAnswer.trim()) {
      setError(
        'Please answer the question before continuing.'
      );
      return;
    }

    if (
      !gapAnalysis?.missing_area ||
      !pov[gapAnalysis.missing_area]
    ) {
      setError(
        'Something went wrong with the follow-up question. Please try again.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const missingArea = gapAnalysis.missing_area;

      const existingCustom =
        pov[missingArea].custom.trim();

      const newAnswer =
        followUpAnswer.trim();

      /*
       * Preserve existing custom input.
       *
       * If there is existing text, append the follow-up
       * answer instead of replacing it.
       */
      const combinedCustom = existingCustom
        ? `${existingCustom}\n\n${newAnswer}`
        : newAnswer;

      const updatedPOV = {
        ...pov,

        [missingArea]: {
          ...pov[missingArea],

          /*
           * Checkbox selections remain untouched.
           */
          selected: [
            ...pov[missingArea].selected,
          ],

          /*
           * Existing custom text + follow-up answer.
           */
          custom: combinedCustom,
        },
      };

      /*
       * Keep local state synchronized.
       */
      setPov(updatedPOV);

      /*
       * Build the final brief using the complete POV.
       */
      const data = await buildBriefFromPOV(
        topic,
        tone,
        updatedPOV
      );

      setBrief(data.brief);
      setBriefId(data.brief_id);
      setPhase('brief');
    } catch (err) {
      console.error(err);

      setError(
        'Failed to create your perspective brief. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contributionCount =
    getContributionCount();

  /*
   * Maximum visual progress.
   *
   * We use 12 rather than 8 because users can contribute
   * through both checkboxes and custom text.
   */
  const progressPercentage = Math.min(
    (contributionCount / 12) * 100,
    100
  );

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-10 w-full">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="mb-12">

        <p className="text-metadata text-ink-muted mb-3">
          Step 2 / Your Point of View
        </p>

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
          INTRODUCTION
      ===================================================== */}
      <div className="mb-12">

        <p className="text-[16px] text-ink-secondary leading-relaxed max-w-2xl">
          You don't need to write a long answer.
          Choose anything that sounds like you, then
          add your own words wherever you want.
        </p>

        <p className="text-[13px] text-ink-muted leading-relaxed max-w-2xl mt-3">
          The suggestions are only starting points.
          Your selections and written responses are what
          define your perspective.
        </p>

      </div>


      {/* =====================================================
          LOADING STATE
      ===================================================== */}
      {isLoadingOptions && (
        <div className="mb-10 border border-border bg-surface-muted rounded-card p-5">

          <div className="flex items-center gap-3">

            <svg
              className="animate-spin h-5 w-5 text-ink-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >

              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />

            </svg>

            <p className="text-[14px] text-ink-secondary">
              Generating perspective options for this topic...
            </p>

          </div>

        </div>
      )}


      {/* =====================================================
          POV SECTIONS
      ===================================================== */}
      <div className="space-y-14">

        {POV_SECTIONS.map((section, index) => {

          const currentSection =
            pov[section.key];

          const sectionOptions =
            generatedOptions[section.key] || [];

          return (
            <section key={section.key}>

              {/* ---------------------------------------------
                  SECTION HEADING
              --------------------------------------------- */}
              <div className="mb-6">

                <div className="flex items-baseline gap-3 mb-2">

                  <span className="text-metadata text-ink-muted opacity-60">
                    0{index + 1}
                  </span>

                  <h3 className="font-editorial text-[28px] md:text-[34px] leading-[1.1] tracking-tight text-ink">
                    {section.title}
                  </h3>

                </div>

                <p className="text-[15px] text-ink-secondary leading-relaxed max-w-2xl ml-8">
                  {section.description}
                </p>

              </div>


              {/* ---------------------------------------------
                  MEMORY INDICATOR
              --------------------------------------------- */}
              {section.memoryBased &&
                sectionOptions.length > 0 && (
                  <div className="ml-8 mb-4 flex items-start gap-2">

                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      From your previous context
                    </span>

                    <span className="text-[12px] text-ink-muted">
                      These are suggestions based on things
                      you have previously shared. Select only
                      what genuinely applies.
                    </span>

                  </div>
                )}


              {/* ---------------------------------------------
                  CHECKBOX OPTIONS
              --------------------------------------------- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {sectionOptions.map((option) => {

                  const selected =
                    currentSection.selected.includes(
                      option
                    );

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        toggleOption(
                          section.key,
                          option
                        )
                      }
                      disabled={isSubmitting}
                      className={[
                        'text-left p-4 rounded-control border transition-all',

                        selected
                          ? 'border-ink bg-ink text-surface shadow-quiet'
                          : 'border-border bg-surface text-ink hover:border-ink/40 hover:bg-surface-muted',

                        'disabled:opacity-50',
                      ].join(' ')}
                    >

                      <div className="flex items-start gap-3">

                        <span
                          className={[
                            'mt-[2px] w-4 h-4 rounded-sm border flex-shrink-0',
                            'flex items-center justify-center text-[11px] font-bold',

                            selected
                              ? 'border-surface bg-surface text-ink'
                              : 'border-ink-muted/40',
                          ].join(' ')}
                        >
                          {selected ? '✓' : ''}
                        </span>

                        <span className="text-[14px] leading-relaxed font-medium">
                          {option}
                        </span>

                      </div>

                    </button>
                  );
                })}


                {/* No options */}
                {!isLoadingOptions &&
                  sectionOptions.length === 0 && (
                    <div className="sm:col-span-2 text-[14px] text-ink-muted p-4 border border-dashed border-border rounded-control">

                      {section.memoryBased
                        ? 'No previous experience was found for this topic. You can describe your own experience below.'
                        : 'No suggestions were generated for this section. You can add your own response below.'}

                    </div>
                  )}

              </div>


              {/* ---------------------------------------------
                  CUSTOM RESPONSE
              --------------------------------------------- */}
              <div className="mt-4">

                <div className="bg-surface rounded-card border border-border p-4 focus-within:border-ink/30 focus-within:ring-1 focus-within:ring-ink/10 transition-all">

                  <textarea
                    className="w-full min-h-[100px] font-sans text-[15px] text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none bg-transparent custom-scrollbar"
                    placeholder={section.placeholder}
                    value={currentSection.custom}
                    onChange={(e) =>
                      updateCustom(
                        section.key,
                        e.target.value
                      )
                    }
                    disabled={isSubmitting}
                  />

                </div>

                {/* Helpful label */}
                <p className="text-[12px] text-ink-muted mt-2">
                  You can use this together with the
                  selections above.
                </p>

              </div>

            </section>
          );
        })}

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <div className="bg-error/10 text-error p-4 rounded-control mt-10 text-[14px] border border-error/30 font-medium">
          {error}
        </div>
      )}


      {/* =====================================================
          GAP FOLLOW-UP
      ===================================================== */}
      {gapAnalysis?.has_gap && (
        <div className="mt-10 border border-border bg-surface-muted rounded-card p-6">

          <p className="text-metadata text-ink-muted mb-3">
            ONE MORE THING
          </p>

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
            onChange={(e) =>
              setFollowUpAnswer(e.target.value)
            }
            disabled={isSubmitting}
          />

          <button
            type="button"
            onClick={handleFollowUpSubmit}
            disabled={isSubmitting}
            className="w-full mt-4 bg-graphite text-surface font-sans font-semibold text-[14px] py-4 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
          >
            {isSubmitting
              ? 'Building your perspective...'
              : 'Continue to brief'}
          </button>

          <p className="text-[12px] text-ink-muted text-center mt-3">
            Your previous selections and written responses
            will be preserved.
          </p>

        </div>
      )}


      {/* =====================================================
          PROGRESS
      ===================================================== */}
      <div className="flex justify-between items-center w-full py-8">

        <span className="text-metadata text-ink-muted">
          {contributionCount}{' '}
          {contributionCount === 1
            ? 'CONTRIBUTION'
            : 'CONTRIBUTIONS'}{' '}
          ADDED
        </span>

        <div className="flex-1 ml-4 bg-surface-muted h-1 rounded-full overflow-hidden">

          <div
            className="bg-ink-muted h-full transition-all"
            style={{
              width: `${progressPercentage}%`,
            }}
          />

        </div>

      </div>


      {/* =====================================================
          SUBMIT
      ===================================================== */}
      <div className="border-t border-border pt-8 pb-4">

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            isLoadingOptions ||
            gapAnalysis?.has_gap
          }
          className="w-full bg-graphite text-surface font-sans font-semibold text-[14px] py-4 px-6 rounded-button hover:-translate-y-[1px] hover:shadow-soft transition-all disabled:opacity-50 disabled:hover:transform-none flex justify-center items-center shadow-quiet"
        >

          {isSubmitting ? (
            <>

              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-surface"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >

                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />

              </svg>

              Analyzing your perspective...

            </>
          ) : (
            'Continue to brief'
          )}

        </button>

        <p className="text-center text-[12px] text-ink-muted mt-4">
          Choose only what feels relevant. You can leave
          sections empty.
        </p>

      </div>

    </div>
  );
};