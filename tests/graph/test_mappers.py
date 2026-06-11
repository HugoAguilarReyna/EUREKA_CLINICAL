import datetime
from backend.graph.sync import graph_mapper


def test_map_knowledge_asset():
    doc = {
        "_id": "dummy_oid",
        "asset_id": "asset_001",
        "asset_type": "ClinicalPattern",
        "confidence": 0.95,
        "clinical_relevance": "critical",
        "reuse_count": 5,
        "related_assets": ["asset_002"],
        "created_at": datetime.datetime(2026, 1, 1),
    }
    
    node = graph_mapper.map_knowledge_asset(doc)
    assert node.id == "asset_001"
    assert node.label == "KnowledgeAsset"
    assert node.node_type == "ClinicalPattern"
    assert node.confidence == 0.95
    assert node.properties["clinical_relevance"] == "critical"
    assert node.properties["reuse_count"] == 5
    assert node.created_at == "2026-01-01T00:00:00"


def test_map_case():
    doc = {
        "case_id": "case_abc",
        "patient_id": "patient_1",
        "status": "ANALYZED",
        "prediction_result": {
            "risk_score": 0.82,
            "risk_class": "High"
        }
    }
    
    node = graph_mapper.map_case(doc)
    assert node.id == "case_abc"
    assert node.label == "Case"
    assert node.properties["patient_id"] == "patient_1"
    assert node.properties["risk_score"] == 0.82
    assert node.properties["risk_class"] == "High"


def test_map_governance_event():
    doc = {
        "governance_id": "gov_777",
        "action": "APPROVED",
        "actor": "AgentGoverno",
        "decision": "PROMOTE",
        "reason": "Passed evaluation threshold"
    }
    
    node = graph_mapper.map_governance_event(doc)
    assert node.id == "gov_777"
    assert node.label == "GovernanceEvent"
    assert node.properties["actor"] == "AgentGoverno"


def test_map_relationships():
    doc = {
        "asset_id": "asset_001",
        "related_assets": ["asset_002", "asset_003"],
        "confidence": 0.88
    }
    edges = graph_mapper.map_asset_relationships(doc)
    assert len(edges) == 2
    assert edges[0].src_id == "asset_001"
    assert edges[0].dst_id == "asset_002"
    assert edges[0].type == "RELATED_TO"
    assert edges[0].confidence == 0.88

    case_doc = {
        "case_id": "case_1",
        "knowledge_assets_used": ["asset_001"]
    }
    case_edges = graph_mapper.map_case_asset_relationships(case_doc)
    assert len(case_edges) == 1
    assert case_edges[0].src_id == "case_1"
    assert case_edges[0].dst_id == "asset_001"
    assert case_edges[0].type == "USES_ASSET"
