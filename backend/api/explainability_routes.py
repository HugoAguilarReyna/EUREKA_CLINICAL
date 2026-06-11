"""
Sprint 3D.5 — FASE 6 & 7: Explainability + Traceability API Routes
POST /knowledge/explain/{patient_id}
POST /knowledge/trace/{patient_id}
"""
import time
from fastapi import APIRouter, HTTPException
from backend.explainability.clinical_explainability import ClinicalExplainabilityEngine
from backend.traceability.causal_trace import CausalTraceEngine
from backend.graph.logger import logger

router = APIRouter(prefix="/knowledge", tags=["explainability", "traceability"])

_explainer = ClinicalExplainabilityEngine()
_tracer = CausalTraceEngine()


@router.get("/explain/{patient_id}")
async def explain_patient(patient_id: str):
    """
    Explains why a patient was classified as diseased or healthy.

    Returns:
    - classification (Liver Disease | Healthy)
    - confidence score
    - contributing_factors with disease_rate, clinical_context, correlation
    - clinical_narrative
    - caveats
    - next_steps
    """
    t0 = time.time()
    try:
        result = _explainer.explain(patient_id)
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": "explain_patient",
            "patient_id": patient_id,
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": result.get("factor_count", 0),
            "edges_returned": 0
        })
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"explain_patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trace/{patient_id}")
async def trace_patient(patient_id: str):
    """
    Returns the full 5-layer causal trace for a patient:
    Source Data → Interpretation → Clinical State → Association → Prediction.
    Includes ASCII diagram and narrative.
    """
    t0 = time.time()
    try:
        result = _tracer.trace(patient_id)
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": "trace_patient",
            "patient_id": patient_id,
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": result.get("summary", {}).get("clinical_states_activated", 0),
            "edges_returned": result.get("summary", {}).get("disease_associations", 0)
        })
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"trace_patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
