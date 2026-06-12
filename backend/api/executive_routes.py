from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from backend.intelligence.executive_console_engine import ExecutiveConsoleEngine
from backend.intelligence.clinical_digital_twin import ClinicalDigitalTwin
from backend.intelligence.executive_audit_engine import ExecutiveAuditEngine

router = APIRouter(prefix="/knowledge/executive", tags=["executive"])

console_engine = ExecutiveConsoleEngine()
twin_simulator = ClinicalDigitalTwin()
audit_engine = ExecutiveAuditEngine()

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

@router.get("/audit/health-score")
async def audit_health_score():
    try:
        return audit_engine.get_health_score_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit/critical-population")
async def audit_critical_population():
    try:
        return audit_engine.get_critical_population_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit/rule-consistency")
async def audit_rule_consistency():
    try:
        return audit_engine.get_rule_consistency_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit/definitions")
async def audit_definitions():
    try:
        return audit_engine.get_definitions_audit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audit/simulator")
async def audit_simulator(request: SimulationRequest):
    try:
        results = twin_simulator.simulate(request.modifications)
        return {
            "baseline_critical": results.get("baseline_critical_patients"),
            "projected_critical": results.get("projected_critical_patients"),
            "delta": results.get("critical_patients_delta"),
            "assumptions": results.get("ground_truth_audit", {}).get("assumptions", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
