from fastapi import APIRouter, HTTPException
from backend.db.repositories import AgentLogRepository, EpisodicMemoryRepository
from backend.models.api_dtos import MemoryTimelineDTO, TimelineEventDTO

router = APIRouter(prefix="/api/memory", tags=["memory"])

@router.get("/{case_id}", response_model=MemoryTimelineDTO)
async def get_case_memory(case_id: str):
    logs = await AgentLogRepository.get_logs_by_case(case_id)
    episodes = await EpisodicMemoryRepository.get_episodes_by_case(case_id)
    
    if not logs and not episodes:
        raise HTTPException(status_code=404, detail="No memory records found for this case")
        
    timeline_events = [
        TimelineEventDTO(
            timestamp=ep.timestamp,
            stage=ep.stage,
            event=ep.event_type,
            payload=ep.payload
        ) for ep in sorted(episodes, key=lambda x: x.timestamp)
    ]
        
    return MemoryTimelineDTO(
        case_id=case_id,
        logs_count=len(logs),
        episodes_count=len(episodes),
        timeline=timeline_events
    )
