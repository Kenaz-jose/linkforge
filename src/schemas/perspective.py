from pydantic import BaseModel, Field

"""
INTERVIEW LAYER
These models represent the temporary conversation between
the Perspective Layer and the user.

 Flow:

     Topic
       ↓
   Interview Agent
       ↓
   QuestionSet
       ↓
   User Answers
       ↓
     Answer

 The interview layer's job is to collect raw information
 from the user. It should NOT try to write the final
 LinkedIn post.
"""

class POVSection(BaseModel):
    """
    Raw user input for one dimension of their perspective.

    selected:
        Options explicitly selected by the user from the UI.

    custom:
        Optional free-form text when the predefined options do not
        fully represent what the user wants to say.
    """

    selected: list[str] = Field(default_factory=list)
    custom: str = ""


class POVCapture(BaseModel):
    """
    Raw perspective information captured directly from the user.

    This is intentionally different from PerspectiveBrief.

    POVCapture = what the user explicitly selected/wrote.

    PerspectiveBrief = the structured interpretation used by
    downstream content-generation agents.
    """

    opinion: POVSection = Field(default_factory=POVSection)
    experience: POVSection = Field(default_factory=POVSection)
    message: POVSection = Field(default_factory=POVSection)
    audience: POVSection = Field(default_factory=POVSection)
    
class POVOptionSet(BaseModel):
    """
    LLM-generated checkbox options used to help the user
    identify their own perspective.

    These are suggestions for the UI, NOT claims about what
    the user believes.

    The user must explicitly select an option before it becomes
    part of POVCapture.
    """

    opinion: list[str] = Field(
        default_factory=list,
        description="Candidate statements that help the user identify their opinion."
    )

    experience: list[str] = Field(
        default_factory=list,
        description="Candidate statements describing possible relevant experiences."
    )

    message: list[str] = Field(
        default_factory=list,
        description="Candidate statements describing possible reader takeaways."
    )

    audience: list[str] = Field(
        default_factory=list,
        description="Candidate descriptions of people who may care about the topic."
    )

class POVGapAnalysis(BaseModel):
    """
    Result of analyzing whether the captured POV contains enough
    information to create a genuinely personal LinkedIn post.

    This model does NOT generate or modify the user's perspective.

    The LLM only identifies an important missing piece and, if
    necessary, proposes one targeted follow-up question.
    """

    has_gap: bool = Field(
        description="Whether an important piece of perspective is missing."
    )

    missing_area: str | None = Field(
        default=None,
        description=(
            "The POV area that is missing or insufficient. "
            "Expected values: opinion, experience, message, audience."
        ),
    )

    reason: str | None = Field(
        default=None,
        description=(
            "Short explanation of why the missing information matters "
            "for creating a personal post."
        ),
    )

    question: str | None = Field(
        default=None,
        description=(
            "One targeted follow-up question that can fill the gap. "
            "Must be null when has_gap is false."
        ),
    )

    
class InterviewQuestion(BaseModel):
    """
    Represents one question asked during a perspective interview.

    Each question contains:
    - id          : Unique identifier used to connect an answer
                    back to this question.
    - text        : The actual question shown to the user.
    - why         : Explains why this question is being asked.
                    This can be displayed in the UI to encourage
                    more thoughtful answers.
    - placeholder : Example/guidance shown inside the answer box.
                    This helps the user understand the type of
                    answer the system is looking for.
    """

    id: str
    category: str = Field(description="The cognitive angle of this question (e.g., THE_TRENCHES, MISSING_METRIC, or a custom invented angle).")
    text: str = Field(description="The actual question text.")
    why: str = Field(description="One short line telling the user why this makes their post better.")
    placeholder: str = Field(description="A short example of the expected answer.")     

class QuestionSet(BaseModel):
    """
    Represents the collection of questions generated for
    one perspective interview.

    The Interview Agent should return a QuestionSet instead
    of an unstructured list.

    Example:

        QuestionSet(
            questions=[
                InterviewQuestion(...),
                InterviewQuestion(...),
                InterviewQuestion(...)
            ]
        )

    Field(default_factory=list) creates a NEW empty list for
    every QuestionSet instance.

    This is safer than using [] directly as a default value.
    """

    questions: list[InterviewQuestion] = Field(default_factory=list)


class Answer(BaseModel):
    """
    Represents the user's answer to one interview question.

    question_id:
        Connects the answer to the original question.

    question_text:
        Stores the actual question along with the answer.
        This makes the Answer object self-contained and useful
        even if the original QuestionSet is no longer available.

    answer:
        The user's raw response.

    Example:

        Answer(
            question_id="q1",
            question_text="What do you think about AI agents?",
            answer="I think AI agents are..."
        )
    """

    question_id: str
    question_text: str = ""
    answer: str = ""
    slm_feedback: str | None = None

