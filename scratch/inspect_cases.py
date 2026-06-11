import asyncio
import motor.motor_asyncio
from beanie import init_beanie
from backend.db.config import settings
from backend.models.domain import Patient, Case

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[Patient, Case]
    )
    
    count = await Case.count()
    print(f"Total cases in MongoDB: {count}")
    
    if count > 0:
        first_case = await Case.find_one()
        print("First case raw_data:", first_case.raw_data.model_dump())
        print("First case prediction_result:", first_case.prediction_result)

if __name__ == "__main__":
    asyncio.run(main())
