import os
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
#from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from src.prompts.brief import BRIEF_PROMPT
from src.schemas.perspective import Answer, PerspectiveBrief, POVCapture
from src.utils.json_output import extract_json
from src.config.settings import NVIDIA_MODEL, NVIDIA_API_KEY

load_dotenv(override=True)


class BriefAgent:
    """
    Converts a completed interview into a PerspectiveBrief.

    This is the most consequential agent in the pipeline. Everything
    downstream — generator, evaluator, reflection, refiner — is graded
    against whatever this agent produces. If the brief contains an
    invented statistic, that statistic reaches a post the user
    publishes under their own name.

    Temperature is 0.1 because this is extraction, not writing. The
    only creative decision it makes is phrasing the thesis, and even
    there it should be reusing the author's own words.
    """

    def __init__(
        self,
        model_name: str = "openai/gpt-oss-120b",
        temperature: float = 0.1,
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

        self.prompt = ChatPromptTemplate.from_template(BRIEF_PROMPT)
        self.chain = self.prompt | self.llm | StrOutputParser()

    @staticmethod
    def format_answers(answers: list[Answer]) -> str:
        """
        Renders the interview as Q&A pairs for the prompt.

        Skipped questions are shown explicitly rather than omitted.
        The model should know a question was asked and declined —
        that is information, and hiding it invites the model to
        fill the gap itself.
        """
        if not answers:
            return "(no answers provided)"

        blocks = []
        for a in answers:
            text = a.answer.strip() or "(skipped)"
            blocks.append(f"Q: {a.question_text or a.question_id}\nA: {text}")

        return "\n\n".join(blocks)
    
    @staticmethod
    def format_pov(pov: POVCapture) -> str:
        """
        Renders the author's raw POV capture for the brief prompt.

        This preserves both:
        - explicitly selected UI options
        - optional custom text

        The LLM receives the author's raw perspective and is responsible
        only for structuring it into a PerspectiveBrief.
        """

        def format_section(name: str, section) -> str:
            selected = (
                "\n".join(f"- {item}" for item in section.selected)
                if section.selected
                else "(none selected)"
            )

            custom = section.custom.strip() or "(none provided)"

            return (
                f"{name}\n"
                f"Selected:\n{selected}\n"
                f"Custom:\n{custom}"
            )

        return "\n\n".join([
            format_section("MAIN OPINION", pov.opinion),
            format_section("EXPERIENCE", pov.experience),
            format_section("MESSAGE / READER TAKEAWAY", pov.message),
            format_section("TARGET AUDIENCE", pov.audience),
        ])

    def invoke(
    self,
    topic: str,
    answers: list[Answer] | None = None,
    pov: POVCapture | None = None,
    memory_block: str = "(First interview with this person — nothing known yet)",
    tone: str = "Direct, punchy, and technical (like a senior engineer)",
    ) -> PerspectiveBrief:
        """
        Returns a validated PerspectiveBrief.

        Raises RuntimeError if the model cannot produce valid JSON.
        This agent has NO fallback on purpose: an empty or invented
        brief would silently produce a generic post while every
        downstream faithfulness check passes, because those checks
        grade against the brief itself.

        Failing loudly here is the only way the error stays visible.
        """
        if pov is not None:
            pov_block = self.format_pov(pov)
        else:
            pov_block = self.format_answers(answers or [])
        last_error = None

        for attempt in range(3):
            try:
                raw = self.chain.invoke({
                    "topic": topic,
                    "memory_block": memory_block,
                    "pov_block": pov_block,
                })

                brief = PerspectiveBrief.model_validate(extract_json(raw))

                # The model sometimes rewrites or drops the topic.
                # It came from the user, so it is not the model's to change.
                brief.topic = topic
                brief.tone = tone
                return brief

            except Exception as exc:
                last_error = exc
                print(f"[BriefAgent] attempt {attempt + 1} failed: {exc}")

        raise RuntimeError(
            f"BriefAgent could not produce a valid brief after 3 attempts: {last_error}"
        )