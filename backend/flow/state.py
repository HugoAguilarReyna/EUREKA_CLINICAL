from typing import TypedDict, List, Dict, Any
from backend.models.memory import AgentLogDTO, EpisodeDTO
from operator import add
from typing import Annotated

class CaseContext(TypedDict):
    # Identidad
    case_id: str
    patient_id: str
    dataset_id: str
    trace_id: str
    
    # Control de Flujo
    current_stage: str
    
    # Memoria Operacional
    working_memory: Dict[str, Any]
    
    # Logs y Episodios (Usamos Annotated + add para que LangGraph haga append real)
    agent_logs: Annotated[List[AgentLogDTO], add]
    episodes: Annotated[List[EpisodeDTO], add]
    knowledge_assets_used: List[str]
    
    # Entregables
    quality_report: Dict[str, Any]
    descriptor_report: Dict[str, Any]
    prediction_result: Dict[str, Any]
    fuzzy_interpretation: Dict[str, Any]
    
    # Resultado Final
    recommendation: Dict[str, Any]
    action_plan: List[Dict[str, Any]]
    
    # Tiempos
    created_at: str
    updated_at: str
