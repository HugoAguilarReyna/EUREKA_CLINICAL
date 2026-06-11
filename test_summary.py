import sys
sys.path.insert(0, '/app')

from backend.graph.services.graph_service import GraphService
from backend.graph.insights.insight_engine import InsightEngine
from backend.graph.client import Neo4jClient
from backend.graph.models.intelligence_dtos import GraphAnalyticsSummaryDTO
import json
from datetime import datetime

s = GraphService()
scores = s.query_centrality()
top_assets = sorted(scores, key=lambda x: x.global_score, reverse=True)[:5]
print(f"Top assets: {len(top_assets)}")

G = s.snapshot_builder.build_full_graph()
total_nodes = G.number_of_nodes()
total_edges = G.number_of_edges()
print(f"Nodes: {total_nodes}, Edges: {total_edges}")

density = total_edges / (total_nodes * (total_nodes - 1)) if total_nodes > 1 else 0.0

dataset_summary = {}
neo4j = Neo4jClient()
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
                    print(f"  Failed to parse {key}: {e}")
        dataset_summary = raw
        print(f"Dataset summary keys: {list(raw.keys())[:5]}")

insight_engine = InsightEngine(s.snapshot_builder)
insights = insight_engine.generate_insights()
print(f"Insights: {len(insights)}")

business_discoveries = [i.model_dump() for i in insights if i.type == "ExecutiveInsight"]
print(f"Business discoveries: {len(business_discoveries)}")

# Try building the DTO
try:
    dto = GraphAnalyticsSummaryDTO(
        total_nodes=total_nodes,
        total_edges=total_edges,
        graph_density=density,
        top_assets=top_assets,
        computed_at=datetime.utcnow().isoformat(),
        dataset_summary=dataset_summary,
        business_discoveries=business_discoveries
    )
    print(f"DTO created successfully: total_nodes={dto.total_nodes}")
    print(f"First discovery: {business_discoveries[0]['description'][:80] if business_discoveries else 'None'}")
except Exception as e:
    print(f"DTO creation FAILED: {e}")
    import traceback
    traceback.print_exc()
