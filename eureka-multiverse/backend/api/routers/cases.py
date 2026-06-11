from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import uuid
from backend.langgraph.workflow import eureka_graph
from backend.db.repositories import CaseRepository
from backend.models.api_dtos import CaseResponseDTO, CaseSummaryDTO

router = APIRouter(prefix="/api/cases", tags=["cases"])

class AnalyzeRequest(BaseModel):
    features: Dict[str, float]

class AnalyzeResponse(BaseModel):
    case_id: str
    prediction: Dict
    risk: str
    recommendation: str

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_case(request: AnalyzeRequest):
    case_id = f"C-{uuid.uuid4().hex[:8]}"
    
    initial_state = {
        "case_id": case_id,
        "patient_id": "UNKNOWN",
        "dataset_id": "UNKNOWN",
        "trace_id": "",
        "current_stage": "INIT",
        "working_memory": {"raw_features": request.features},
        "agent_logs": [],
        "episodes": [],
        "knowledge_assets_used": [],
        "quality_report": {},
        "descriptor_report": {},
        "prediction_result": {},
        "fuzzy_interpretation": {},
        "recommendation": {},
        "action_plan": [],
        "created_at": "",
        "updated_at": ""
    }
    
    final_state = await eureka_graph.ainvoke(initial_state)
    
    return AnalyzeResponse(
        case_id=final_state.get("case_id"),
        prediction=final_state.get("prediction_result", {}),
        risk=final_state.get("fuzzy_interpretation", {}).get("fuzzy_class", "UNKNOWN"),
        recommendation=final_state.get("recommendation", {}).get("detail", "")
    )

@router.get("", response_model=List[CaseSummaryDTO])
async def list_cases(skip: int = 0, limit: int = 10):
    cases = await CaseRepository.list_cases(skip, limit)
    return [
        CaseSummaryDTO(
            case_id=c.case_id,
            patient_id=c.patient_id,
            status=c.status,
            started_at=c.started_at,
            completed_at=c.completed_at,
            risk_class=c.fuzzy_interpretation.get("fuzzy_class") if c.fuzzy_interpretation else None
        ) for c in cases
    ]

@router.get("/{case_id}", response_model=CaseResponseDTO)
async def get_case(case_id: str):
    c = await CaseRepository.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponseDTO(
        case_id=c.case_id,
        patient_id=c.patient_id,
        status=c.status,
        raw_data=c.raw_data.model_dump(),
        prediction_result=c.prediction_result,
        fuzzy_interpretation=c.fuzzy_interpretation,
        recommendation=c.recommendation,
        action_plan=c.action_plan,
        started_at=c.started_at,
        completed_at=c.completed_at
    )
