import time
import json
from functools import wraps
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any

from backend.graph.repositories.asset_repository import AssetRepository
from backend.graph.services.graph_service import GraphService
from backend.graph.models.dtos import GraphNodeDTO, GraphPathDTO
from backend.graph.models.intelligence_dtos import KnowledgeAssetScoreDTO, InfluenceDTO, ExplainabilityDTO, TraceabilityDTO, GraphAnalyticsSummaryDTO
from backend.graph.logger import logger

router = APIRouter(prefix="/graph", tags=["graph"])

# Cache implementation
_ENDPOINT_CACHE = {}

def analytics_cache(ttl_seconds=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}_{kwargs.get('asset_id', '')}_{kwargs.get('case_id', '')}_{kwargs.get('limit', '')}"
            if cache_key in _ENDPOINT_CACHE:
                entry = _ENDPOINT_CACHE[cache_key]
                if time.time() - entry['time'] < ttl_seconds:
                    logger.info(f"Cache hit for {cache_key}")
                    return entry['data']
            
            t0 = time.time()
            result = await func(*args, **kwargs)
            execution_time_ms = (time.time() - t0) * 1000
            
            # Safe metric tracking
            try:
                if hasattr(result, 'model_dump'):
                    payload_size_bytes = len(json.dumps(result.model_dump(), default=str))
                elif isinstance(result, (dict, list)):
                    payload_size_bytes = len(json.dumps(result, default=str))
                else:
                    payload_size_bytes = 0
            except Exception:
                payload_size_bytes = 0
            
            nodes_returned = 0
            edges_returned = 0
            if hasattr(result, 'nodes') and hasattr(result, 'edges'):
                nodes_returned = len(result.nodes)
                edges_returned = len(result.edges)
            elif hasattr(result, 'origin_paths') and hasattr(result, 'usage_paths'):
                for p in result.origin_paths + result.usage_paths:
                    nodes_returned += len(p.nodes)
                    edges_returned += len(p.edges)
                    
            logger.info("api_performance", extra={
                "endpoint": func.__name__,
                "execution_time_ms": execution_time_ms,
                "payload_size_bytes": payload_size_bytes,
                "nodes_returned": nodes_returned,
                "edges_returned": edges_returned
            })
            
            _ENDPOINT_CACHE[cache_key] = {'time': time.time(), 'data': result}
            return result
        return wrapper
    return decorator

# Dependency injection providers
def get_asset_repo() -> AssetRepository:
    return AssetRepository()


def get_graph_service() -> GraphService:
    return GraphService()


@router.get("/assets/{asset_id}", response_model=Dict[str, Any])
async def get_asset(
    asset_id: str,
    repo: AssetRepository = Depends(get_asset_repo),
):
    """Retrieve raw KnowledgeAsset document from the MongoDB source of truth."""
    asset = repo.get_asset(asset_id)
    if not asset:
        logger.warning("api_asset_not_found", extra={"asset_id": asset_id})
        raise HTTPException(status_code=404, detail=f"KnowledgeAsset with ID {asset_id} not found")
    return asset


