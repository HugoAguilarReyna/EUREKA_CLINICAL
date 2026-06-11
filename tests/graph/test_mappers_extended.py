"""
Comprehensive tests for graph_mapper.py — targets uncovered mappers:
map_agent_log, map_episodic_memory, map_*_relationships edge cases,
_to_iso helper, and all missing/fallback paths.
"""
import datetime
import pytest
from backend.graph.sync.graph_mapper import (
    _to_iso,
    map_knowledge_asset,
    map_case,
    map_governance_event,
    map_agent_log,
    map_episodic_memory,
    map_asset_relationships,
    map_case_asset_relationships,
    map_governance_relationships,
    map_agent_log_relationships,
    map_episodic_memory_relationships,
)


# ─── _to_iso helper ────────────────────────────────────────────────────────────

class TestToIso:
    def test_datetime_object(self):
        dt = datetime.datetime(2024, 1, 15, 12, 0, 0)
        result = _to_iso(dt)
        assert result == "2024-01-15T12:00:00"

    def test_string_passthrough(self):
        result = _to_iso("2024-01-15T12:00:00")
        assert result == "2024-01-15T12:00:00"

    def test_none_returns_none(self):
        assert _to_iso(None) is None

    def test_int_returns_none(self):
        assert _to_iso(12345) is None


# ─── map_knowledge_asset ───────────────────────────────────────────────────────

class TestMapKnowledgeAsset:
    def test_full_document(self):
        doc = {
            "asset_id": "asset_1",
            "asset_type": "ClinicalPattern",
            "confidence": 0.95,
            "clinical_relevance": "high",
            "reuse_count": 5,
            "status": "ACTIVE",
            "created_at": "2024-01-01",
            "updated_at": "2024-06-01",
        }
        node = map_knowledge_asset(doc)
        assert node.id == "asset_1"
        assert node.label == "KnowledgeAsset"
        assert node.node_type == "ClinicalPattern"
        assert node.confidence == 0.95
        assert node.properties["clinical_relevance"] == "high"
        assert node.properties["reuse_count"] == 5

    def test_missing_asset_id_falls_back_to_oid(self):
        doc = {"_id": "oid_fallback", "asset_type": "Pattern"}
        node = map_knowledge_asset(doc)
        assert node.id == "oid_fallback"

    def test_defaults_applied(self):
        doc = {"asset_id": "a1"}
        node = map_knowledge_asset(doc)
        assert node.properties["clinical_relevance"] == "unknown"
        assert node.properties["reuse_count"] == 0
        assert node.properties["status"] == "ACTIVE"


# ─── map_case ─────────────────────────────────────────────────────────────────

class TestMapCase:
    def test_full_case_with_prediction(self):
        doc = {
            "case_id": "case_1",
            "patient_id": "patient_99",
            "status": "COMPLETED",
            "prediction_result": {"risk_score": 0.78, "risk_class": "HIGH"},
            "started_at": "2024-01-01T00:00:00",
            "completed_at": "2024-01-02T00:00:00",
        }
        node = map_case(doc)
        assert node.id == "case_1"
        assert node.label == "Case"
        assert node.properties["patient_id"] == "patient_99"
        assert node.properties["risk_score"] == pytest.approx(0.78)
        assert node.properties["risk_class"] == "HIGH"

    def test_missing_case_id_falls_back_to_oid(self):
        doc = {"_id": "oid_case"}
        node = map_case(doc)
        assert node.id == "oid_case"

    def test_no_prediction_result(self):
        doc = {"case_id": "case_2"}
        node = map_case(doc)
        assert "risk_score" not in node.properties
        assert "risk_class" not in node.properties

    def test_empty_prediction_result(self):
        doc = {"case_id": "case_3", "prediction_result": {}}
        node = map_case(doc)
        assert "risk_score" not in node.properties

    def test_datetime_timestamps(self):
        dt = datetime.datetime(2024, 3, 1, 9, 0, 0)
        doc = {"case_id": "case_4", "started_at": dt, "completed_at": dt}
        node = map_case(doc)
        assert node.created_at == "2024-03-01T09:00:00"


# ─── map_governance_event ─────────────────────────────────────────────────────

class TestMapGovernanceEvent:
    def test_full_governance(self):
        doc = {
            "governance_id": "gov_1",
            "action": "APPROVE",
            "actor": "admin",
            "decision": "APPROVED",
            "reason": "Policy compliance",
            "timestamp": "2024-05-01T10:00:00",
        }
        node = map_governance_event(doc)
        assert node.id == "gov_1"
        assert node.label == "GovernanceEvent"
        assert node.properties["action"] == "APPROVE"
        assert node.properties["actor"] == "admin"

    def test_missing_governance_id_fallback(self):
        doc = {"_id": "oid_gov"}
        node = map_governance_event(doc)
        assert node.id == "oid_gov"

    def test_defaults(self):
        doc = {"governance_id": "gov_2"}
        node = map_governance_event(doc)
        assert node.properties["action"] == ""
        assert node.properties["decision"] == ""


# ─── map_agent_log ────────────────────────────────────────────────────────────

