import logging
from src.agents.brief import BriefAgent
from src.agents.interview import InterviewerAgent
from src.agents.pov_options import generate_pov_options
from src.schemas.perspective import Answer, PerspectiveBrief, QuestionSet, InterviewQuestion, POVCapture, POVOptionSet, POVGapAnalysis
from src.store.memory_store import get_memory, save_memory
from src.agents.quality import AnswerQualityAgent
from src.agents.pov_gap import analyze_pov_gap

logger = logging.getLogger(__name__)

_interviewer = InterviewerAgent()
_brief_agent = BriefAgent()
_quality_agent = AnswerQualityAgent()

INITIAL_SUGGESTIONS = """
- THE_EPIPHANY: Ask for the exact moment a concept "clicked".
- THE_TRENCHES: Ask about the frustrating bugs or late-night debugging.
- RABBIT_HOLE: Ask about a specific hyper-focused tangent.
- THE_HACK: Ask about the clever duct-tape solution.
- HOT_TAKE: Ask what popular advice in the community is actually garbage.
- BIG_PICTURE: Zoom out and ask how this connects to the future of the field.
"""

PROBE_SUGGESTIONS = """
- MISSING_METRIC: Use when a claim needs hard numbers, thresholds, or benchmarks (e.g., F1-scores, latency).
- MISSING_IMPLEMENTATION: Use when the answer lacks the specific architecture, library, or engineering decision used.
- MISSING_MECHANISM: Use when they state a concept but fail to explain the underlying logic of *how* or *why* it works.
- MISSING_ANECDOTE: Use when they describe a struggle broadly but omit the specific error message, moment, or real-world friction.
- MISSING_STAKE: Use when they explain a decision but fail to mention the risk, tradeoff, or what would have broken.
- MISSING_TACTIC: Use when they mention a broad strategy or workflow, but fail to provide the exact, actionable steps.
"""

def _get_thin_answers(answers: list[Answer]) -> list[Answer]:
    """
    Passes each answer through the SLM quality agent to determine
    if it lacks concrete evidence and requires a follow-up.
    """
    thin = []
    for item in answers:
        if not item.answer.strip():
            continue
            
        assessment = _quality_agent.assess(
            question=item.question_text, 
            answer=item.answer
        )
        
        if assessment.is_thin:
            logger.info(f"Flagged Question: '{item.question_text[:40]}...'")
            logger.info(f"SLM Reason: {assessment.reason}")

            item.slm_feedback = assessment.reason
            thin.append(item)
            
    return thin


def probe_interview(user_id: str,topic: str, answers: list[Answer],tone: str, n: int = 2) -> QuestionSet:
    """
    One follow-up round on the thinnest answers.

    Runs between start_interview and finish_interview, while the answers
    can still be improved. Once the brief is synthesised the material is
    fixed, so this is the last point where a weak interview is repairable.

    Returns an empty QuestionSet when nothing needs asking. The caller
    treats "no probe needed" and "probe complete" identically, so an
    empty result is a normal outcome rather than an error.

    No user_id parameter: probing works from the answers in front of it,
    not from long-term memory. Memory shapes which questions get asked in
    the first round; this round only digs into what was already said.
    """
    
    thin = _get_thin_answers(answers)

    if not thin:
        return QuestionSet()

    return _interviewer.probe(topic, answers, thin, suggested_categories=PROBE_SUGGESTIONS, n=n)


def start_interview(user_id: str, topic: str,tone: str, n: int = 4) -> QuestionSet:
    """
    Step 1. Called when the user submits a topic.

    Returns questions for the UI to render. Nothing is saved yet —
    the user may abandon the interview, and an abandoned interview
    should leave no trace.
    """
    memory = get_memory(user_id,topic)
    return _interviewer.invoke(
        topic=topic,
        tone=tone,
        memory_block=memory.to_prompt_block(topic),
        suggested_categories=INITIAL_SUGGESTIONS,
        n=n,
    )

MAX_INTERVIEW_QUESTIONS = 5


def interview_turn(
    user_id: str,
    topic: str,
    answers: list[Answer],
    tone: str,
) -> QuestionSet:
    """
    Generates the next adaptive interview question.

    The interviewer can decide to finish early when the user's
    perspective is already sufficiently clear.

    A hard maximum is also enforced so the interview can never
    become an unnecessarily long questionnaire.

    No memory is written here. Memory is only updated after the
    interview is successfully converted into a PerspectiveBrief.
    """

    # Hard stop: never ask more than MAX_INTERVIEW_QUESTIONS.
    if len(answers) >= MAX_INTERVIEW_QUESTIONS:
        logger.info(
            "Interview reached maximum question limit (%d). Finishing.",
            MAX_INTERVIEW_QUESTIONS,
        )
        return QuestionSet()

    memory = get_memory(user_id, topic)

    return _interviewer.next_question(
        topic=topic,
        answers=answers,
        tone=tone,
        memory_block=memory.to_prompt_block(topic),
    )
    
def finish_interview(user_id: str,topic: str,answers: list[Answer],tone: str) -> PerspectiveBrief:
    """
    Step 2. Called when the user submits their answers.

    Builds the brief, then records what was learned. Memory is only
    updated after the brief succeeds — BriefAgent raises on failure,
    so a broken run leaves memory untouched.
    """
    memory = get_memory(user_id,topic)

    brief = _brief_agent.invoke(
        topic=topic,
        answers=answers,
        memory_block=memory.to_prompt_block(topic),
        tone=tone
    )

    save_memory(memory.absorb(brief))

    return brief

def build_brief_from_pov(
    user_id: str,
    topic: str,
    pov: POVCapture,
    tone: str,
) -> PerspectiveBrief:
    """
    Converts the author's structured POV capture into a PerspectiveBrief.

    POVCapture contains raw information explicitly provided by the user.
    BriefAgent organizes that information into the structured brief used
    by the existing downstream generation pipeline.

    Memory is read for context but is only updated after the brief
    successfully validates.
    """
    memory = get_memory(user_id, topic)

    brief = _brief_agent.invoke(
        topic=topic,
        pov=pov,
        memory_block=memory.to_prompt_block(topic),
        tone=tone,
    )

    save_memory(memory.absorb(brief))

    return brief

def generate_pov_options_for_topic(
    user_id: str,
    topic: str,
) -> POVOptionSet:
    """
    Generate selectable POV options for a topic using relevant
    user memory.

    The memory is used to make the generated options more personal
    and especially to ground experience options in things the user
    has actually mentioned before.

    The returned options are only suggestions for the user.
    They do not become part of the user's POV until explicitly selected.
    """

    memory = get_memory(user_id, topic)

    return generate_pov_options(
        topic=topic,
        memory_block=memory.to_prompt_block(topic),
    )

def analyze_pov_gap_for_topic(
    user_id: str,
    topic: str,
    pov: POVCapture,
) -> POVGapAnalysis:
    """
    Analyze whether the user's captured POV has an important gap.

    The service layer is responsible for retrieving relevant user
    memory and passing it to the gap-detection agent.

    The agent only identifies a missing piece and does not modify
    the user's POV.
    """

    memory = get_memory(user_id, topic)

    return analyze_pov_gap(
        topic=topic,
        pov=pov,
        memory_block=memory.to_prompt_block(topic),
    )