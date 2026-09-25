import json
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from src.prompts.pov_gap import POV_GAP_PROMPT
from src.schemas.perspective import POVCapture, POVGapAnalysis

load_dotenv() 

class POVGapAgent:
    """
    Determines whether a captured POV contains enough information
    to create a genuinely personal LinkedIn post.

    If an important gap exists, the agent identifies the missing
    area and generates exactly one targeted follow-up question.
    """

    def __init__(self):
        self.llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.2,
            max_retries=2,
        )

        self.prompt = ChatPromptTemplate.from_template(
            POV_GAP_PROMPT
        )

        self.chain = self.prompt | self.llm

    def invoke(
        self,
        topic: str,
        pov: POVCapture,
        memory_block: str = "",
    ) -> POVGapAnalysis:
        """
        Analyze the user's POV for important missing information.

        Args:
            topic:
                The LinkedIn post topic.

            pov:
                Raw perspective information explicitly provided
                by the user.

            memory_block:
                Relevant information from the user's long-term
                memory. This provides context but must not override
                the current POV.

        Returns:
            POVGapAnalysis containing either:
            - no gap, or
            - one important missing area and one follow-up question.
        """

        pov_block = self.format_pov(pov)

        response = self.chain.invoke(
            {
                "topic": topic,
                "pov_block": pov_block,
                "memory_block": memory_block or "(no prior context)",
            }
        )

        content = response.content

        # Some models may return JSON inside a markdown code block.
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "").strip()
        elif "```" in content:
            content = content.replace("```", "").strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"POV gap analysis returned invalid JSON: {content}"
            ) from exc

        return POVGapAnalysis.model_validate(data)

    @staticmethod
    def format_pov(pov: POVCapture) -> str:
        """
        Convert the raw POVCapture into a clear prompt representation.

        Only information explicitly provided by the user is included.
        """

        def format_section(name: str, section) -> str:
            selected = (
                "\n".join(f"- {item}" for item in section.selected)
                if section.selected
                else "- (none selected)"
            )

            custom = section.custom.strip() or "(none)"

            return (
                f"{name.upper()}:\n"
                f"SELECTED:\n{selected}\n"
                f"CUSTOM:\n{custom}"
            )

        return "\n\n".join(
            [
                format_section("Opinion", pov.opinion),
                format_section("Experience", pov.experience),
                format_section("Message", pov.message),
                format_section("Audience", pov.audience),
            ]
        )


# Reusable agent instance
_pov_gap_agent = POVGapAgent()


def analyze_pov_gap(
    topic: str,
    pov: POVCapture,
    memory_block: str = "",
) -> POVGapAnalysis:
    """
    Convenience function used by the service layer.
    """
    return _pov_gap_agent.invoke(
        topic=topic,
        pov=pov,
        memory_block=memory_block,
    )