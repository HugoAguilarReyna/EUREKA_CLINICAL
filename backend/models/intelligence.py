from beanie import Document
from pydantic import Field
from typing import List, Literal, Dict, Any
from datetime import datetime

class DecisionInsightRecord(Document):
    insight_id: str = Field(unique=True)
    title: str
    description: str
    evidence: str
    confidence: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    action: str
    affected_population: int
    impacted_variables: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "decision_insights"


class MinedRuleRecord(Document):
    rule_id: str = Field(unique=True)
    expression: str  # e.g., "DB > 1.5 & TB > 3.0 & A_G_Ratio < 0.8"
    conditions: List[Dict[str, Any]] # e.g., [{"variable": "DB", "op": ">", "val": 1.5}]
    target_class: str = "Liver Disease"
    lift: float
    support: float
    confidence: float
    affected_count: int
    rule_status: Literal["ACTIVE", "ARCHIVED", "DRAFT"] = "ACTIVE"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "mined_rules"
