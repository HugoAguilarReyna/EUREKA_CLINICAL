from typing import Dict, Any, List
from datetime import datetime
from backend.langgraph.state import CaseContext
from backend.models.domain import Case, FeatureMap
from backend.models.memory import AgentLog, EpisodicMemoryRecord
from backend.db.repositories import CaseRepository, AgentLogRepository, EpisodicMemoryRepository

class CaseMemoryService:
    @staticmethod
    async def commit_case(state: CaseContext):
        """Toma el estado final de LangGraph y lo persiste de golpe."""
        case_id = state.get("case_id")
        
        # 1. Crear o actualizar Case
        case = await CaseRepository.get_case(case_id)
        if not case:
            raw_data = state.get("working_memory", {}).get("raw_features", {})
            # Eliminar A_G_Ratio de raw_data si no es válido
            if "A_G_Ratio" in raw_data and raw_data["A_G_Ratio"] is None:
                raw_data["A_G_Ratio"] = 0.0

            case = Case(
                case_id=case_id,
                patient_id=state.get("patient_id", "UNKNOWN"),
                raw_data=FeatureMap(**raw_data),
                started_at=datetime.fromisoformat(state.get("created_at")) if state.get("created_at") else datetime.utcnow()
            )
            
        case.status = "COMPLETED"
        case.prediction_result = state.get("prediction_result")
        case.fuzzy_interpretation = state.get("fuzzy_interpretation")
        case.recommendation = state.get("recommendation")
        case.action_plan = state.get("action_plan")
        case.completed_at = datetime.utcnow()
        await CaseRepository.save_case(case)

        # 2. Bulk Insert de AgentLogs
        logs = []
        for log_dto in state.get("agent_logs", []):
            logs.append(AgentLog(
                case_id=case_id,
                trace_id=state.get("trace_id", ""),
                agent_name=log_dto.agent_name,
                action=log_dto.action,
                timestamp=datetime.fromisoformat(log_dto.timestamp)
            ))
        await AgentLogRepository.insert_logs(logs)

        # 3. Bulk Insert de Episodic Memory
        episodes = []
        for ep_dto in state.get("episodes", []):
            episodes.append(EpisodicMemoryRecord(
                case_id=case_id,
                trace_id=state.get("trace_id", ""),
                stage=ep_dto.stage,
                event_type=ep_dto.event_type,
                payload=ep_dto.payload,
                timestamp=datetime.fromisoformat(ep_dto.timestamp)
            ))
        await EpisodicMemoryRepository.insert_episodes(episodes)
        
        return case
