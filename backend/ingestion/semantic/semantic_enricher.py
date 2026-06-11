from typing import List, Tuple
from backend.ingestion.models.upload_dtos import DetectedEntityDTO, DetectedRelationshipDTO

# Simple dictionary for semantic mapping
MAPPING_RULES = {
    "employee": "Empleado",
    "dept": "Departamento",
    "department": "Departamento",
    "loc": "Ubicacion",
    "location": "Ubicacion",
    "proj": "Proyecto",
    "project": "Proyecto",
    "mgr": "Gerente",
    "manager": "Gerente"
}

def enrich_semantics(
    entities: List[DetectedEntityDTO], 
    relationships: List[DetectedRelationshipDTO]
) -> Tuple[List[DetectedEntityDTO], List[DetectedRelationshipDTO]]:
    
    # Enrich entities
    for entity in entities:
        # Standardize entity type
        original_type = entity.entity_type
        for key, standard_val in MAPPING_RULES.items():
            if key in original_type.lower():
                entity.entity_type = standard_val
                break
                
        # Standardize property keys
        enriched_props = {}
        for k, v in entity.properties.items():
            new_k = k
            for key, standard_val in MAPPING_RULES.items():
                if key in k.lower():
                    new_k = k.lower().replace(key, standard_val.lower())
            enriched_props[new_k] = v
        entity.properties = enriched_props

    # Enrich relationships
    for rel in relationships:
        # Update relationship types
        for key, standard_val in MAPPING_RULES.items():
            if key.upper() in rel.relationship_type.upper():
                # Just replace with a simple standard string if it matches
                rel.relationship_type = f"HAS_{standard_val.upper()}"
                
    return entities, relationships
