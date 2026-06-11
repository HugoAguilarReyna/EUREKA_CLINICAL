import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.ingestion.ingestion_service import IngestionService
from backend.ingestion.ontology.ontology_builder import build_ontology
from backend.ingestion.semantic.semantic_enricher import enrich_semantics

def test_ingestion():
    file_path = "D:\\antigravity\\Eureka\\Actividad1\\act_liver_disease.csv"
    with open(file_path, "rb") as f:
        content = f.read()
        
    ingestion_svc = IngestionService()
    parser = ingestion_svc.parsers["csv"]
    parsed_doc = parser(content, "act_liver_disease.csv")
    
    from backend.ingestion.profiling.schema_profiler import profile_schema
    profile = profile_schema(parsed_doc.content)
    
    entities, relationships = build_ontology(
        content=parsed_doc.content, file_type=parsed_doc.file_type, file_name=parsed_doc.file_name, profile=profile
    )
    
    print(f"Entities: {len(entities)}")
    print(f"Relationships: {len(relationships)}")
    
    enriched_entities, enriched_relationships = enrich_semantics(entities, relationships)
    print(f"Enriched Entities: {len(enriched_entities)}")
    print(f"Enriched Relationships: {len(enriched_relationships)}")
    
    graph_result = ingestion_svc.graph_builder.build_and_persist(
        entities=enriched_entities, relationships=enriched_relationships
    )
    print("Graph Result:", graph_result)

if __name__ == "__main__":
    test_ingestion()
