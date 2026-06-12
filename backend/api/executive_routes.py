from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from backend.intelligence.executive_console_engine import ExecutiveConsoleEngine
from backend.intelligence.clinical_digital_twin import ClinicalDigitalTwin

router = APIRouter(prefix="/knowledge/executive", tags=["executive"])

console_engine = ExecutiveConsoleEngine()
twin_simulator = ClinicalDigitalTwin()

class SimulationRequest(BaseModel):
    modifications: List[Dict[str, Any]]

@router.get("/overview")
async def get_executive_overview():
    """
    Returns the unified status payload for the Dashboard 3.0.
    Consolidated to prevent multiple parallel database hits.
    """
    try:
        overview = console_engine.get_overview()
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/twin-simulate")
async def simulate_twin(request: SimulationRequest):
    """
    Runs an in-memory simulation on the Digital Twin.
    """
    try:
        results = twin_simulator.simulate(request.modifications)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
