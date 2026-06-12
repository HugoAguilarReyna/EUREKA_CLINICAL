import os
import sys
import json
from pymongo import MongoClient

# Add backend to path to import config
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from backend.db.config import settings

def run_census():
    client = MongoClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]
    edges_col = db["semantic_graph_edges"]
    
    pipeline = [
        {"$group": {"_id": "$relationship_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    results = list(edges_col.aggregate(pipeline))
    
    print("PHASE 0: Relationship Explosion Census")
    print("-" * 45)
    print(f"{'Relationship':<25} | {'Count':<10} | {'%'}")
    print("-" * 45)
    
    total = sum(r['count'] for r in results)
    
    for r in results:
        rel = r['_id']
        count = r['count']
        pct = (count / total) * 100 if total > 0 else 0
        print(f"{rel:<25} | {count:<10} | {pct:.1f}%")
        
    print("-" * 45)
    print(f"{'TOTAL':<25} | {total:<10} | 100.0%")

if __name__ == "__main__":
    run_census()
