import os
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq

from src.prompts.probe import PROBE_PROMPT
from src.prompts.interview import INTERVIEW_QUESTIONS_PROMPT
from src.schemas.perspective import InterviewQuestion, QuestionSet, Answer
from src.utils.json_output import extract_json
from src.config.settings import NVIDIA_MODEL, NVIDIA_API_KEY
# from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(override=True)


class InterviewerAgent:
    """
    Asks the user for their actual views on a topic.

    Unlike the Generator, this agent does not produce content.
    It produces QUESTIONS, which the user answers in the UI.

    The interviewer supports two modes:

    1. Legacy interview mode:
       Generates an initial QuestionSet.

    2. Adaptive interview mode:
       Looks at the answers already provided and generates the
       single most useful next question.
    """

    def __init__(
        self,
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.8
    ):

        # self.llm = ChatGoogleGenerativeAI(
        #     model=model_name,
        #     temperature=temperature,
        #     api_key=os.getenv("GEMINI_API_KEY"),
        #     max_retries=1,
        #     timeout=60,
        # )

        # self.llm = ChatNVIDIA(
        #     model=NVIDIA_MODEL,
        #     temperature=temperature,
        #     api_key=NVIDIA_API_KEY,
        #     max_retries=1,
        #     timeout=150,
        # )

        self.llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.2,
            max_retries=2
        )

        self.prompt = ChatPromptTemplate.from_template(
            INTERVIEW_QUESTIONS_PROMPT
        )

        self.chain = self.prompt | self.llm | StrOutputParser()

        # Separate chain for the adaptive interview.
        #
        # We use the same prompt template, but this chain is kept
        # separate so the old invoke() behaviour remains untouched
        # while we test the new conversational flow.
        self.adaptive_prompt = ChatPromptTemplate.from_template(
            INTERVIEW_QUESTIONS_PROMPT
        )

        self.adaptive_chain = (
            self.adaptive_prompt
            | self.llm
            | StrOutputParser()
        )

        # self.probe_llm = ChatGoogleGenerativeAI(
        #     model=model_name,
        #     temperature=0.4,
        #     api_key=os.getenv("GEMINI_API_KEY"),
        #     max_retries=1,
        #     timeout=60,
        # )

        # self.probe_llm = ChatNVIDIA(
        #     model=NVIDIA_MODEL,
        #     temperature=0.4,
        #     api_key=NVIDIA_API_KEY,
        #     max_retries=1,
        #     timeout=60,
        # )

        self.probe_llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.2,
            max_retries=2
        )

        self.probe_chain = (
            ChatPromptTemplate.from_template(PROBE_PROMPT)
            | self.probe_llm
            | StrOutputParser()
        )

    @staticmethod
    def _format_answers(
        answers: list[Answer],
        include_feedback: bool = False
    ) -> str:
        """
        Converts the conversation into prompt-friendly text.

        Blank answers are explicitly marked as skipped.

        If include_feedback is True, the quality agent's feedback
        is also included.
        """

        if not answers:
            return "(nothing answered)"

        blocks = []

        for a in answers:
            response = a.answer.strip() or "(skipped)"

            block = (
                f"Q: {a.question_text}\n"
                f"A: {response}"
            )

            if (
                include_feedback
                and getattr(a, "slm_feedback", None)
            ):
                block += (
                    f"\nSystem Feedback: {a.slm_feedback}"
                )

            blocks.append(block)

        return "\n\n".join(blocks)

    def next_question(
        self,
        topic: str,
        answers: list[Answer],
        tone: str,
        memory_block: str = (
            "(First interview with this person — "
            "nothing known yet)"
        ),
    ) -> QuestionSet:
        """
        Generates the next adaptive interview question.

        The model receives the complete conversation so far and
        decides whether:

        1. Another question is necessary, or
        2. The user's perspective is sufficiently captured.

        Returns:
            QuestionSet with at most ONE question.

            An empty QuestionSet means the interview can finish.
        """

        try:
            formatted_answers = self._format_answers(
                answers,
                include_feedback=False
            )

            raw = self.adaptive_chain.invoke({
                "topic": topic,
                "tone": tone,
                "memory_block": memory_block,
                "suggested_categories": """
- THE_DISCOVERY
- THE_DECISION
- THE_TRADEOFF
- THE_MISTAKE
- THE_BELIEF
- THE_REALIZATION
- THE_CONSEQUENCE
- THE_LESSON
- THE_DISAGREEMENT
- THE_CHANGE_OF_MIND
""",
                "answers": formatted_answers,
                "n": 1,
            })

            question_set = QuestionSet.model_validate(
                extract_json(raw)
            )

            # The adaptive interview must NEVER return more
            # than one question.
            if not question_set.questions:
                return QuestionSet()

            question = question_set.questions[0]

            # Make IDs unique based on the number of answers
            # already present in the conversation.
            question.id = f"q{len(answers) + 1}"

            return QuestionSet(
                questions=[question]
            )

        except Exception as exc:
            print(
                f"[InterviewerAgent] "
                f"next question failed: {exc}"
            )

            # An empty result is safer than inventing a question
            # when the adaptive interviewer fails.
            return QuestionSet()

    def probe(
        self,
        topic: str,
        answers: list[Answer],
        thin: list[Answer],
        suggested_categories: str,
        n: int = 2
    ) -> QuestionSet:
        """
        Legacy follow-up round on the thinnest answers.

        This remains temporarily so the existing interview flow
        continues to work while the adaptive interview is being
        introduced.
        """

        if not thin:
            return QuestionSet()

        try:
            raw = self.probe_chain.invoke({
                "topic": topic,
                "all_answers": self._format_answers(
                    answers,
                    include_feedback=False
                ),
                "thin_answers": self._format_answers(
                    thin,
                    include_feedback=True
                ),
                "suggested_categories": suggested_categories,
                "n": n,
            })

            question_set = QuestionSet.model_validate(
                extract_json(raw)
            )

            # Probe IDs are namespaced separately from q1..qn.
            for i, question in enumerate(
                question_set.questions[:n],
                start=1
            ):
                question.id = f"p{i}"

            question_set.questions = (
                question_set.questions[:n]
            )

            return question_set

        except Exception as exc:
            print(
                f"[InterviewerAgent] probe failed: {exc}"
            )

            return QuestionSet()

    def invoke(
        self,
        topic: str,
        tone: str,
        suggested_categories: str,
        memory_block: str = (
            "(First interview with this person — "
            "nothing known yet)"
        ),
        n: int = 4
    ) -> QuestionSet:
        """
        Legacy initial interview.

        Generates the initial QuestionSet.

        This method is intentionally kept unchanged for now while
        the adaptive interview is introduced and tested separately.
        """

        for attempt in range(2):
            try:
                raw = self.chain.invoke({
                    "topic": topic,
                    "tone": tone,
                    "memory_block": memory_block,
                    "suggested_categories": suggested_categories,
                    "n": n,
                    "answers": "(nothing answered)",
                })

                question_set = QuestionSet.model_validate(
                    extract_json(raw)
                )

                if question_set.questions:

                    for i, question in enumerate(
                        question_set.questions[:n],
                        start=1
                    ):
                        question.id = f"q{i}"

                    question_set.questions = (
                        question_set.questions[:n]
                    )

                    return question_set

            except Exception as exc:
                print(
                    f"[InterviewerAgent] "
                    f"attempt {attempt + 1} failed: {exc}"
                )

        return self._fallback(topic, n)

    @staticmethod
    def _fallback(
        topic: str,
        n: int
    ) -> QuestionSet:
        """
        Fixed questions used when the model fails.

        Kept for the legacy interview flow.
        """

        questions = [
            InterviewQuestion(
                id="q1",
                category="THE_TRENCHES",
                text=(
                    f"What is the most recent thing you personally "
                    f"did, built or watched fail involving {topic}?"
                ),
                why=(
                    "First-hand detail is what makes the post yours."
                ),
                placeholder=(
                    "We removed our orchestration layer "
                    "after it added 40s per run."
                ),
            ),

            InterviewQuestion(
                id="q2",
                category="HOT_TAKE",
                text=(
                    f"What do most people in your field believe "
                    f"about {topic} that you think is wrong?"
                ),
                why=(
                    "Disagreement is what stops people scrolling."
                ),
                placeholder=(
                    "Everyone thinks more agents means more "
                    "capability. It mostly means more failure modes."
                ),
            ),

            InterviewQuestion(
                id="q3",
                category="MISSING_METRIC",
                text=(
                    "Which tools, numbers or timeframes would "
                    "you point at to back that up?"
                ),
                why=(
                    "Specifics separate credible from forgettable."
                ),
                placeholder=(
                    "Three months, two frameworks, most incidents "
                    "traced to retries."
                ),
            ),

            InterviewQuestion(
                id="q4",
                category="BIG_PICTURE",
                text=(
                    "Who do you want reading this, and what should "
                    "they do differently afterwards?"
                ),
                why=(
                    "Gives the post someone to talk to and "
                    "a way to end."
                ),
                placeholder=(
                    "Engineering leads about to adopt a framework. "
                    "Prototype without one first."
                ),
            ),
        ]

        return QuestionSet(
            questions=questions[:n]
        )