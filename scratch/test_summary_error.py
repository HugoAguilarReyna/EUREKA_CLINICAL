import asyncio
import sys
import os

sys.path.append(".")

from backend.api.graph_routes import get_analytics_summary
from backend.graph.services.graph_service import GraphService
from backend.db.database import init_db

async def run():
    # Initalize Beanie connection since we use Beanie model definitions and MongoDB connection
    await init_db()
    
    service = GraphService()
    res = await get_analytics_summary(service)
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(run())
