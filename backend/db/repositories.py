from typing import List, Optional
from backend.models.domain import Case
from backend.models.memory import AgentLog, EpisodicMemoryRecord

class CaseRepository:
    @staticmethod
    async def save_case(case: Case) -> Case:
        await case.save()
        return case

    @staticmethod
    async def get_case(case_id: str) -> Optional[Case]:
        return await Case.find_one(Case.case_id == case_id)

    @staticmethod
    async def list_cases(skip: int = 0, limit: int = 10) -> List[Case]:
        return await Case.find().skip(skip).limit(limit).to_list()

class AgentLogRepository:
    @staticmethod
    async def insert_logs(logs: List[AgentLog]):
        if logs:
            await AgentLog.insert_many(logs)
            
    @staticmethod
    async def get_logs_by_case(case_id: str) -> List[AgentLog]:
        return await AgentLog.find(AgentLog.case_id == case_id).to_list()

class EpisodicMemoryRepository:
    @staticmethod
    async def insert_episodes(episodes: List[EpisodicMemoryRecord]):
        if episodes:
            await EpisodicMemoryRecord.insert_many(episodes)
            
    @staticmethod
    async def get_episodes_by_case(case_id: str) -> List[EpisodicMemoryRecord]:
        return await EpisodicMemoryRecord.find(EpisodicMemoryRecord.case_id == case_id).to_list()
