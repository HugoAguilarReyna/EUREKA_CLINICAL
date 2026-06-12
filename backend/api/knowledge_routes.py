from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any, List
import uuid
import os

from pydantic import BaseModel

from backend.ingestion.ingestion_service import IngestionService
from backend.ingestion.models.upload_dtos import UploadJobDTO
from backend.graph.insights.insight_engine import InsightEngine
from backend.copilot.knowledge_copilot import KnowledgeCopilot

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

job_store = {}

# Lazy initialization — avoids 9-15s Neo4j TCP timeout at import time (startup deadlock fix)
_ingestion_svc = None
_insight_engine = None
_copilot = None

def get_ingestion_svc() -> IngestionService:
    global _ingestion_svc
    if _ingestion_svc is None:
        _ingestion_svc = IngestionService()
    return _ingestion_svc

def get_insight_engine() -> InsightEngine:
    global _insight_engine
    if _insight_engine is None:
        _insight_engine = InsightEngine()
    return _insight_engine

def get_copilot() -> KnowledgeCopilot:
    global _copilot
    if _copilot is None:
        _copilot = KnowledgeCopilot()
    return _copilot

class CopilotRequest(BaseModel):
    question: str

# Lazy initialization for BackgroundJobManager
_bg_job_manager = None
def get_bg_job_manager():
    global _bg_job_manager
    if _bg_job_manager is None:
        from pymongo import MongoClient
        from backend.db.config import settings
        from backend.intelligence.background_job_manager import BackgroundJobManager
        mongo_client = MongoClient(settings.mongo_uri)
        db = mongo_client[settings.mongo_db_name]
        _bg_job_manager = BackgroundJobManager(db)
    return _bg_job_manager


# ============================================================================
# [PATCHED BY EPIC 10.0B] Missing endpoints added by auto-patch script
# ============================================================================

