import json
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from src.prompts.pov_options import POV_OPTIONS_PROMPT
from src.schemas.perspective import POVOptionSet

load_dotenv(override=True)


class POVOptionAgent:
    """
    Generates candidate POV options for the four POV sections:

    - Opinion
    - Experience
    - Message
    - Audience

    User memory is provided to ground the generated options,
    especially experience options.

    The user must explicitly select an option before it becomes
    part of their POVCapture.
    """

    def __init__(self):
        self.llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.4,
            max_retries=2,
        )

        self.prompt = ChatPromptTemplate.from_template(
            POV_OPTIONS_PROMPT
        )

        self.chain = self.prompt | self.llm

    def invoke(
        self,
        topic: str,
        memory_block: str = "",
    ) -> POVOptionSet:
        """
        Generate POV options for the given topic using relevant
        user memory.

        Args:
            topic: The LinkedIn post topic.
            memory_block: Relevant user memory formatted for the prompt.

        Returns:
            POVOptionSet containing candidate options for
            opinion, experience, message, and audience.
        """

        response = self.chain.invoke(
            {
                "topic": topic,
                "memory_block": memory_block or "(no prior user context available)",
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
                f"POV option generation returned invalid JSON: {content}"
            ) from exc

        return POVOptionSet.model_validate(data)


# Reusable agent instance
_pov_option_agent = POVOptionAgent()


def generate_pov_options(
    topic: str,
    memory_block: str = "",
) -> POVOptionSet:
    """
    Convenience function used by the service layer.
    """
    return _pov_option_agent.invoke(
        topic=topic,
        memory_block=memory_block,
    )