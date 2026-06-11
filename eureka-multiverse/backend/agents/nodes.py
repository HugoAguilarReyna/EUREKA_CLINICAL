from typing import Any, Dict
from datetime import datetime
import uuid
from backend.langgraph.state import CaseContext
from backend.ml.predictor_v0 import predict_v0
from backend.fuzzy.engine import evaluate_fuzzy
from backend.models.memory import AgentLogDTO, EpisodeDTO
from backend.memory.service import CaseMemoryService

def _log(state: CaseContext, agent: str, action: str, event_type: str, payload: dict):
    # LangGraph usará reducer 'add' por lo que retornamos un dict con las listas
    now = datetime.utcnow().isoformat()
    return {
        "agent_logs": [AgentLogDTO(agent_name=agent, action=action, timestamp=now)],
        "episodes": [EpisodeDTO(stage=agent, event_type=event_type, payload=payload, timestamp=now)]
    }

def run_core(state: CaseContext) -> dict:
    tid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    return {
        "trace_id": tid,
        "current_stage": "CORE",
        "created_at": now,
        **_log(state, "CORE", "Inicializó caso", "CASE_STARTED", {"trace_id": tid})
    }

def run_structurer(state: CaseContext) -> dict:
    raw = state.get("working_memory", {}).get("raw_features", {})
    quality = {"status": "OK", "missing_fields": []}
    if not raw:
        quality["status"] = "ERROR"
    return {
        "quality_report": quality,
        "current_stage": "STRUCTURER",
        **_log(state, "STRUCTURER", "Validó calidad de datos", "QUALITY_CHECK", quality)
    }

def run_descriptor(state: CaseContext) -> dict:
    raw = state.get("working_memory", {}).get("raw_features", {})
    features = dict(raw)
    
    if "A_G_Ratio" not in features and "ALB" in features and "TP" in features:
        try:
            globulin = features["TP"] - features["ALB"]
            features["A_G_Ratio"] = features["ALB"] / globulin if globulin > 0 else 0
        except ZeroDivisionError:
            features["A_G_Ratio"] = 0
            
    report = {"derived_features": ["A_G_Ratio"] if "A_G_Ratio" not in raw else []}
    return {
        "working_memory": {"raw_features": raw, "features": features},
        "descriptor_report": report,
        "current_stage": "DESCRIPTOR",
        **_log(state, "DESCRIPTOR", "Calculó features derivadas", "FEATURES_DERIVED", report)
    }

def run_predictor(state: CaseContext) -> dict:
    features = state.get("working_memory", {}).get("features", {})
    score = predict_v0(features)
    risk_class = "HIGH" if score > 0.6 else ("MEDIUM" if score > 0.3 else "LOW")
    
    pred = {
        "model_version": "v0_heuristic",
        "risk_score": score,
        "risk_class": risk_class,
        "confidence": 1.0
    }
    return {
        "prediction_result": pred,
        "current_stage": "PREDICTOR",
        **_log(state, "PREDICTOR", f"Predicción generada: {risk_class}", "PREDICTION", pred)
    }

def run_fuzzy(state: CaseContext) -> dict:
    features = state.get("working_memory", {}).get("features", {})
    tb = features.get("TB", 0.0)
    db = features.get("DB", 0.0)
    ag = features.get("A_G_Ratio", 0.0)
    
    fuzzy_out = evaluate_fuzzy(tb, db, ag)
    return {
        "fuzzy_interpretation": fuzzy_out,
        "current_stage": "FUZZY",
        **_log(state, "FUZZY", "Evaluación difusa completada", "FUZZY_INFERENCE", fuzzy_out)
    }

def run_prescriptor(state: CaseContext) -> dict:
    pred_class = state.get("prediction_result", {}).get("risk_class", "UNKNOWN")
    fuzzy_class = state.get("fuzzy_interpretation", {}).get("fuzzy_class", "UNKNOWN")
    
    rec = {"type": "GENERAL", "detail": "Monitoreo rutinario."}
    if pred_class == "HIGH" or fuzzy_class == "HIGH":
        rec = {"type": "CLINICAL", "detail": "Alerta: Riesgo hepático alto detectado. Se sugiere interconsulta con Hepatología."}
        
    act_plan = [{"action": "Programar laboratorios", "priority": "high" if pred_class=="HIGH" else "low"}]
    
    return {
        "recommendation": rec,
        "action_plan": act_plan,
        "current_stage": "PRESCRIPTOR",
        "updated_at": datetime.utcnow().isoformat(),
        **_log(state, "PRESCRIPTOR", "Recomendación emitida", "RECOMMENDATION", {"rec": rec})
    }

async def run_memory_commit(state: CaseContext) -> dict:
    """Nodo final ASÍNCRONO para persistir todo el estado en MongoDB."""
    await CaseMemoryService.commit_case(state)
    return {"current_stage": "COMMITTED"}
