import motor.motor_asyncio
from beanie import init_beanie
from backend.db.config import settings

async def init_db():
    # Cargar modelos dinámicamente o importarlos aquí
    from backend.models.domain import Patient, Case
    from backend.models.memory import EpisodicMemoryRecord

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[
            Patient,
            Case,
            EpisodicMemoryRecord
        ]
    )