@router.post("/initialize")
async def initialize_system() -> Dict[str, Any]:
    """Initialize the knowledge system at startup."""
    try:
        from mongo_index_manager import MongoIndexManager
        
        logger.info("Initializing knowledge system...")
        
        # Create MongoDB indexes
        index_manager = MongoIndexManager(mongo_db)
        index_results = index_manager.create_all_indexes()
        logger.info(f"Indexes created: {index_results}")
        
        # Verify Neo4j connection
        try:
            neo4j_check = neo4j_session.run("RETURN 'Neo4j OK' AS status").single()
            neo4j_status = "connected"
        except Exception as e:
            logger.warning(f"Neo4j connection check failed: {e}")
            neo4j_status = "error"
        
        # Verify MongoDB connection
        try:
            mongo_db.command("ping")
            mongo_status = "connected"
        except Exception as e:
            logger.warning(f"MongoDB connection check failed: {e}")
            mongo_status = "error"
        
        return {
            "status": "initialized",
            "neo4j": neo4j_status,
            "mongo": mongo_status,
            "indexes": index_results,
            "timestamp": datetime.now().isoformat(),
        }
    
    except Exception as e:
        logger.error(f"Initialization failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


@router.get("/system/indexes")
async def get_index_stats() -> Dict[str, Any]:
    """Get MongoDB index statistics."""
    try:
        from mongo_index_manager import MongoIndexManager
        
        index_manager = MongoIndexManager(mongo_db)
        return index_manager.get_index_stats()
    
    except Exception as e:
        logger.error(f"Failed to get index stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# CRITICAL: This must come BEFORE /jobs/{job_id}
@router.get("/jobs/summary")
async def get_jobs_summary() -> Dict[str, Any]:
    """Get a summary of all background jobs."""
    try:
        # Get background job manager from FastAPI routes instance
        bg_manager = get_bg_job_manager()
        # Return manual summary since get_job_summary doesn't exist yet
        collection = bg_manager.jobs_collection
        queued = collection.count_documents({"status": "queued"})
        running = collection.count_documents({"status": "running"})
        completed = collection.count_documents({"status": "completed"})
        failed = collection.count_documents({"status": "failed"})
        
        return {
            "queued": queued,
            "running": running,
            "completed": completed,
            "failed": failed
        }
    except Exception as e:
        # logger.error(f"Failed to get job summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Get the status of a background job.
    """
    job = get_bg_job_manager().get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/bootstrap")
async def bootstrap_dataset():
    """
    Idempotent one-click provisioning endpoint.
    Loads the ILPD (act_liver_disease.csv) dataset if not already loaded,
    and schedules the full ingestion pipeline as a background job.
    """
    return await run_intelligence_bootstrap()

async def _do_bootstrap():
    # 1. Check if already loaded
    try:
        from pymongo import MongoClient
        from backend.db.config import settings
        mongo_client = MongoClient(settings.mongo_uri)
        db = mongo_client[settings.mongo_db_name]
        meta = db["dataset_metadata"].find_one({"id": "Dataset_Metadata_Global"})
        if meta and meta.get("rows", 0) > 0:
            return {"success": True, "message": "Dataset already loaded. Skipping duplicate ingestion.", "dataset_rows": meta["rows"]}
    except Exception as e:
        print(f"Error checking if dataset is loaded: {e}")
        pass
            
    # 2. Read dataset file
    import os
    raw_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw", "act_liver_disease.csv")
    if not os.path.exists(raw_path):
        raw_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "act_liver_disease.csv")
        
    if not os.path.exists(raw_path):
        return {"success": False, "message": f"Dataset file not found at {raw_path}", "dataset_rows": 0}
        
    with open(raw_path, "rb") as f:
        content = f.read()
        
    file_name = "act_liver_disease.csv"
    file_type = "csv"
    
    # 3. Parse and Profile
    parser = get_ingestion_svc().parsers[file_type]
    parsed_doc = parser(content, file_name)
    from backend.ingestion.profiling.schema_profiler import profile_schema
    profile = profile_schema(parsed_doc.content)
    
    # 4. Ontology & Semantic Enrichment
    from backend.ingestion.ontology.ontology_builder import build_ontology
    from backend.ingestion.semantic.semantic_enricher import enrich_semantics
    entities, relationships = build_ontology(
        content=parsed_doc.content, file_type=parsed_doc.file_type, file_name=parsed_doc.file_name, profile=profile
    )
    enriched_entities, enriched_relationships = enrich_semantics(entities, relationships)
    
    # 5. Build Knowledge Graph
    graph_result = get_ingestion_svc().graph_builder.build_and_persist(
        entities=enriched_entities, relationships=enriched_relationships
    )
    
    # 6. Intelligence Pipeline (Rules, Communities, Insights)
    from backend.intelligence.risk_engine import RiskEngine
    from backend.intelligence.decision_engine import DecisionEngine
    _risker = RiskEngine()
    _decider = DecisionEngine()
    
    patterns = await _risker.mine_patterns()
    insights = await _decider.get_all_insights()
    
    return {
        "success": True,
        "dataset_rows": len(parsed_doc.content),
        "rules": len(patterns.get("rules", [])),
        "communities": len(patterns.get("subgroups", [])),
        "graph_nodes": len(enriched_entities),
        "graph_edges": len(enriched_relationships),
        "insights_generated": len(insights)
    }

@router.post("/intelligence/bootstrap")
async def run_intelligence_bootstrap():
    """
    Schedules the full end-to-end knowledge ingestion and decision intelligence pipeline.
    """
    bg = get_bg_job_manager()
    job_id = bg.create_job(job_type="intelligence_bootstrap", payload={})
    bg.schedule_job(job_id, _do_bootstrap())
    return {"success": True, "job_id": job_id, "status": "queued"}

@router.post("/upload", response_model=UploadJobDTO)
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts UploadFile. Calls parsers/profilers to generate a preview.
    Saves state in memory for the build step.
    """
    content = await file.read()
    file_type = file.filename.split('.')[-1].lower() if '.' in file.filename else "txt"
    
    job_id = str(uuid.uuid4())
    
    # Save physically
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    physical_path = os.path.join(upload_dir, f"{job_id}_{file.filename}")
    with open(physical_path, "wb") as f:
        f.write(content)
    
    file_size_bytes = len(content)
    
    # We do a partial ingestion for preview
    if file_type not in get_ingestion_svc().parsers:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_type}")
        
    parser = get_ingestion_svc().parsers[file_type]
    
    try:
        parsed_doc = parser(content, file.filename)
        from backend.ingestion.profiling.schema_profiler import profile_schema
        profile = {}
        num_rows_processed = 0
        if isinstance(parsed_doc.content, list):
            profile = profile_schema(parsed_doc.content)
            num_rows_processed = len(parsed_doc.content)
            
        job_store[job_id] = {
            "job_id": job_id,
            "file_name": file.filename,
            "file_type": file_type,
            "parsed_doc": parsed_doc,
            "profile": profile,
            "status": "preview_ready",
            "physical_path": physical_path,
            "file_size_bytes": file_size_bytes,
            "num_rows_processed": num_rows_processed
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
        
    metadata = {
        "profile": profile,
        "physical_path": physical_path,
        "file_size_bytes": file_size_bytes,
        "num_rows_processed": num_rows_processed
    }
        
    return UploadJobDTO(
        job_id=job_id,
        file_name=file.filename,
        file_type=file_type,
        status="preview_ready",
        metadata=metadata
    )

@router.get("/jobs/{id}/preview")
async def get_job_preview(id: str):
    """
    Returns parsed/profiled data.
    """
    if id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = job_store[id]
    
    # Return a snippet of content for preview to avoid massive payload
    content_preview = job["parsed_doc"].content
    if isinstance(content_preview, list):
        content_preview = content_preview[:10]  # first 10 rows
    elif isinstance(content_preview, str):
        content_preview = content_preview[:1000] # first 1000 chars
        
    return {
        "job_id": job["job_id"],
        "file_name": job["file_name"],
        "profile": job["profile"],
        "content_preview": content_preview,
        "status": job["status"]
    }

@router.post("/jobs/{id}/build")
async def build_job(id: str):
    """
    Triggers Neo4j graph building.
    """
    if id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = job_store[id]
    if job["status"] == "completed":
        return {"status": "already_completed", "job_id": id}
        
    try:
        from backend.ingestion.ontology.ontology_builder import build_ontology
        from backend.ingestion.semantic.semantic_enricher import enrich_semantics
        
        parsed_doc = job["parsed_doc"]
        profile = job["profile"]
        
        # 3. Ontology
        entities, relationships = build_ontology(
            content=parsed_doc.content,
            file_type=parsed_doc.file_type,
            file_name=parsed_doc.file_name,
            profile=profile
        )
        
        # 4. Semantic Enrichment
        enriched_entities, enriched_relationships = enrich_semantics(entities, relationships)
        
        # 5. Graph Build
        graph_result = get_ingestion_svc().graph_builder.build_and_persist(
            entities=enriched_entities,
            relationships=enriched_relationships
        )
        
        # 6. Intelligence Pipeline (Rules, Communities, Insights)
        from backend.intelligence.risk_engine import RiskEngine
        from backend.intelligence.decision_engine import DecisionEngine
        _risker = RiskEngine()
        _decider = DecisionEngine()
        
        patterns = await _risker.mine_patterns()
        insights = await _decider.get_all_insights()
        
        # 7. Semantic Propagation
        from backend.semantic.semantic_graph_builder import SemanticGraphBuilder
        builder = SemanticGraphBuilder()
        builder.build_and_persist_graph()
        
        job["status"] = "completed"
        return {
            "job_id": id,
            "status": "completed",
            "entities_detected": len(enriched_entities),
            "relationships_detected": len(enriched_relationships),
            "graph_persistence": graph_result
        }
    except Exception as e:
        job["status"] = "failed"
        raise HTTPException(status_code=500, detail=f"Build failed: {str(e)}")

@router.get("/system/debug")
async def get_system_debug():
    from pymongo import MongoClient
    from backend.db.config import settings
    mongo_client = MongoClient(settings.mongo_uri)
    db = mongo_client[settings.mongo_db_name]
    
    return {
        "collections": {
            "semantic_graph_nodes": db["semantic_graph_nodes"].count_documents({}),
            "semantic_graph_edges": db["semantic_graph_edges"].count_documents({}),
            "cases": db["cases"].count_documents({}),
            "dataset_history": db["DatasetHistory"].count_documents({})
        },
        "node_types": {
            "Patient": db["semantic_graph_nodes"].count_documents({"type": "Patient"}),
            "SemanticState": db["semantic_graph_nodes"].count_documents({"type": "SemanticState"}),
            "Rule": db["semantic_graph_nodes"].count_documents({"type": "Rule"}),
            "Community": db["semantic_graph_nodes"].count_documents({"type": "Community"}),
            "Risk": db["semantic_graph_nodes"].count_documents({"type": "Risk"}),
            "Action": db["semantic_graph_nodes"].count_documents({"type": "Action"})
        }
    }

@router.get("/jobs/{id}/insights")
async def get_job_insights(id: str):
    """
    Returns insights after graph is built.
    """
    if id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job_store[id]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job must be completed to generate insights")
        
    insights = get_insight_engine().generate_insights(profile=job_store[id].get("profile"))
    return {"job_id": id, "insights": [i.model_dump() for i in insights]}

import time
from backend.graph.logger import logger

@router.post("/copilot/ask")
async def run_copilot(req: CopilotRequest):
    """
    Accepts JSON `{"question": "..."}` and returns answer from `KnowledgeCopilot`.
    """
    t0 = time.time()
    result = get_copilot().ask(req.question)
    execution_time_ms = (time.time() - t0) * 1000
    
    payload_size_bytes = len(str(result))
    
    logger.info("api_performance", extra={
        "endpoint": "run_copilot",
        "execution_time_ms": execution_time_ms,
        "payload_size_bytes": payload_size_bytes,
        "nodes_returned": 0,
        "edges_returned": 0
    })
    return result

@router.get("/system/reality-state")
async def get_reality_state():
    """
    Returns the core verifiable truth of the system.
    Phase 0 requirement.
    """
    from backend.graph.client import Neo4jClient
    from datetime import datetime
    import json

    neo4j = Neo4jClient()
    dataset_summary = {}
    try:
        with neo4j.session() as session:
            result = session.run("MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'}) RETURN n")
            rec = result.single()
            if rec:
                dataset_summary = dict(rec["n"])
    except Exception:
        pass

    if not dataset_summary:
        try:
            from pymongo import MongoClient
            from backend.db.config import settings
            mongo_client = MongoClient(settings.mongo_uri)
            db = mongo_client[settings.mongo_db_name]
            meta = db["dataset_metadata"].find_one({"id": "Dataset_Metadata_Global"})
            if meta:
                dataset_summary = dict(meta)
        except Exception:
            pass

    rows = dataset_summary.get("rows", 0)
    columns = dataset_summary.get("columns", 0)
    target_variable = dataset_summary.get("target_candidate", "Selector")
    dataset_name = dataset_summary.get("file_name", "act_liver_disease.csv")
    uploaded_at = dataset_summary.get("created_at", datetime.utcnow().isoformat())

    # Generate insights to count them
    from backend.intelligence.executive_insight_engine import ExecutiveInsightEngine
    engine = ExecutiveInsightEngine()
    insights = engine.generate_insights()

    active_insights = len(insights)
    active_alerts = len([i for i in insights if i.severity in ["CRITICAL", "HIGH"]])
    active_recommendations = len(insights)

    return {
        "dataset_id": "Dataset_Metadata_Global",
        "dataset_name": dataset_name,
        "uploaded_at": str(uploaded_at),
        "rows": rows,
        "columns": columns,
        "target_variable": target_variable,
        "active_insights": active_insights,
        "active_alerts": active_alerts,
        "active_recommendations": active_recommendations,
        "model_version": "Eureka-5.1.0-Release",
        "last_recalculation": datetime.utcnow().isoformat(),
        "system_status": "healthy"
    }

from backend.intelligence.dataset_memory import DatasetMemoryEngine

async def _do_register_dataset_snapshot(name: str):
    engine = DatasetMemoryEngine()
    state = await get_reality_state()
    
    from backend.graph.client import Neo4jClient
    import json
    neo4j = Neo4jClient()
    dataset_summary = {}
    try:
        with neo4j.session() as session:
            result = session.run("MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'}) RETURN n")
            rec = result.single()
            if rec:
                raw = dict(rec["n"])
                for key in ["highly_correlated_features", "column_statistics", "target_distribution", "missing_per_column"]:
                    if key in raw and isinstance(raw[key], str):
                        try:
                            raw[key] = json.loads(raw[key])
                        except Exception:
                            pass
                dataset_summary = raw
    except Exception:
        pass
        
    from backend.intelligence.executive_insight_engine import ExecutiveInsightEngine
    insight_engine = ExecutiveInsightEngine()
    insights = [i.model_dump() for i in insight_engine.generate_insights()]
    
    # Generate mock top features from correlations
    top_features = dataset_summary.get("highly_correlated_features", [])
    
    record = await engine.register_snapshot(
        dataset_name=name,
        source="Neo4j Knowledge Graph",
        rows=state["rows"],
        columns=state["columns"],
        target_variable=state["target_variable"],
        metrics=dataset_summary.get("column_statistics", {}),
        insights=insights,
        alerts=[i for i in insights if i["severity"] in ["CRITICAL", "HIGH"]],
        recommendations=insights,
        top_risks=[i for i in insights if i["severity"] == "CRITICAL"],
        top_features=top_features,
        quality_score=dataset_summary.get("quality_score", 100.0),
        system_snapshot=state
    )
    return {"success": True, "record_id": record["snapshot_id"]}

@router.post("/datasets/register")
async def register_dataset_snapshot(name: str = "Automated Snapshot"):
    """
    Schedules the background capture of the current state of the organization.
    """
    bg = get_bg_job_manager()
    job_id = bg.create_job(job_type="dataset_register", payload={"name": name})
    bg.schedule_job(job_id, _do_register_dataset_snapshot(name))
    return {"success": True, "job_id": job_id, "status": "queued"}

@router.get("/datasets/history")
async def get_dataset_history():
    engine = DatasetMemoryEngine()
    return await engine.get_history()

@router.get("/datasets/timeline")
async def get_dataset_timeline():
    engine = DatasetMemoryEngine()
    return await engine.get_timeline()

@router.get("/datasets/latest")
async def get_dataset_latest():
    engine = DatasetMemoryEngine()
    latest = await engine.get_latest_snapshot()
    if not latest:
        raise HTTPException(status_code=404, detail="No snapshots found")
    return latest

@router.get("/datasets/{id}")
async def get_dataset_by_id(id: str):
    engine = DatasetMemoryEngine()
    snapshot = await engine.get_snapshot(id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot

from backend.intelligence.comparison_engine import ComparisonEngine

@router.get("/compare/latest")
async def compare_latest_datasets():
    mem_engine = DatasetMemoryEngine()
    history = await mem_engine.get_history()
    
    if len(history) < 2:
        return {"status": "insufficient_data", "message": "At least 2 snapshots are needed to compare."}
        
    # history is sorted by -created_at (descending)
    snapshot_b = history[0] # newer
    snapshot_a = history[1] # older
    
    comp_engine = ComparisonEngine()
    comparisons = comp_engine.compare_snapshots(snapshot_a, snapshot_b)
    
    return {
        "dataset_older": snapshot_a.dataset_name,
        "dataset_newer": snapshot_b.dataset_name,
        "findings": [c.model_dump() for c in comparisons]
    }

@router.get("/compare/{dataset_a}/{dataset_b}")
async def compare_datasets(dataset_a: str, dataset_b: str):
    mem_engine = DatasetMemoryEngine()
    snapshot_a = await mem_engine.get_snapshot(dataset_a)
    snapshot_b = await mem_engine.get_snapshot(dataset_b)
    
    if not snapshot_a or not snapshot_b:
        raise HTTPException(status_code=404, detail="One or both snapshots not found")
        
    # Ensure A is older than B
    if snapshot_a.created_at > snapshot_b.created_at:
        snapshot_a, snapshot_b = snapshot_b, snapshot_a
        
    comp_engine = ComparisonEngine()
    comparisons = comp_engine.compare_snapshots(snapshot_a, snapshot_b)
    
    return {
        "dataset_older": snapshot_a.dataset_name,
        "dataset_newer": snapshot_b.dataset_name,
        "findings": [c.model_dump() for c in comparisons]
    }

# --- SPRINT 9.0+: SEMANTIC DECISION INTELLIGENCE ENDPOINTS ---

@router.get("/preparation/audit")
async def get_data_preparation_audit():
    """
    Exposes profiling and scaling metrics for the Data Preparation Explorer.
    """
    from backend.intelligence.risk_engine import get_neo4j_df
    import numpy as np
    df = get_neo4j_df()
    if df.empty:
        raise HTTPException(status_code=404, detail="Dataset is empty or not loaded.")
        
    numeric_cols = [c for c in df.columns if c not in ["patient_id", "Gender", "Selector"]]
    
    # 1. Dataset Profile
    profile = {
        "records": len(df),
        "variables": len(df.columns),
        "types": {c: str(df[c].dtype) for c in df.columns},
        "cardinality": {c: int(df[c].nunique()) for c in df.columns},
        "missing_values": int(df.isnull().sum().sum())
    }
    
    # 2. Missing data audit
    missing_audit = {
        "null_counts": {c: int(df[c].isnull().sum()) for c in df.columns},
        "null_percentages": {c: float(df[c].isnull().mean()) for c in df.columns},
        "imputation_strategy": "Mean Imputation (Fallback)"
    }
    
    # 3. Normalization (Z-score vs MinMax vs Raw)
    normalization_comparison = {}
    for col in numeric_cols:
        col_clean = df[col].dropna()
        if col_clean.empty: continue
        
        # Z-score normalization
        mean = col_clean.mean()
        std = col_clean.std() if col_clean.std() > 0 else 1.0
        z_scores = (col_clean - mean) / std
        
        # MinMax normalization
        c_min = col_clean.min()
        c_max = col_clean.max()
        range_val = c_max - c_min if c_max > c_min else 1.0
        minmax_vals = (col_clean - c_min) / range_val
        
        normalization_comparison[col] = {
            "raw_mean": float(mean),
            "raw_min": float(c_min),
            "raw_max": float(c_max),
            "z_score_sample": [float(z) for z in z_scores.head(5)],
            "minmax_sample": [float(m) for m in minmax_vals.head(5)]
        }
        
    # 4. Outliers detection (IQR)
    outliers_audit = {}
    for col in numeric_cols:
        col_clean = df[col].dropna()
        if col_clean.empty: continue
        Q1 = col_clean.quantile(0.25)
        Q3 = col_clean.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        outliers_mask = (col_clean < lower_bound) | (col_clean > upper_bound)
        outliers_audit[col] = {
            "q25": float(Q1),
            "q75": float(Q3),
            "iqr": float(IQR),
            "outliers_count": int(outliers_mask.sum()),
            "outliers_percentage": float(outliers_mask.mean())
        }
        
    # 5. Semantic Entropy
    from backend.semantic.fuzzy_engine import FuzzyEngine
    semantic_entropies = {}
    for col in numeric_cols:
        col_clean = df[col].dropna()
        if col_clean.empty: continue
        entropies = []
        for val in col_clean.head(100): # Sample 100 for speed
            m = FuzzyEngine.get_memberships(col, float(val), "triangular")
            entropies.append(FuzzyEngine.compute_semantic_entropy(m))
        semantic_entropies[col] = float(np.mean(entropies))
        
    return {
        "profile": profile,
        "missing_audit": missing_audit,
        "normalization_comparison": normalization_comparison,
        "outliers_audit": outliers_audit,
        "semantic_entropies": semantic_entropies
    }

@router.get("/fuzzy/memberships")
async def get_fuzzy_memberships(patient_id: str, variable: str, function_type: str = "triangular"):
    """
    Returns triangular, trapezoidal, and gaussian fuzzy memberships side by side for a patient lab value.
    """
    from backend.semantic.semantic_state_engine import SemanticStateEngine
    engine = SemanticStateEngine()
    
    # Get states for patient
    states = engine.get_patient_states(patient_id, function_type)
    var_state = next((s for s in states if s["variable"] == variable), None)
    
    if not var_state:
        # Try finding raw patient value and computing
        from backend.intelligence.risk_engine import get_neo4j_df
        df = get_neo4j_df()
        if not df.empty and patient_id in df["patient_id"].values:
            row = df[df["patient_id"] == patient_id].iloc[0]
            val = row.get(variable)
            if val is not None:
                from backend.semantic.fuzzy_engine import FuzzyEngine
                tri = FuzzyEngine.get_memberships(variable, float(val), "triangular")
                trap = FuzzyEngine.get_memberships(variable, float(val), "trapezoidal")
                gauss = FuzzyEngine.get_memberships(variable, float(val), "gaussian")
                return {
                    "patient_id": patient_id,
                    "variable": variable,
                    "value": float(val),
                    "triangular": tri,
                    "trapezoidal": trap,
                    "gaussian": gauss
                }
        raise HTTPException(status_code=404, detail=f"No patient measurements found for {patient_id} and {variable}.")
        
    val = var_state["value"]
    from backend.semantic.fuzzy_engine import FuzzyEngine
    tri = FuzzyEngine.get_memberships(variable, float(val), "triangular")
    trap = FuzzyEngine.get_memberships(variable, float(val), "trapezoidal")
    gauss = FuzzyEngine.get_memberships(variable, float(val), "gaussian")
    
    return {
        "patient_id": patient_id,
        "variable": variable,
        "value": float(val),
        "triangular": tri,
        "trapezoidal": trap,
        "gaussian": gauss
    }

@router.get("/semantic/rules")
async def get_semantic_rules():
    """
    Exposes mined semantic rules linked to certified statistical backing.
    """
    from backend.semantic.rule_mining_engine import RuleMiningEngine
    engine = RuleMiningEngine()
    return engine.mine_semantic_rules()

@router.get("/semantic/graph")
async def get_semantic_graph(
    level: int = 1, 
    community_id: str = None,
    entity_type: str = None,
    entity_id: str = None,
    depth: int = 1
):
    """
    Exposes the extended semantic knowledge graph nodes and edges.
    Supports Executive (L1), Clinical (L2), and Forensic (L3) levels of abstraction.
    """
    from backend.semantic.semantic_graph_builder import SemanticGraphBuilder
    from backend.semantic.graph_abstraction_engine import GraphAbstractionEngine
    from backend.semantic.graph_cache import GraphCache
    
    cache = GraphCache()
    
    # Check cache first for level 3
    if level == 3 and entity_type and entity_id:
        cached_data = cache.get(entity_type, entity_id, depth)
        if cached_data:
            return cached_data
            
    builder = SemanticGraphBuilder()
    graph_data = builder.get_semantic_graph()
    
    # If graph is empty, return empty
    if not graph_data or not graph_data.get("nodes"):
        return {"nodes": [], "edges": []}

    # Slice the graph using the abstraction engine
    view = GraphAbstractionEngine.get_abstract_view(
        nodes=graph_data["nodes"],
        edges=graph_data["edges"],
        level=level,
        community_id=community_id,
        entity_type=entity_type,
        entity_id=entity_id,
        depth=depth
    )
    
    # For Level 2, dynamically compute SIMILAR_TO edges in memory for Similarity Mode
    if level == 2:
        from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine
        sim_engine = CohortSimilarityEngine()
        patient_nodes = [n for n in view["nodes"] if n["label"] == "Patient"]
        pids = [p["id"] for p in patient_nodes]
        
        # Load profiles for patients currently in the view
        profiles = {}
        for p in pids:
            s, _ = sim_engine.get_patient_profile(p)
            if s:
                profiles[p] = s
                
        # Connect patients with Jaccard >= 0.4
        for i in range(len(pids)):
            for j in range(i + 1, len(pids)):
                p1 = pids[i]
                p2 = pids[j]
                if p1 in profiles and p2 in profiles:
                    s1 = profiles[p1]
                    s2 = profiles[p2]
                    intersection = len(s1.intersection(s2))
                    union = len(s1.union(s2))
                    jaccard = intersection / union if union > 0 else 0.0
                    if jaccard >= 0.4:
                        view["edges"].append({
                            "src_id": p1,
                            "dst_id": p2,
                            "relationship_type": "SIMILAR_TO",
                            "properties": {"jaccard": jaccard}
                        })
                        
    response_data = {
        "nodes": view.get("nodes", []),
        "edges": view.get("edges", []),
        "warning": view.get("warning", False),
        "message": view.get("message", ""),
        "metadata": {
            "level": level,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "depth": depth,
            "warning": view.get("warning", False),
            "message": view.get("message", "")
        }
    }
    
    # Save cache for level 3
    if level == 3 and entity_type and entity_id:
        cache.set(entity_type, entity_id, depth, response_data)
        
    return response_data

@router.get("/semantic/graph/expand")
async def expand_graph(node_id: str, depth: int = 1):
    """
    Neighborhood expansion only. Dynamic BFS retrieval starting from a specific node.
    """
    from backend.semantic.semantic_graph_builder import SemanticGraphBuilder
    from backend.semantic.graph_abstraction_engine import GraphAbstractionEngine
    from backend.semantic.graph_cache import GraphCache
    
    cache = GraphCache()
    builder = SemanticGraphBuilder()
    
    node_doc = builder.nodes_col.find_one({"id": node_id})
    if not node_doc:
        # Fallback build and retry
        builder.build_and_persist_graph()
        node_doc = builder.nodes_col.find_one({"id": node_id})
        
    if not node_doc:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found in graph.")
        
    entity_type = node_doc["label"]
    
    cached_data = cache.get(entity_type, node_id, depth)
    if cached_data:
        return cached_data
        
    graph_data = builder.get_semantic_graph()
    
    view = GraphAbstractionEngine.get_abstract_view(
        nodes=graph_data["nodes"],
        edges=graph_data["edges"],
        level=3,
        entity_type=entity_type,
        entity_id=node_id,
        depth=depth
    )
    
    response_data = {
        "nodes": view.get("nodes", []),
        "edges": view.get("edges", []),
        "warning": view.get("warning", False),
        "message": view.get("message", ""),
        "metadata": {
            "node_id": node_id,
            "entity_type": entity_type,
            "depth": depth,
            "warning": view.get("warning", False),
            "message": view.get("message", "")
        }
    }
    
    cache.set(entity_type, node_id, depth, response_data)
    return response_data

@router.get("/cohorts/similarity/{patient_id}")
async def get_patient_similarity(patient_id: str, limit: int = 20):
    """
    Computes Jaccard and Cosine similarities on-demand for a given patient.
    """
    from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine
    engine = CohortSimilarityEngine()
    return engine.find_similar_patients(patient_id, limit=limit)

@router.get("/cohorts/communities")
async def get_communities():
    """
    Lists Louvain clinical communities and their metadata profiles.
    """
    from backend.semantic.community_profile_engine import CommunityProfileEngine
    engine = CommunityProfileEngine()
    return engine.detect_communities()

@router.get("/patterns/timeline")
async def get_pattern_timeline():
    """
    Exposes pattern drift and evolution timeline (EVOLVED_TO connections).
    """
    from backend.semantic.pattern_evolution_engine import PatternEvolutionEngine
    engine = PatternEvolutionEngine()
    return engine.get_pattern_timeline()

@router.get("/sankey/propagation")
async def get_sankey_propagation():
    """
    Generates dynamic Sankey flow tracing Evidence -> Rule -> Hypothesis -> Risk -> Action.
    """
    from backend.semantic.rule_mining_engine import RuleMiningEngine
    from backend.semantic.semantic_graph_enrichment import SemanticGraphEnrichment
    
    rule_engine = RuleMiningEngine()
    enrichment = SemanticGraphEnrichment()
    rules = rule_engine.mine_semantic_rules()
    
    nodes = []
    node_index = {}
    
    def get_node_id(name: str, category: str) -> int:
        key = f"{category}_{name}"
        if key not in node_index:
            node_index[key] = len(nodes)
            nodes.append({"name": name, "category": category})
        return node_index[key]
        
    links = []
    for r in rules:
        rule_id = r["rule_id"]
        strength = enrichment.calculate_evidence_strength(r)
        
        ev_name = f"Evidence ({r['odds_ratio']:.1f} OR, p={r['p_value']:.3f})"
        
        # Formulate variables for hypothesis template
        conditions_states = []
        for cond in r["conditions"]:
            var = cond["variable"]
            op = cond["raw_expression"].split(" ")[1]
            suffix = "HIGH" if op in [">", ">="] else "LOW"
            conditions_states.append(f"{var}_{suffix}")
            
        hyp_name = enrichment.generate_clinical_hypothesis(conditions_states)
        risk_name = f"{r['target_class']} RISK"
        
        insight_doc = enrichment.db["decision_insights"].find_one({"insight_id": r["certified_insight_id"]})
        action_name = insight_doc.get("next_analysis_suggested", "Order Liver Panel") if insight_doc else "Order Liver Panel"
        
        ev_idx = get_node_id(ev_name, "Evidence")
        rule_idx = get_node_id(rule_id, "Rule")
        hyp_idx = get_node_id(hyp_name, "Hypothesis")
        risk_idx = get_node_id(risk_name, "Risk")
        action_idx = get_node_id(action_name, "Action")
        
        # Link 1: Evidence -> Rule
        links.append({"source": ev_idx, "target": rule_idx, "value": strength})
        # Link 2: Rule -> Hypothesis
        links.append({"source": rule_idx, "target": hyp_idx, "value": strength})
        # Link 3: Hypothesis -> Risk
        links.append({"source": hyp_idx, "target": risk_idx, "value": strength})
        # Link 4: Risk -> Action
        links.append({"source": risk_idx, "target": action_idx, "value": strength})
        
    return {
        "nodes": nodes,
        "links": links
    }

@router.get("/explain-v2/{patient_id}")
async def explain_patient_v2(patient_id: str):
    """
    Exposes the complete multi-layer semantic decision chain for a patient:
    Patient -> Semantic State -> Pattern -> Rule -> Community -> Risk -> Action -> Evidence -> Discovery.
    """
    from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine
    from backend.semantic.community_profile_engine import CommunityProfileEngine
    from backend.semantic.semantic_graph_enrichment import SemanticGraphEnrichment
    from fastapi import HTTPException
    
    sim_engine = CohortSimilarityEngine()
    comm_engine = CommunityProfileEngine()
    enrichment = SemanticGraphEnrichment()
    
    p_states = sim_engine.state_engine.get_patient_states(patient_id, "triangular")
    if not p_states:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} has no clinical measurements.")
        
    communities = comm_engine.detect_communities(threshold=0.4, function_type="triangular")
    patient_community = None
    for c in communities:
        if patient_id in c["members"]:
            patient_community = c
            break
            
    if not patient_community:
        patient_community = communities[0] if communities else None
        
    pattern_info = {}
    hypothesis_desc = "Hipotesis general de perfil clinico hepatico."
    if patient_community:
        top_states = patient_community["top_states"]
        pattern_info = {
            "pattern_name": patient_community["pattern_name"],
            "states": top_states
        }
        hypothesis_desc = enrichment.generate_clinical_hypothesis(top_states)
        
    from backend.semantic.rule_mining_engine import RuleMiningEngine
    rule_engine = RuleMiningEngine()
    rules = rule_engine.mine_semantic_rules()
    
    p_dom_states = {s["variable"]: s["semantic_state"] for s in p_states}
    activated_rules_details = []
    
    for r in rules:
        activated = True
        for cond in r["conditions"]:
            var = cond["variable"]
            op = cond["raw_expression"].split(" ")[1]
            dom = p_dom_states.get(var)
            
            if op in [">", ">="] and dom != "HIGH":
                activated = False
                break
            elif op in ["<", "<="] and dom != "LOW":
                activated = False
                break
                
        if activated:
            strength = enrichment.calculate_evidence_strength(r)
            insight_doc = enrichment.db["decision_insights"].find_one({"insight_id": r["certified_insight_id"]})
            action_name = insight_doc.get("next_analysis_suggested", "Order Liver Panel") if insight_doc else "Order Liver Panel"
            action_desc = insight_doc.get("action", "Revisar cohorte de riesgo.") if insight_doc else "Revisar cohorte de riesgo."
            
            activated_rules_details.append({
                "rule_id": r["rule_id"],
                "expression": r["semantic_expression"],
                "evidence": {
                    "odds_ratio": r["odds_ratio"],
                    "p_value": r["p_value"],
                    "support": r["support"],
                    "confidence": r["confidence"],
                    "lift": r.get("lift", 1.2),
                    "strength": strength
                },
                "risk": "HIGH" if r["confidence"] > 0.7 else "MEDIUM",
                "action": {
                    "name": action_name,
                    "description": action_desc
                }
            })
            
    return {
        "patient_id": patient_id,
        "states": [
            {
                "variable": s["variable"],
                "value": s["value"],
                "state": s["semantic_state"],
                "score": s["membership_score"],
                "entropy": s["entropy"]
            }
            for s in p_states
        ],
        "community": {
            "id": patient_community["community_id"] if patient_community else "Community_Unknown",
            "size": patient_community["size"] if patient_community else 0,
            "dominant_risk": patient_community["dominant_risk"] if patient_community else "LOW",
            "provenance": patient_community["provenance"] if patient_community else {}
        },
        "pattern": pattern_info,
        "hypothesis": hypothesis_desc,
        "activated_rules": activated_rules_details
    }

@router.get("/semantic/drift")
async def get_semantic_drift():
    """
    Computes inter-temporal drift for memberships, rules, and semantic entropy.
    """
    from backend.semantic.semantic_drift_validator import SemanticDriftValidator
    validator = SemanticDriftValidator()
    return validator.run_drift_analysis()

@router.get("/provenance/{node_id}")
async def get_node_provenance(node_id: str):
    """
    Returns the dynamic provenance chain and details for a given node.
    Part of Epic 10.1: Knowledge Provenance Layer.
    """
    from backend.semantic.provenance_engine import ProvenanceEngine
    engine = ProvenanceEngine()
    result = engine.get_provenance(node_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"No provenance found for node {node_id}")
    return result

async def _do_semantic_certification(bg_manager, job_id):
    from backend.audit.semantic_intelligence_validator import SemanticIntelligenceValidator
    import os
    validator = SemanticIntelligenceValidator()
    
    # Save reports in conversation's artifacts folder
    dest_dir = "C:\\Users\\aguil\\.gemini\\antigravity\\brain\\aaca331b-f567-4d86-badb-342963f3bffe"
    os.makedirs(dest_dir, exist_ok=True)
    results = validator.generate_report(dest_dir, bg_manager, job_id)
    return results

@router.post("/semantic/certify")
async def run_semantic_certification():
    """
    Schedules full semantic integrity validator and generates certification artifacts.
    """
    bg = get_bg_job_manager()
    job_id = bg.create_job(job_type="semantic_certification", payload={})
    bg.schedule_job(job_id, _do_semantic_certification(bg, job_id))
    return {"success": True, "job_id": job_id, "status": "queued"}


