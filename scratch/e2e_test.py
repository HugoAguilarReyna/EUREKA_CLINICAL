import json, time
from backend.graph.mongo_client import MongoDBClient
from backend.graph.client import Neo4jClient

# 1. Insert a test KnowledgeAsset document
asset_doc = {
    "asset_id": "e2e_test_asset",
    "asset_type": "ClinicalPattern",
    "confidence": 0.85,
    "clinical_relevance": "high",
    "reuse_count": 0,
    "related_assets": [],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "status": "ACTIVE"
}
mongo = MongoDBClient()
col = mongo.get_collection("knowledge_assets")
col.replace_one({"asset_id": asset_doc["asset_id"]}, asset_doc, upsert=True)
print("MONGODB_DOC:" + json.dumps(asset_doc))

# 2. Give the change‑stream listener time to process (if running)
time.sleep(3)

# 3. Query Neo4j for the created node
neo = Neo4jClient()
with neo.session() as session:
    result = session.run(
        "MATCH (n:KnowledgeAsset {asset_id: $aid}) RETURN n",
        aid=asset_doc["asset_id"]
    )
    record = result.single()
    if record:
        node = record["n"]
        node_dict = dict(node)
        print("NEO4J_NODE:" + json.dumps(node_dict))
    else:
        print("NEO4J_NODE: not found")