class TestMapAgentLog:
    def test_full_agent_log(self):
        doc = {
            "_id": "log_oid_1",
            "trace_id": "trace_abc",
            "case_id": "case_1",
            "agent_name": "DiagnosticAgent",
            "action": "PREDICT",
            "timestamp": "2024-04-01T08:00:00",
        }
        node = map_agent_log(doc)
        # _id takes priority over trace_id
        assert node.id == "log_oid_1"
        assert node.label == "AgentLog"
        assert node.properties["case_id"] == "case_1"
        assert node.properties["agent_name"] == "DiagnosticAgent"
        assert node.properties["action"] == "PREDICT"

    def test_fallback_to_trace_id(self):
        doc = {"trace_id": "trace_xyz", "case_id": "case_2", "agent_name": "AgentB"}
        # _id is missing, so trace_id used
        node = map_agent_log(doc)
        assert node.id == "trace_xyz"

    def test_defaults(self):
        doc = {"_id": "log_2"}
        node = map_agent_log(doc)
        assert node.properties["case_id"] == ""
        assert node.properties["agent_name"] == ""
        assert node.properties["action"] == ""


# ─── map_episodic_memory ──────────────────────────────────────────────────────

class TestMapEpisodicMemory:
    def test_full_memory(self):
        doc = {
            "_id": "mem_oid_1",
            "case_id": "case_5",
            "stage": "DIAGNOSIS",
            "event_type": "PREDICTION_MADE",
            "timestamp": "2024-02-10T15:00:00",
        }
        node = map_episodic_memory(doc)
        assert node.id == "mem_oid_1"
        assert node.label == "EpisodicMemoryRecord"
        assert node.properties["case_id"] == "case_5"
        assert node.properties["stage"] == "DIAGNOSIS"
        assert node.properties["event_type"] == "PREDICTION_MADE"

    def test_fallback_to_trace_id(self):
        doc = {"trace_id": "trace_mem", "case_id": "case_6"}
        node = map_episodic_memory(doc)
        assert node.id == "trace_mem"

    def test_defaults(self):
        doc = {"_id": "mem_3"}
        node = map_episodic_memory(doc)
        assert node.properties["stage"] == ""
        assert node.properties["event_type"] == ""


# ─── Relationship Mappers ─────────────────────────────────────────────────────

class TestAssetRelationships:
    def test_multiple_related_assets(self):
        doc = {"asset_id": "a1", "related_assets": ["a2", "a3"], "confidence": 0.8}
        edges = map_asset_relationships(doc)
        assert len(edges) == 2
        assert edges[0].src_id == "a1"
        assert edges[0].dst_id == "a2"
        assert edges[0].type == "RELATED_TO"
        assert edges[0].confidence == 0.8

    def test_no_related_assets(self):
        doc = {"asset_id": "a1", "related_assets": []}
        assert map_asset_relationships(doc) == []

    def test_missing_asset_id(self):
        doc = {"related_assets": ["a2"]}
        assert map_asset_relationships(doc) == []

    def test_missing_related_assets_key(self):
        doc = {"asset_id": "a1"}
        assert map_asset_relationships(doc) == []


class TestCaseAssetRelationships:
    def test_multiple_assets_used(self):
        doc = {"case_id": "case_1", "knowledge_assets_used": ["a1", "a2", "a3"]}
        edges = map_case_asset_relationships(doc)
        assert len(edges) == 3
        assert all(e.type == "USES_ASSET" for e in edges)
        assert edges[0].src_id == "case_1"

    def test_no_assets_used(self):
        doc = {"case_id": "case_1", "knowledge_assets_used": []}
        assert map_case_asset_relationships(doc) == []

    def test_missing_case_id(self):
        doc = {"knowledge_assets_used": ["a1"]}
        assert map_case_asset_relationships(doc) == []


class TestGovernanceRelationships:
    def test_governs_edge(self):
        doc = {"governance_id": "gov_1", "asset_id": "asset_99"}
        edges = map_governance_relationships(doc)
        assert len(edges) == 1
        assert edges[0].src_id == "gov_1"
        assert edges[0].dst_id == "asset_99"
        assert edges[0].type == "GOVERNS"

    def test_missing_governance_id(self):
        doc = {"asset_id": "asset_99"}
        assert map_governance_relationships(doc) == []

    def test_missing_asset_id(self):
        doc = {"governance_id": "gov_1"}
        assert map_governance_relationships(doc) == []


class TestAgentLogRelationships:
    def test_has_log_edge(self):
        doc = {"_id": "log_1", "case_id": "case_2"}
        edges = map_agent_log_relationships(doc)
        assert len(edges) == 1
        assert edges[0].src_id == "case_2"
        assert edges[0].dst_id == "log_1"
        assert edges[0].type == "HAS_LOG"

    def test_missing_case_id(self):
        doc = {"_id": "log_1"}
        assert map_agent_log_relationships(doc) == []


class TestEpisodicMemoryRelationships:
    def test_has_memory_edge(self):
        doc = {"_id": "mem_1", "case_id": "case_3"}
        edges = map_episodic_memory_relationships(doc)
        assert len(edges) == 1
        assert edges[0].src_id == "case_3"
        assert edges[0].dst_id == "mem_1"
        assert edges[0].type == "HAS_MEMORY"

    def test_missing_case_id(self):
        doc = {"_id": "mem_2"}
        assert map_episodic_memory_relationships(doc) == []
