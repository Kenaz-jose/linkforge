from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from src.schemas.perspective import (
    Answer,
    PerspectiveBrief,
    InterviewQuestion,
    POVCapture,
    POVGapAnalysis
)

class OptimizeRequest(BaseModel):
    thread_id: str
    topic: str
    brief: Dict[str, Any]
    tone: Optional[str] = "Direct, punchy, and technical (like a senior engineer)"
    needs_live_context: Optional[bool] = False

class FeedbackRequest(BaseModel):
    thread_id: str
    feedback: Optional[str] = None
    approved_references: Optional[List[Dict[str, Any]]] = None

class OptimizeResponse(BaseModel):
    thread_id: str
    post: str
    verdict: Dict[str, Any]
    evaluation: Dict[str, Any]
    iteration: int
    status: str
    proposed_references: Optional[List[Dict[str, Any]]] = None
    reasoning_steps: List[str] = []

class TopicRequest(BaseModel):
    topic: str
    
class StartInterviewRequest(BaseModel):
    topic: str
    tone: str

class ProbeInterviewRequest(BaseModel):
    topic: str
    tone: str
    answers: List[Answer]

class FinishInterviewRequest(BaseModel):
    topic: str
    tone: str
    answers: List[Answer]
    was_probed: Optional[bool] = False

class FinishInterviewResponse(BaseModel):
    brief_id: str
    brief: PerspectiveBrief

class InterviewTurnRequest(BaseModel):
    topic: str
    tone: str
    answers: List[Answer]

class InterviewTurnResponse(BaseModel):
    complete: bool
    question: Optional[InterviewQuestion] = None

class POVCaptureRequest(BaseModel):
    topic: str
    tone: str
    pov: POVCapture

class POVGapRequest(BaseModel):
    topic: str
    pov: POVCapture


class POVGapResponse(BaseModel):
    gap: POVGapAnalysis

class LiveContextRequest(BaseModel):
    topic: str
    thesis: str