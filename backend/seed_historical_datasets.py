import asyncio
import json
import copy
from datetime import datetime, timedelta
import motor.motor_asyncio
from beanie import init_beanie

import sys
import os

# Add the backend dir to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.db.config import settings
from backend.models.domain import Patient, Case
from backend.models.memory import EpisodicMemoryRecord
from backend.models.intelligence import DecisionInsightRecord, MinedRuleRecord
from backend.intelligence.dataset_memory import DatasetHistoryRecord

async def seed():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[
            Patient,
            Case,
            EpisodicMemoryRecord,
            DecisionInsightRecord,
            MinedRuleRecord,
            DatasetHistoryRecord
        ]
    )
    
    print("Clearing existing DatasetHistory...")
    await DatasetHistoryRecord.find_all().delete()
    
    # Let's fetch the current state from Neo4j to use as the base (Dataset Enero)
    # We will use the REST API to register Enero
    import requests
    res = requests.post('http://localhost:8001/knowledge/datasets/register?name=Dataset%20Enero')
    if res.status_code != 200:
        print("Failed to register base dataset:", res.text)
        return
        
    print("Base dataset registered (Enero).")
    
    docs = await DatasetHistoryRecord.find_all().sort("-created_at").to_list()
    base_doc = docs[0]
    
    # ----------------------------------------------------
    # DATASET FEBRERO: Empeoramiento
    # - DB (Bilirrubina Directa) afecta a más pacientes.
    # - Correlación de DB con la enfermedad aumenta.
    # ----------------------------------------------------
    doc_feb = copy.deepcopy(base_doc)
    doc_feb.id = None
    doc_feb.dataset_name = "Dataset Febrero"
    doc_feb.dataset_id = "SNAP_20260201000000_Dataset_Febrero"
    doc_feb.created_at = base_doc.created_at + timedelta(days=30)
    
    # Mutar features
    for f in doc_feb.top_features:
        if f.get("feature") == "DB":
            f["correlation"] = f["correlation"] * 1.15 # correlation increases by 15% (becomes more negative if it was negative)
            
    # Mutar insights
    for i in doc_feb.insights:
        if "Bilirrubina Directa" in i.get("title", ""):
            i["affected_population"] = int(i["affected_population"] * 1.25) # Increase by 25%
            
    await doc_feb.insert()
    print("Dataset Febrero registered (Empeoramiento).")
    
    # ----------------------------------------------------
    # DATASET MARZO: Mejora
    # - DB reduce su impacto.
    # - Nueva variable de riesgo "Alkphos" aparece
    # ----------------------------------------------------
    doc_mar = copy.deepcopy(doc_feb)
    doc_mar.id = None
    doc_mar.dataset_name = "Dataset Marzo"
    doc_mar.dataset_id = "SNAP_20260301000000_Dataset_Marzo"
    doc_mar.created_at = doc_feb.created_at + timedelta(days=30)
    
    # Mutar features
    for f in doc_mar.top_features:
        if f.get("feature") == "DB":
            f["correlation"] = f["correlation"] * 0.8 # correlation decreases
            
    # Mutar insights
    for i in doc_mar.insights:
        if "Bilirrubina Directa" in i.get("title", ""):
            i["affected_population"] = int(i["affected_population"] * 0.8) # Decrease by 20%
            
    await doc_mar.insert()
    print("Dataset Marzo registered (Mejora).")

if __name__ == "__main__":
    asyncio.run(seed())
