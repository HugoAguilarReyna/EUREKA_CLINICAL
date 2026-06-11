import os
import sys
import time
import asyncio
from typing import Dict, Any

from backend.ingestion.ingestion_service import IngestionService
from backend.intelligence.decision_engine import DecisionEngine
from backend.intelligence.risk_engine import RiskEngine
from backend.intelligence.simulation_engine import SimulationEngine
from backend.graph.client import Neo4jClient

async def run_bootstrap():
    print("Starting full intelligence bootstrap pipeline...")
    
    # 1. Load Dataset
    raw_path = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "raw", "Indian Liver Patient Dataset (ILPD).csv")
    if not os.path.exists(raw_path):
        print(f"File not found: {raw_path}")
        return
        
    with open(raw_path, "rb") as f:
        content = f.read()
        
    file_name = "Indian Liver Patient Dataset (ILPD).csv"
    file_type = "csv"
    
    # Check if already loaded
    neo4j_client = Neo4jClient()
    with neo4j_client.get_session() as session:
        result = session.run("MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'}) RETURN n.rows as rows")
        rec = result.single()
        if rec and rec["rows"] > 0:
            print("Dataset already loaded. Skipping.")
            # In actual endpoint, we return early
    
    # 2. Ingestion Service (Parse, Profile, Semantic States, Graph Build)
    ingestion_svc = IngestionService()
    
    print("Parsing dataset...")
    parser = ingestion_svc.parsers[file_type]
    parsed_doc = parser(content, file_name)
    
    print("Profiling schema...")
    from backend.ingestion.profiling.schema_profiler import profile_schema
    profile = profile_schema(parsed_doc.content)
    
    print("Building ontology...")
    from backend.ingestion.ontology.ontology_builder import build_ontology
    entities, relationships = build_ontology(
        content=parsed_doc.content,
        file_type=parsed_doc.file_type,
        file_name=parsed_doc.file_name,
        profile=profile
    )
    
    print("Enriching semantics...")
    from backend.ingestion.semantic.semantic_enricher import enrich_semantics
    enriched_entities, enriched_relationships = enrich_semantics(entities, relationships)
    
    print("Building knowledge graph...")
    graph_result = ingestion_svc.graph_builder.build_and_persist(
        entities=enriched_entities,
        relationships=enriched_relationships
    )
    
    # Also run semantic_bootstrap.py logic if needed? 
    # The current graph_builder might handle this or not. Let's run semantic_bootstrap's main logic explicitly if we have to.
    
    # 3. Intelligence pipeline
    print("Mining Rules and Communities...")
    _risker = RiskEngine()
    _decider = DecisionEngine()
    
    # This recalculates risk patterns, subgroups
    patterns = await _risker.mine_patterns()
    
    # This recalculates decision insights
    insights = await _decider.get_all_insights()
    
    print("Bootstrap completed successfully.")
    
if __name__ == "__main__":
    asyncio.run(run_bootstrap())
