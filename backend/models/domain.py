from datetime import datetime
from typing import Dict, Any, Optional, List
from beanie import Document
from pydantic import BaseModel, Field

class FeatureMap(BaseModel):
    Age: Optional[float] = None
    Gender: Optional[str] = None
    TB: float
    DB: float
    Alkphos: float
    Sgpt: float
    Sgot: float
    TP: float
    ALB: float
    A_G_Ratio: Optional[float] = None

class Patient(Document):
    patient_id: str
    name: str
    dob: datetime
    gender: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "patients"

class Case(Document):
    case_id: str
    patient_id: str
    status: str = "UPLOADED"
    raw_data: FeatureMap
    
    # Datos destilados
    prediction_result: Optional[Dict[str, Any]] = None
    fuzzy_interpretation: Optional[Dict[str, Any]] = None
    recommendation: Optional[Dict[str, Any]] = None
    action_plan: Optional[List[Dict[str, Any]]] = None

    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "cases"
