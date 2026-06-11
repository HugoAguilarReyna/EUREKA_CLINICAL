from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class GraphNodeDTO(BaseModel):
    id: str
    label: str
    node_type: Optional[str] = None
    confidence: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphEdgeDTO(BaseModel):
    src_id: str
    dst_id: str
    type: str = Field(alias='relationship_type')
    weight: Optional[float] = None
    confidence: Optional[float] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphPathDTO(BaseModel):
    nodes: List[GraphNodeDTO]
    edges: List[GraphEdgeDTO]
