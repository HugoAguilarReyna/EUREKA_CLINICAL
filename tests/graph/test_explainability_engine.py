import pytest
import networkx as nx
from unittest.mock import MagicMock
from backend.graph.analytics.explainability_engine import ExplainabilityEngine

@pytest.fixture
def explainability_graph():
    """
    Creates a deterministic graph:
    Case_1 -> Asset_1 -> Governance_1
    """
    G = nx.DiGraph()
    G.add_edges_from([
        ("Case_1", "Asset_1", {"type": "USES_ASSET"}),
        ("Governance_1", "Asset_1", {"type": "GOVERNS"})  # Note the direction
    ])
    G.nodes["Case_1"]["label"] = "Case"
    G.nodes["Asset_1"]["label"] = "KnowledgeAsset"
    G.nodes["Governance_1"]["label"] = "GovernanceEvent"
    G.nodes["Governance_1"]["action"] = "APPROVED"
    return G

def test_explain_case(explainability_graph):
    mock_snapshot = MagicMock()
    mock_snapshot.build_full_graph.return_value = explainability_graph
    
    engine = ExplainabilityEngine(snapshot_builder=mock_snapshot)
    
    dto = engine.explain_case("Case_1")
    
    assert len(dto.nodes) == 3
    assert len(dto.edges) == 2
    
    # Verify narrative contains key components
    assert "Case (Case_1)" in dto.narrative
    assert "Governance_1" in dto.narrative
    assert len(dto.decision_points) == 1
    assert "APPROVED" in dto.decision_points[0]

