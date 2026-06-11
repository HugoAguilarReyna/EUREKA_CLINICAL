import datetime
from typing import Dict, Any, List, Optional
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO


def _to_iso(val: Any) -> Optional[str]:
    """Helper to convert datetime objects to ISO format strings."""
    if isinstance(val, datetime.datetime):
        return val.isoformat()
    elif isinstance(val, str):
        return val
    return None


def map_knowledge_asset(doc: Dict[str, Any]) -> GraphNodeDTO:
    """Map a knowledge_assets Mongo document to a GraphNodeDTO."""
    asset_id = doc.get("asset_id")
    if not asset_id:
        # Fallback to _id if asset_id is missing
        asset_id = str(doc.get("_id", ""))
    
    properties = {
        "clinical_relevance": doc.get("clinical_relevance", "unknown"),
        "reuse_count": doc.get("reuse_count", 0),
        "status": doc.get("status", "ACTIVE")
    }
    
    return GraphNodeDTO(
        id=asset_id,
        label="KnowledgeAsset",
        node_type=doc.get("asset_type", "KnowledgeAsset"),
        confidence=doc.get("confidence"),
        created_at=_to_iso(doc.get("created_at")),
        updated_at=_to_iso(doc.get("updated_at")),
        properties=properties,
        metadata={"original_source": "mongodb"}
    )


def map_case(doc: Dict[str, Any]) -> GraphNodeDTO:
    """Map a cases Mongo document to a GraphNodeDTO."""
    case_id = doc.get("case_id")
    if not case_id:
        case_id = str(doc.get("_id", ""))
        
    properties = {
        "patient_id": doc.get("patient_id", ""),
        "status": doc.get("status", "UPLOADED"),
    }
    
    # Try to extract risk score or class from prediction_result
    pred = doc.get("prediction_result") or {}
    risk_score = pred.get("risk_score")
    if risk_score is not None:
        properties["risk_score"] = float(risk_score)
        
    risk_class = pred.get("risk_class")
    if risk_class is not None:
        properties["risk_class"] = str(risk_class)

    return GraphNodeDTO(
        id=case_id,
        label="Case",
        node_type="Case",
        confidence=None,
        created_at=_to_iso(doc.get("started_at")),
        updated_at=_to_iso(doc.get("completed_at")),
        properties=properties,
        metadata={"original_source": "mongodb"}
    )


def map_governance_event(doc: Dict[str, Any]) -> GraphNodeDTO:
    """Map a knowledge_governance Mongo document to a GraphNodeDTO."""
    gov_id = doc.get("governance_id")
    if not gov_id:
        gov_id = str(doc.get("_id", ""))
        
    properties = {
        "action": doc.get("action", ""),
        "actor": doc.get("actor", ""),
        "decision": doc.get("decision", ""),
        "reason": doc.get("reason", ""),
    }

    return GraphNodeDTO(
        id=gov_id,
        label="GovernanceEvent",
        node_type="GovernanceEvent",
        confidence=None,
        created_at=_to_iso(doc.get("timestamp")),
        updated_at=_to_iso(doc.get("timestamp")),
        properties=properties,
        metadata={"original_source": "mongodb"}
    )


def map_agent_log(doc: Dict[str, Any]) -> GraphNodeDTO:
    """Map an agent_logs Mongo document to a GraphNodeDTO."""
    # Since agent logs don't have a specific unique ID field, we construct one or use _id
    log_id = str(doc.get("_id", doc.get("trace_id", "")))
    if not log_id:
        # Fallback combination
        log_id = f"log_{doc.get('case_id')}_{doc.get('agent_name')}_{int(datetime.datetime.utcnow().timestamp())}"
        
    properties = {
        "case_id": doc.get("case_id", ""),
        "agent_name": doc.get("agent_name", ""),
        "action": doc.get("action", ""),
    }

    return GraphNodeDTO(
        id=log_id,
        label="AgentLog",
        node_type="AgentLog",
        confidence=None,
        created_at=_to_iso(doc.get("timestamp")),
        updated_at=_to_iso(doc.get("timestamp")),
        properties=properties,
        metadata={"original_source": "mongodb"}
    )


def map_episodic_memory(doc: Dict[str, Any]) -> GraphNodeDTO:
    """Map an episodic_memory Mongo document to a GraphNodeDTO."""
    mem_id = str(doc.get("_id", doc.get("trace_id", "")))
    if not mem_id:
        mem_id = f"mem_{doc.get('case_id')}_{doc.get('stage')}_{int(datetime.datetime.utcnow().timestamp())}"
        
    properties = {
        "case_id": doc.get("case_id", ""),
        "stage": doc.get("stage", ""),
        "event_type": doc.get("event_type", ""),
    }

    return GraphNodeDTO(
        id=mem_id,
        label="EpisodicMemoryRecord",
        node_type="EpisodicMemoryRecord",
        confidence=None,
        created_at=_to_iso(doc.get("timestamp")),
        updated_at=_to_iso(doc.get("timestamp")),
        properties=properties,
        metadata={"original_source": "mongodb"}
    )


def map_asset_relationships(doc: Dict[str, Any]) -> List[GraphEdgeDTO]:
    """Extract related_assets and map to GraphEdgeDTO list (RELATED_TO)."""
    src_id = doc.get("asset_id")
    if not src_id:
        return []
        
    edges = []
    related = doc.get("related_assets", [])
    for related_id in related:
        edges.append(
            GraphEdgeDTO(
                src_id=src_id,
                dst_id=related_id,
                relationship_type="RELATED_TO",
                confidence=doc.get("confidence"),
                properties={}
            )
        )
    return edges


def map_case_asset_relationships(doc: Dict[str, Any]) -> List[GraphEdgeDTO]:
    """Extract knowledge_assets_used and map to GraphEdgeDTO list (USES_ASSET)."""
    src_id = doc.get("case_id")
    if not src_id:
        return []
        
    edges = []
    assets_used = doc.get("knowledge_assets_used", [])
    for asset_id in assets_used:
        edges.append(
            GraphEdgeDTO(
                src_id=src_id,
                dst_id=asset_id,
                relationship_type="USES_ASSET",
                properties={}
            )
        )
    return edges


def map_governance_relationships(doc: Dict[str, Any]) -> List[GraphEdgeDTO]:
    """Map governance event relationship to the asset (GOVERNS)."""
    src_id = doc.get("governance_id")
    dst_id = doc.get("asset_id")
    if not src_id or not dst_id:
        return []
        
    return [
        GraphEdgeDTO(
            src_id=src_id,
            dst_id=dst_id,
            relationship_type="GOVERNS",
            properties={}
        )
    ]


def map_agent_log_relationships(doc: Dict[str, Any]) -> List[GraphEdgeDTO]:
    """Map agent log to the case (HAS_LOG)."""
    log_id = str(doc.get("_id", doc.get("trace_id", "")))
    case_id = doc.get("case_id")
    if not log_id or not case_id:
        return []
        
    return [
        GraphEdgeDTO(
            src_id=case_id,
            dst_id=log_id,
            relationship_type="HAS_LOG",
            properties={}
        )
    ]


def map_episodic_memory_relationships(doc: Dict[str, Any]) -> List[GraphEdgeDTO]:
    """Map episodic memory to the case (HAS_MEMORY)."""
    mem_id = str(doc.get("_id", doc.get("trace_id", "")))
    case_id = doc.get("case_id")
    if not mem_id or not case_id:
        return []
        
    return [
        GraphEdgeDTO(
            src_id=case_id,
            dst_id=mem_id,
            relationship_type="HAS_MEMORY",
            properties={}
        )
    ]