"""
 PERSPECTIVE LAYER
 PerspectiveBrief is the most important object in this file.

 The interview collects RAW INFORMATION.

 PerspectiveBrief converts that information into a structured
 representation of what the user actually thinks.

 It acts as the contract between:

       Interview Layer
              ↓
       PerspectiveBrief
              ↓
       Content Generation Layer

 The Content Generator should NOT have to discover the user's
 perspective itself. It should receive an already synthesized
 PerspectiveBrief.
"""

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "to", "of", "in", "on", "for", "with", "at", "by", "from",
    "that", "this", "it", "as", "i", "we", "my", "our", "you", "your",
    "more", "most", "than", "when", "how", "what", "why", "not", "no",
    "can", "will", "would", "should", "about", "into", "over", "after",
}

def _keywords(text: str) -> set[str]:
        """Content words, lowercased. Crude but deterministic - no LLM call,
        no embedding model, no network."""
        words = "".join(c if c.isalnum() or c.isspace() else " " for c in text.lower()).split()
        return {w for w in words if len(w) > 3 and w not in STOPWORDS}


def _is_relevant(item: str, topic_keywords: set[str]) -> bool:
        """One shared content word is enough. The filter exists to drop the
        clearly unrelated, not to judge how related something is - being
        strict here would silently discard genuinely useful context."""
        return bool(_keywords(item) & topic_keywords)
        
class PerspectiveBrief(BaseModel):
    """
    Structured representation of the user's perspective on
    one specific topic.

    The fields intentionally separate different kinds of
    information so downstream agents can use them correctly.

    topic:
        The subject being discussed.

    thesis:
        The user's central position or claim.

        This should ideally be something that can be agreed with
        or disagreed with.

        Weak:
            "AI is changing software development."

        Stronger:
            "AI coding agents will change software development
             more through workflow redesign than replacing
             developers."

    evidence:
        First-hand experiences provided by the user.

        This is one of the most important fields for preventing
        generic AI-generated content.

    details:
        Concrete supporting information such as:
        - numbers
        - tools
        - timeframes
        - projects
        - technologies
        - specific events

    audience:
        The intended audience for the eventual content.

    takeaway:
        The main lesson or action the reader should leave with.
    """
    topic: str = ""
    thesis: str = ""
    evidence: list[str] = Field(default_factory=list)
    details: list[str] = Field(default_factory=list)
    audience: str = ""
    takeaway: str = ""
    tone: str = Field(default="Direct, punchy, and technical (like a senior engineer)")
    

    def to_prompt_block(self) -> str:
        """
        Converts the PerspectiveBrief into a standardized text
        block that can be inserted into an LLM prompt.

        Keeping this formatting inside the schema gives the
        PerspectiveBrief ONE canonical representation.

        This is useful because multiple agents may consume the
        same PerspectiveBrief:

            Generator
            Evaluator
            Refiner
            Critic
            etc.

        If every agent formats the object differently, their
        understanding of the user's perspective can drift.

        Therefore:

            PerspectiveBrief
                    ↓
             to_prompt_block()
                    ↓
              Same context
                    ↓
        Multiple downstream agents
        """

        def bullets(items: list[str]) -> str:
            """
            Converts a list into an indented bullet list.

            Example:

                ["Python", "LangGraph"]

            becomes:

                - Python
                - LangGraph
            """

            return (
                "\n".join(f"  - {i}" for i in items)
                if items
                else "  - (none given)"
            )

        return (
            f"TOPIC: {self.topic}\n"
            f"THE AUTHOR'S THESIS: {self.thesis}\n"
            f"THEIR FIRST-HAND EVIDENCE:\n{bullets(self.evidence)}\n"
            f"CONCRETE DETAILS:\n{bullets(self.details)}\n"
            f"AUDIENCE: {self.audience or 'Professionals on LinkedIn'}\n"
            f"READER TAKEAWAY: {self.takeaway}"
        )

    def thin_fields(self) -> list[str]:
        """
        Which parts of the brief lack enough material to write from.

        Returns human-readable labels rather than field names, because
        the caller is showing these to the author. Ordered by how much
        the gap hurts: missing evidence forces the generator to invent,
        which is the failure the faithfulness gate exists to catch.
        """
        weak = []

        if not self.evidence:
            weak.append("first-hand experience")

        if len(self.thesis.split()) < 5:
            weak.append("a clear position")

        if not self.details:
            weak.append("concrete specifics (numbers, tools, timeframes)")

        if not self.takeaway:
            weak.append("a reader takeaway")

        return weak

    def is_thin(self) -> bool:
        """
        Unchanged in meaning: missing evidence or a stub thesis makes a
        brief too weak to write personal content from. Now derived from
        thin_fields so there is one definition rather than two.
        """
        return "first-hand experience" in self.thin_fields() or \
               "a clear position" in self.thin_fields()

