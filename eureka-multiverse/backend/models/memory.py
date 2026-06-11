from datetime import datetime
from typing import Dict, Any, Optional
from beanie import Document
from pydantic import BaseModel, Field

# --- DTOs para el State (memoria en ejecución) ---
class AgentLogDTO(BaseModel):
    agent_name: str
    action: str
    timestamp: str

class EpisodeDTO(BaseModel):
    stage: str
    event_type: str
    payload: Dict[str, Any]
    timestamp: str

# --- Documentos Mongo (persistencia) ---
class AgentLog(Document):
    case_id: str
    trace_id: str
    agent_name: str
    action: str
    timestamp: datetime

    class Settings:
        name = "agent_logs"

class EpisodicMemoryRecord(Document):
    case_id: str
    trace_id: str
    stage: str
    event_type: str
    payload: Dict[str, Any]
    timestamp: datetime

    class Settings:
        name = "episodic_memory"
