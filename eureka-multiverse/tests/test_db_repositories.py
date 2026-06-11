import pytest
from backend.models.domain import Case, FeatureMap
from backend.models.memory import AgentLog, EpisodicMemoryRecord
from backend.db.repositories import CaseRepository, AgentLogRepository, EpisodicMemoryRepository
from datetime import datetime

@pytest.mark.asyncio
async def test_case_repository():
    case = Case(case_id="C-123", patient_id="P-01", raw_data=FeatureMap(TB=1.0, DB=0.5, Alkphos=100, Sgot=30, TP=6.0, ALB=3.0))
    await CaseRepository.save_case(case)
    
    fetched = await CaseRepository.get_case("C-123")
    assert fetched is not None
    assert fetched.patient_id == "P-01"
    
    cases = await CaseRepository.list_cases()
    assert len(cases) > 0

@pytest.mark.asyncio
async def test_agent_log_repository():
    logs = [
        AgentLog(case_id="C-123", trace_id="T-1", agent_name="CORE", action="Start", timestamp=datetime.utcnow()),
        AgentLog(case_id="C-123", trace_id="T-1", agent_name="FUZZY", action="Calc", timestamp=datetime.utcnow())
    ]
    await AgentLogRepository.insert_logs(logs)
    
    fetched = await AgentLogRepository.get_logs_by_case("C-123")
    assert len(fetched) == 2

@pytest.mark.asyncio
async def test_episodic_memory_repository():
    episodes = [
        EpisodicMemoryRecord(case_id="C-123", trace_id="T-1", stage="INIT", event_type="STARTED", payload={}, timestamp=datetime.utcnow())
    ]
    await EpisodicMemoryRepository.insert_episodes(episodes)
    
    fetched = await EpisodicMemoryRepository.get_episodes_by_case("C-123")
    assert len(fetched) == 1
    assert fetched[0].stage == "INIT"