"""
 LONG-TERM USER MEMORY
 UserMemory represents what LinkedInForge has learned about
 this specific person across multiple interviews.

 PerspectiveBrief is TOPIC-SPECIFIC.

 UserMemory is USER-SPECIFIC.

 Example:

   PerspectiveBrief
       "AI coding agents"
             ↓
       UserMemory
             ↓
   Known view:
       "AI agents are useful for repetitive implementation."

 Future interview:

   UserMemory
        ↓
   Interview Agent
        ↓
   More personalized questions
"""

class UserMemory(BaseModel):
    """
    Lightweight long-term memory for a LinkedInForge user.

    This is intentionally simple for the MVP.

    IMPORTANT:
    This should eventually evolve from simple lists into a
    structured/retrievable memory system.

    Possible future evolution:

        Lists
          ↓
        Structured memories
          ↓
        Semantic retrieval
          ↓
        Relationships between memories
          ↓
        Perspective Graph / Digital Twin
    """

    user_id: str
    known_views: list[str] = Field(default_factory=list)
    known_experiences: list[str] = Field(default_factory=list)
    past_topics: list[str] = Field(default_factory=list)
    audience: str = ""
    interviews_done: int = 0

    def to_prompt_block(self, topic: str = "") -> str:
        """
        Memory as prompt text, filtered to what relates to this topic.

        Without the filter, a memory block full of specifics from past
        interviews outweighs a two-word topic and the interviewer drifts
        back to old subjects. Views and experiences are therefore filtered;
        audience and interview count are not, since those calibrate how to
        ask rather than what to ask about.

        Passing no topic returns everything, which is what callers that
        are not conducting an interview want.
        """
        if self.interviews_done == 0:
            return "(First interview with this person — nothing known yet)"

        views = self.known_views
        experiences = self.known_experiences

        if topic:
            topic_keywords = _keywords(topic)
            if topic_keywords:
                views = [v for v in views if _is_relevant(v, topic_keywords)]
                experiences = [e for e in experiences if _is_relevant(e, topic_keywords)]

        def bullets(items: list[str]) -> str:
            return (
                "\n".join(f"  - {i}" for i in items)
                if items
                else "  - (nothing known that relates to this topic)"
            )

        return (
            f"KNOWN VIEWS:\n{bullets(views)}\n"
            f"KNOWN EXPERIENCES:\n{bullets(experiences)}\n"
            f"AUDIENCE: {self.audience or '(not known)'}\n"
            f"INTERVIEWS COMPLETED: {self.interviews_done}"
        )


    def absorb(self, brief: PerspectiveBrief) -> "UserMemory":
        """
        Adds information from a newly created PerspectiveBrief
        into the user's long-term memory.

        Flow:

            PerspectiveBrief
                    ↓
                 absorb()
                    ↓
              UserMemory
                    ↓
           Future interviews

        This method intentionally does NOT use an LLM.

        The PerspectiveBrief has already been synthesized.
        Memory updates should therefore be deterministic.

        Benefits:
        - cheaper
        - faster
        - predictable
        - no additional hallucination risk
        """

        def add(target: list[str],items: list[str],cap: int) -> list[str]:
            """
            Add new items to a memory list.

            Responsibilities:

            1. Avoid duplicates.
            2. Ignore empty strings.
            3. Keep the memory bounded.

            Deduplication is case-insensitive.

            Example:

                Existing:
                    "AI agents are useful"

                New:
                    "ai agents are useful"

                Result:
                    Only one copy is stored.
            """

            seen = {
                t.strip().lower()
                for t in target
            }

            for item in items:

                key = item.strip().lower()
                if key and key not in seen:

                    target.append(item.strip())
                    seen.add(key)
            return target[-cap:]


        if brief.thesis:
            self.known_views = add(self.known_views,[brief.thesis],20)

        self.known_experiences = add(self.known_experiences,brief.evidence,20)

        if brief.topic:
            self.past_topics = add(self.past_topics,[brief.topic],50)


        if brief.audience:
            self.audience = brief.audience


        self.interviews_done += 1

        return self