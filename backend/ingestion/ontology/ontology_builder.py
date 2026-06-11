import uuid
from typing import List, Dict, Any, Tuple
from backend.ingestion.models.upload_dtos import DetectedEntityDTO, DetectedRelationshipDTO

def build_ontology(
    content: Any, 
    file_type: str, 
    file_name: str, 
    profile: Dict[str, Any] = None
) -> Tuple[List[DetectedEntityDTO], List[DetectedRelationshipDTO]]:
    
    entities = []
    relationships = []
    
    if isinstance(content, list):
        # Structured data (CSV, XLSX, JSON)
        patient_props_keywords = ['age', 'gender', 'sex', 'id', 'name', 'patient', 'person', 'dob']
        lab_metric_keywords = ['tb', 'db', 'alkphos', 'sgpt', 'sgot', 'tp', 'alb', 'ratio', 'selector', 'metric', 'value', 'lab', 'test']
        
        for i, row in enumerate(content):
            patient_id = f"Patient_{i}"
            patient_props = {}
            row_entities = []
            
            for key, value in row.items():
                if value is None:
                    continue
                    
                col_lower = str(key).lower()
                
                # Semantic Mapping Dictionary
                semantic_map = {
                    "alb": "Albumin",
                    "tb": "Total Bilirubin",
                    "db": "Direct Bilirubin",
                    "tp": "Total Proteins",
                    "alkphos": "Alkaline Phosphatase",
                    "sgpt": "Alamine Aminotransferase",
                    "sgot": "Aspartate Aminotransferase",
                    "ratio": "A/G Ratio",
                    "age": "Age",
                    "gender": "Gender",
                    "selector": "Liver Disease Indicator"
                }
                
                semantic_name = key
                for k, v in semantic_map.items():
                    if k in col_lower:
                        semantic_name = v
                        break
                
                # Rule 1
                if any(kw in col_lower for kw in patient_props_keywords):
                    patient_props[key] = value
                # Rule 2
                elif any(kw in col_lower for kw in lab_metric_keywords):
                    metric_id = f"LabMetric_{i}_{key}"
                    row_entities.append(DetectedEntityDTO(
                        entity_id=metric_id,
                        entity_type="LaboratoryMetric",
                        properties={"metric_name": key, "value": value, "semantic_name": semantic_name}
                    ))
                    relationships.append(DetectedRelationshipDTO(
                        source_id=patient_id,
                        target_id=metric_id,
                        relationship_type="HAS_MEASUREMENT",
                        properties={}
                    ))
                # Fallback
                else:
                    attr_id = f"ClinAttr_{i}_{key}"
                    row_entities.append(DetectedEntityDTO(
                        entity_id=attr_id,
                        entity_type="ClinicalAttribute",
                        properties={"attribute_name": key, "value": value, "semantic_name": semantic_name}
                    ))
                    relationships.append(DetectedRelationshipDTO(
                        source_id=patient_id,
                        target_id=attr_id,
                        relationship_type="HAS_ATTRIBUTE",
                        properties={}
                    ))
                    
            patient_entity = DetectedEntityDTO(
                entity_id=patient_id,
                entity_type="Patient",
                properties=patient_props
            )
            entities.append(patient_entity)
            entities.extend(row_entities)
            
        # Add a DatasetMetadata node to persist the profile in the graph
        if profile:
            target = profile.get("target_candidate", "Unknown")
            highly_corr = str(profile.get("highly_correlated_features", []))
            dataset_entity = DetectedEntityDTO(
                entity_id="Dataset_Metadata_Global",
                entity_type="DatasetMetadata",
                properties={
                    "file_name": file_name,
                    "file_type": file_type,
                    "rows": profile.get("num_rows", 0),
                    "columns": profile.get("num_columns", 0),
                    "missing_values": profile.get("missing_values", 0),
                    "quality_score": profile.get("quality_score", 0),
                    "target_candidate": target,
                    "highly_correlated_features": highly_corr,
                    "outliers_detected": profile.get("outliers_detected", 0)
                }
            )
            entities.append(dataset_entity)
            
    else:
        doc_entity_id = f"Doc_{uuid.uuid4().hex[:8]}"
        doc_entity = DetectedEntityDTO(
            entity_id=doc_entity_id,
            entity_type="Document",
            properties={
                "file_name": file_name,
                "file_type": file_type,
                "text_preview": str(content)[:500]
            }
        )
        entities.append(doc_entity)
        
    unique_entities = {e.entity_id: e for e in entities}
    return list(unique_entities.values()), relationships
