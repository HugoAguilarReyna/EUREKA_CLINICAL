from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class UploadJobDTO(BaseModel):
    job_id: str
    file_name: str
    file_type: str
    status: str = "pending"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ParsedDocumentDTO(BaseModel):
    file_name: str
    file_type: str
    # 'text' for unstructured, list of dicts for structured
    content: Union[str, List[Dict[str, Any]]] 
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DetectedEntityDTO(BaseModel):
    entity_id: str
    entity_type: str
    properties: Dict[str, Any] = Field(default_factory=dict)

class DetectedRelationshipDTO(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str
    properties: Dict[str, Any] = Field(default_factory=dict)

class InsightDTO(BaseModel):
    description: str
    confidence: float
    related_entities: List[str] = Field(default_factory=list)

class DatasetInsightDTO(BaseModel):
    rows: int
    columns: int
    missing_values: int
    target_candidate: Optional[str]
    highly_correlated_features: List[Dict[str, Any]]
    outliers_detected: int
    quality_score: int

class KnowledgeGraphBuildDTO(BaseModel):
    entities: List[DetectedEntityDTO]
    relationships: List[DetectedRelationshipDTO]
    insights: List[InsightDTO] = Field(default_factory=list)