@router.get("/assets/{asset_id}/lineage", response_model=GraphPathDTO)
async def get_asset_lineage(
    asset_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve the lineage path for a given KnowledgeAsset from Neo4j."""
    path = service.query_lineage(asset_id)
    if not path.nodes:
        # If no nodes returned, lineage doesn't exist or is deleted
        logger.warning("api_lineage_empty", extra={"asset_id": asset_id})
        raise HTTPException(status_code=404, detail=f"No lineage found for asset {asset_id}")
    return path


@router.get("/assets/{asset_id}/usage", response_model=List[GraphNodeDTO])
async def get_asset_usage(
    asset_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Find Case nodes that referenced or used the given KnowledgeAsset."""
    return service.query_usage(asset_id)


@router.get("/assets/{asset_id}/governance", response_model=List[Dict[str, Any]])
async def get_asset_governance(
    asset_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve the governance event log history for a given KnowledgeAsset."""
    return service.query_governance(asset_id)


@router.get("/discovery/{case_id}", response_model=GraphPathDTO)
async def get_case_discovery(
    case_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve discovery path linking the Case to KnowledgeAssets and their related nodes."""
    path = service.query_discovery(case_id)
    if not path.nodes:
        logger.warning("api_discovery_empty", extra={"case_id": case_id})
        raise HTTPException(status_code=404, detail=f"No discovery path found for case {case_id}")
    return path


@router.get("/explainability/{case_id}", response_model=GraphPathDTO)
async def get_case_explainability(
    case_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve explanation graph (Case, related logs, memories, and used assets)."""
    path = service.query_explainability(case_id)
    if not path.nodes:
        logger.warning("api_explainability_empty", extra={"case_id": case_id})
        raise HTTPException(status_code=404, detail=f"No explainability path found for case {case_id}")
    return path

# --- SPRINT 3B.2: Knowledge Intelligence Layer Routes ---

@router.get("/analytics/centrality", response_model=List[KnowledgeAssetScoreDTO])
@analytics_cache(ttl_seconds=300)
async def get_graph_centrality(
    service: GraphService = Depends(get_graph_service),
):
    """Compute and retrieve Centrality metrics (PageRank, Betweenness, Eigenvector, Degree)."""
    return service.query_centrality()

@router.get("/analytics/influence/{asset_id:path}", response_model=InfluenceDTO)
@analytics_cache(ttl_seconds=300)
async def get_asset_influence(
    asset_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Calculate the downstream influence and impact of a KnowledgeAsset."""
    return service.query_influence(asset_id)

@router.get("/explain/{case_id}", response_model=ExplainabilityDTO)
@analytics_cache(ttl_seconds=300)
async def explain_case(
    case_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Advanced explainability traversing from Case to Governance."""
    return service.query_explain(case_id)

@router.get("/trace/{asset_id}", response_model=TraceabilityDTO)
@analytics_cache(ttl_seconds=300)
async def trace_asset(
    asset_id: str,
    service: GraphService = Depends(get_graph_service),
):
    """Full bidirectional traceability for an asset (origins and downstream usage)."""
    return service.query_traceability(asset_id)

@router.get("/analytics/summary", response_model=GraphAnalyticsSummaryDTO)
@analytics_cache(ttl_seconds=300)
async def get_analytics_summary(
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve high-level graph analytics summary."""
    from datetime import datetime
    import json
    scores = service.query_centrality()
    # Sort top 5 assets by global score
    top_assets = sorted(scores, key=lambda x: x.global_score, reverse=True)[:5]
    
    # Calculate simple density from SnapshotBuilder
    G = service.snapshot_builder.build_full_graph()
    total_nodes = G.number_of_nodes()
    total_edges = G.number_of_edges()
    
    if total_nodes > 1:
        density = total_edges / (total_nodes * (total_nodes - 1))
    else:
        density = 0.0

    # Read DatasetMetadata directly from Neo4j (always fresh)
    dataset_summary = {}
    from backend.graph.client import Neo4jClient
    try:
        neo4j = Neo4jClient()
        with neo4j.session() as session:
            result = session.run("""
                MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'})
                RETURN n
            """)
            rec = result.single()
            if rec:
                raw = dict(rec["n"])
                # Deserialize JSON strings
                for key in ["highly_correlated_features", "column_statistics",
                            "target_distribution", "missing_per_column"]:
                    if key in raw and isinstance(raw[key], str):
                        try:
                            raw[key] = json.loads(raw[key])
                        except Exception:
                            pass
                dataset_summary = raw
    except Exception as e:
        logger.warning(f"Could not load DatasetMetadata: {e}")

    # Sanitize: neo4j.time.DateTime and other types must be converted to str/float
    def sanitize_value(v):
        if hasattr(v, 'isoformat'):
            return v.isoformat()
        elif isinstance(v, dict):
            return {kk: sanitize_value(vv) for kk, vv in v.items()}
        elif isinstance(v, list):
            return [sanitize_value(item) for item in v]
        else:
            try:
                json.dumps(v)
                return v
            except Exception:
                return str(v)
    dataset_summary = {k: sanitize_value(v) for k, v in dataset_summary.items()}

    from backend.graph.insights.insight_engine import InsightEngine
    insight_engine = InsightEngine(service.snapshot_builder)
    insights = insight_engine.generate_insights()
    business_discoveries = [i.model_dump() for i in insights if i.type == "ExecutiveInsight"]
        
    return GraphAnalyticsSummaryDTO(
        total_nodes=total_nodes,
        total_edges=total_edges,
        graph_density=density,
        top_assets=top_assets,
        computed_at=datetime.utcnow().isoformat(),
        dataset_summary=dataset_summary,
        business_discoveries=business_discoveries
    )

@router.get("/analytics/top-assets", response_model=List[KnowledgeAssetScoreDTO])
@analytics_cache(ttl_seconds=300)
async def get_top_assets(
    limit: int = 10,
    service: GraphService = Depends(get_graph_service),
):
    """Retrieve top highest ranking assets by global score."""
    scores = service.query_centrality()
    return sorted(scores, key=lambda x: x.global_score, reverse=True)[:limit]


@router.get("/analytics/heatmap", response_model=List[Dict[str, Any]])
@analytics_cache(ttl_seconds=300)
async def get_correlation_heatmap():
    """Retrieve Pearson correlation matrix between all clinical laboratory variables."""
    from backend.intelligence.risk_engine import get_neo4j_df
    import numpy as np
    df = get_neo4j_df()
    if df.empty or "Selector" not in df.columns:
        return []
    
    # Identify numeric columns
    features = [col for col in df.columns if col not in ["patient_id", "Gender", "Selector"]]
    # Drop rows with NaNs or fill them for correlation
    df_num = df[features].dropna()
    if df_num.empty:
        df_num = df[features].fillna(df[features].mean())
        
    corr_matrix = df_num.corr()
    
    semantic_names = {
        "TB": "Total Bilirubin",
        "DB": "Direct Bilirubin",
        "Alkphos": "Alkaline Phosphatase",
        "Sgpt": "ALT (Alanine Aminotransferase)",
        "Sgot": "AST (Aspartate Aminotransferase)",
        "ALB": "Albumin",
        "TP": "Total Proteins",
        "A/G Ratio": "Albumin/Globulin Ratio",
        "Age": "Age"
    }
    
    result = []
    for col1 in corr_matrix.columns:
        for col2 in corr_matrix.index:
            val = corr_matrix.loc[col1, col2]
            if np.isnan(val):
                val = 0.0
            result.append({
                "x": semantic_names.get(col1, col1),
                "y": semantic_names.get(col2, col2),
                "value": round(val, 4)
            })
    return result


@router.get("/analytics/sankey", response_model=Dict[str, Any])
@analytics_cache(ttl_seconds=300)
async def get_sankey_flow():
    """Generate Sankey node-link diagram mapping Variable -> Finding -> Severity -> Suggested Action."""
    from backend.intelligence.executive_insight_engine import ExecutiveInsightEngine
    engine = ExecutiveInsightEngine()
    insights = engine.generate_insights()
    
    nodes = []
    node_index = {}
    
    def get_node_id(name: str) -> int:
        if name not in node_index:
            node_index[name] = len(nodes)
            nodes.append({"name": name})
        return node_index[name]
        
    links = []
    for ins in insights:
        var_node = get_node_id(ins.title.split(":")[-1].strip())
        finding_node = get_node_id(ins.finding)
        severity_node = get_node_id(f"Riesgo {ins.severity}")
        action_node = get_node_id(ins.next_analysis_suggested)
        
        # Link 1: Variable -> Finding
        links.append({
            "source": var_node,
            "target": finding_node,
            "value": ins.evidence_count
        })
        # Link 2: Finding -> Severity
        links.append({
            "source": finding_node,
            "target": severity_node,
            "value": ins.evidence_count
        })
        # Link 3: Severity -> Action
        links.append({
            "source": severity_node,
            "target": action_node,
            "value": ins.evidence_count
        })
        
    return {
        "nodes": nodes,
        "links": links
    }

