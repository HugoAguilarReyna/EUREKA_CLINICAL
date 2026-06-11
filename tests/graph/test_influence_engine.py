import pytest
import networkx as nx
from unittest.mock import MagicMock
from backend.graph.analytics.influence_engine import InfluenceEngine

@pytest.fixture
def deterministic_graph():
    """
    Creates a deterministic graph:
    A (Asset) -> B (Asset) -> C (Case)
    A (Asset) -> D (Asset)
    D (Asset) -> E (Case)
    """
    G = nx.DiGraph()
    G.add_edges_from([
        ("A", "B"),
        ("B", "C"),
        ("A", "D"),
        ("D", "E")
    ])
    G.nodes["A"]["label"] = "KnowledgeAsset"
    G.nodes["A"]["pagerank"] = 0.5
    G.nodes["B"]["label"] = "KnowledgeAsset"
    G.nodes["C"]["label"] = "Case"
    G.nodes["D"]["label"] = "KnowledgeAsset"
    G.nodes["E"]["label"] = "Case"
    return G

def test_influence_engine_mathematics(deterministic_graph):
    mock_snapshot = MagicMock()
    mock_snapshot.build_full_graph.return_value = deterministic_graph
    
    engine = InfluenceEngine(snapshot_builder=mock_snapshot)
    
    # A has 4 descendants (B, C, D, E). 2 are assets (B,D), 2 are cases (C,E)
    # A has degree=2 (out_degree=2, in_degree=0) -> score portion = 2 * 2.0 = 4.0
    # A has pagerank=0.5 -> score portion = 0.5 * 100.0 = 50.0
    # A reachability=4 -> score portion = 4 * 5.0 = 20.0
    # Total influence score for A = 20.0 + 4.0 + 50.0 = 74.0
    
    dto_a = engine.calculate_asset_influence("A")
    assert dto_a.asset_id == "A"
    assert len(dto_a.impacted_cases) == 2
    assert "C" in dto_a.impacted_cases
    assert "E" in dto_a.impacted_cases
    assert len(dto_a.impacted_assets) == 2
    assert dto_a.influence_score == 74.0
    
    # D has 1 descendant (E, Case)
    # D degree = 2 (in=1, out=1) -> 2 * 2.0 = 4.0
    # D pagerank = 0.0 -> 0.0
    # D reachability = 1 -> 5.0
    # Total score = 9.0
    dto_d = engine.calculate_asset_influence("D")
    assert dto_d.influence_score == 9.0
    assert len(dto_d.impacted_cases) == 1
    assert dto_d.impacted_cases[0] == "E"
