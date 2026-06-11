from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.graph.models.dtos import GraphNodeDTO, GraphPathDTO

class KnowledgeAssetScoreDTO(BaseModel):
    asset_id: str
    pagerank: float
    betweenness: float
    eigenvector: float
    degree: float
    global_score: float

class InfluenceDTO(BaseModel):
    asset_id: str
    impacted_cases: List[str]
    impacted_assets: List[str]
    influence_score: float
    accuracy_drop_pct: Optional[float] = None
    impact_level: Optional[str] = None
    description: Optional[str] = None
    
    # Upgraded fields for Decision Intelligence 2.0 (Phase 6)
    risk_associated: Optional[str] = None
    affected_patients: Optional[int] = None
    recommendation: Optional[str] = None

class ExplainabilityDTO(GraphPathDTO):
    narrative: str
    decision_points: List[str]

class TraceabilityDTO(BaseModel):
    origin_paths: List[GraphPathDTO]
    usage_paths: List[GraphPathDTO]
    governance_paths: List[GraphPathDTO]

class GraphMetricDTO(BaseModel):
    asset_id: str
    metric_name: str
    metric_value: float

class GraphAnalyticsSummaryDTO(BaseModel):
    total_nodes: int
    total_edges: int
    graph_density: float
    top_assets: List[KnowledgeAssetScoreDTO]
    computed_at: str
    dataset_summary: Dict[str, Any] = Field(default_factory=dict)
    business_discoveries: List[Dict[str, Any]] = Field(default_factory=list)

class InsightDTO(BaseModel):
    id: str
    type: str  # CriticalAsset, Bottleneck, Orphan, Risk, GovernanceGap, ExecutiveInsight
    target_id: str
    description: str
    severity: str  # HIGH, MEDIUM, LOW
    metadata: Dict[str, Any] = Field(default_factory=dict)
