from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class FeatureMapDTO(BaseModel):
    Age: Optional[float] = None
    Gender: Optional[str] = None
    TB: float
    DB: float
    Alkphos: float
    Sgpt: Optional[float] = None
    Sgot: float
    TP: float
    ALB: float
    A_G_Ratio: Optional[float] = None

class CaseSummaryDTO(BaseModel):
    case_id: str
    patient_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    risk_class: Optional[str] = None

class CaseResponseDTO(BaseModel):
    case_id: str
    patient_id: str
    status: str
    raw_data: FeatureMapDTO
    prediction_result: Optional[Dict[str, Any]] = None
    fuzzy_interpretation: Optional[Dict[str, Any]] = None
    recommendation: Optional[Dict[str, Any]] = None
    action_plan: Optional[List[Dict[str, Any]]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

class TimelineEventDTO(BaseModel):
    timestamp: datetime
    stage: str
    event: str
    payload: Dict[str, Any]

class MemoryTimelineDTO(BaseModel):
    case_id: str
    logs_count: int
    episodes_count: int
    timeline: List[TimelineEventDTO]
