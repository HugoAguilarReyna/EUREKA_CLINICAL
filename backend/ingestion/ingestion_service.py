import os
from typing import Dict, Any, Union
from backend.ingestion.parsers import (
    parse_csv, parse_xlsx, parse_json, 
    parse_txt, parse_md, parse_pdf, 
    parse_docx, parse_html
)
from backend.ingestion.profiling.schema_profiler import profile_schema
from backend.ingestion.ontology.ontology_builder import build_ontology
from backend.ingestion.semantic.semantic_enricher import enrich_semantics
from backend.ingestion.graph_builder.graph_builder import KnowledgeGraphBuilder
from backend.ingestion.models.upload_dtos import UploadJobDTO

class IngestionService:
    def __init__(self):
        self.graph_builder = KnowledgeGraphBuilder()
        self.parsers = {
            "csv": parse_csv,
            "xlsx": parse_xlsx,
            "json": parse_json,
            "txt": parse_txt,
            "md": parse_md,
            "pdf": parse_pdf,
            "docx": parse_docx,
            "html": parse_html
        }

    def process_file(self, file_data: Union[bytes, str], file_name: str, file_type: str) -> Dict[str, Any]:
        """
        Orchestrates the ingestion pipeline:
        1. Parse
        2. Profile
        3. Ontology
        4. Semantic Enrichment
        5. Graph Build
        """
        file_type_lower = file_type.lower()
        if file_type_lower not in self.parsers:
            raise ValueError(f"Unsupported file type: {file_type}")
            
        parser = self.parsers[file_type_lower]
        
        # 1. Parse
        parsed_doc = parser(file_data, file_name)
        
        # 2. Profile
        profile = {}
        if isinstance(parsed_doc.content, list):
            profile = profile_schema(parsed_doc.content)
            
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
        graph_result = self.graph_builder.build_and_persist(
            entities=enriched_entities,
            relationships=enriched_relationships
        )
        
        return {
            "file_name": file_name,
            "status": "success",
            "profile": profile,
            "entities_detected": len(enriched_entities),
            "relationships_detected": len(enriched_relationships),
            "graph_persistence": graph_result
        }
