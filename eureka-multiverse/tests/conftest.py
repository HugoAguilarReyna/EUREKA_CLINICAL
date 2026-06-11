import pytest
import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from mongomock_motor import AsyncMongoMockClient
from beanie import init_beanie
from backend.models.domain import Patient, Case
from backend.models.memory import AgentLog, EpisodicMemoryRecord

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

import pytest_asyncio

@pytest_asyncio.fixture(autouse=True)
async def init_mock_db():
    client = AsyncMongoMockClient()
    await init_beanie(
        document_models=[Patient, Case, AgentLog, EpisodicMemoryRecord],
        database=client.get_database("eureka_test_db")
    )

@pytest.fixture
def empty_state():
    return {
        "case_id": "test_case",
        "patient_id": "UNKNOWN",
        "dataset_id": "UNKNOWN",
        "trace_id": "",
        "current_stage": "INIT",
        "working_memory": {},
        "agent_logs": [],
        "episodes": [],
        "knowledge_assets_used": [],
        "quality_report": {},
        "descriptor_report": {},
        "prediction_result": {},
        "fuzzy_interpretation": {},
        "recommendation": {},
        "action_plan": [],
        "created_at": "",
        "updated_at": ""
    }
