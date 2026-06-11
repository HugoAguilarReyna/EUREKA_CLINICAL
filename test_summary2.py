import sys
sys.path.insert(0, '/app')
import traceback

# Simulate the route handler
from backend.graph.services.graph_service import GraphService
from backend.graph.insights.insight_engine import InsightEngine
from backend.graph.client import Neo4jClient
from backend.graph.models.intelligence_dtos import GraphAnalyticsSummaryDTO
from backend.graph.logger import logger
import json, time
from datetime import datetime
from functools import wraps

# Check if there's an issue with the model_dump() for JSON serialization
s = GraphService()
scores = s.query_centrality()
top_assets = sorted(scores, key=lambda x: x.global_score, reverse=True)[:5]

G = s.snapshot_builder.build_full_graph()
total_nodes = G.number_of_nodes()
total_edges = G.number_of_edges()
density = total_edges / (total_nodes * (total_nodes - 1)) if total_nodes > 1 else 0.0

neo4j = Neo4jClient()
dataset_summary = {}
with neo4j.session() as session:
    result = session.run("MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'}) RETURN n")
    rec = result.single()
    if rec:
        raw = dict(rec["n"])
        for key in ["highly_correlated_features", "column_statistics", "target_distribution", "missing_per_column"]:
            if key in raw and isinstance(raw[key], str):
                try:
                    raw[key] = json.loads(raw[key])
                except Exception as e:
                    print(f"Error parsing {key}: {e}")
        dataset_summary = raw

insight_engine = InsightEngine(s.snapshot_builder)
insights = insight_engine.generate_insights()
business_discoveries = [i.model_dump() for i in insights if i.type == "ExecutiveInsight"]

dto = GraphAnalyticsSummaryDTO(
    total_nodes=total_nodes,
    total_edges=total_edges,
    graph_density=density,
    top_assets=top_assets,
    computed_at=datetime.utcnow().isoformat(),
    dataset_summary=dataset_summary,
    business_discoveries=business_discoveries
)

# Now try to serialize with model_dump() — this is what the cache decorator does
print("Testing model_dump()...")
try:
    md = dto.model_dump()
    print("model_dump OK, keys:", list(md.keys()))
    
    # Serialize to JSON (what FastAPI does)
    print("Testing JSON serialization...")
    serialized = json.dumps(md, default=str)
    print(f"JSON OK, size: {len(serialized)} bytes")
except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()
    
# Check dataset_summary for non-serializable types
print("\nChecking dataset_summary for non-serializable types...")
for k, v in dataset_summary.items():
    try:
        json.dumps(v, default=str)
    except Exception as e:
        print(f"  Non-serializable key: {k}, type: {type(v).__name__}, error: {e}")
        
print("Done.")
