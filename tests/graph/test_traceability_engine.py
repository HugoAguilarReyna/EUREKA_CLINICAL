import pytest
import networkx as nx
from unittest.mock import MagicMock
from backend.graph.analytics.traceability_engine import TraceabilityEngine

@pytest.fixture
def traceability_graph():
    """
    Creates a deterministic graph for tracing:
    Asset_1 -> Asset_2
    Governance_1 -> Asset_1
    Asset_2 -> Case_1
    Asset_2 -> Case_2
    """
    G = nx.DiGraph()
    G.add_edges_from([
        ("Asset_1", "Asset_2", {"type": "RELATED_TO"}),
        ("Governance_1", "Asset_1", {"type": "GOVERNS"}),
        ("Asset_2", "Case_1", {"type": "USES_ASSET"}),
        ("Asset_2", "Case_2", {"type": "USES_ASSET"})
    ])
    G.nodes["Asset_1"]["label"] = "KnowledgeAsset"
    G.nodes["Asset_2"]["label"] = "KnowledgeAsset"
    G.nodes["Governance_1"]["label"] = "GovernanceEvent"
    G.nodes["Case_1"]["label"] = "Case"
    G.nodes["Case_2"]["label"] = "Case"
    return G

def test_trace_asset(traceability_graph):
    mock_snapshot = MagicMock()
    mock_snapshot.build_full_graph.return_value = traceability_graph
    
    engine = TraceabilityEngine(snapshot_builder=mock_snapshot)
    
    dto = engine.trace_asset("Asset_2")
    
    # Origins: Asset_1 and Governance_1 (ancestors of Asset_2)
    assert len(dto.origin_paths) == 2
    assert dto.origin_paths[0].nodes[0].id in ["Asset_1", "Governance_1"]


    
    # Usages: Case_1, Case_2
    assert len(dto.usage_paths) == 2
    
    # Trace Asset_1
    dto_a1 = engine.trace_asset("Asset_1")
    assert len(dto_a1.governance_paths) == 1
    assert dto_a1.governance_paths[0].nodes[0].id == "Governance_1"
