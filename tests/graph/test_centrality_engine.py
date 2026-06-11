import pytest
import networkx as nx
from unittest.mock import MagicMock
from backend.graph.analytics.centrality_engine import CentralityEngine

@pytest.fixture
def deterministic_graph():
    """
    Creates a deterministic graph:
    A -> B -> C
    A -> D
    D -> E
    """
    G = nx.DiGraph()
    G.add_edges_from([
        ("A", "B"),
        ("B", "C"),
        ("A", "D"),
        ("D", "E")
    ])
    for n in G.nodes():
        G.nodes[n]["label"] = "KnowledgeAsset"
    return G

def test_centrality_engine_mathematics(deterministic_graph):
    # Mock snapshot builder and neo4j client
    mock_snapshot = MagicMock()
    mock_snapshot.build_full_graph.return_value = deterministic_graph
    
    mock_neo4j = MagicMock()
    
    engine = CentralityEngine(snapshot_builder=mock_snapshot, neo4j_client=mock_neo4j)
    
    # Extract calculations directly without persisting for verification
    pagerank = engine.compute_pagerank(deterministic_graph)
    betweenness = engine.compute_betweenness(deterministic_graph)
    degree = engine.compute_degree(deterministic_graph)
    
    # Validate Degree Centrality (nx degree centrality for directed graph is in_degree + out_degree / (n-1))
    # A has out=2, in=0 -> 2/4 = 0.5
    # B has in=1, out=1 -> 2/4 = 0.5
    # C has in=1, out=0 -> 1/4 = 0.25
    assert degree["A"] == 0.5
    assert degree["B"] == 0.5
    assert degree["C"] == 0.25
    
    # Validate Betweenness Centrality (shortest paths passing through node)
    # A is root (0), C and E are leaves (0). B and D are intermediate.
    # Paths: A->C passes through B. A->E passes through D.
    assert betweenness["A"] == 0.0
    assert betweenness["C"] == 0.0
    assert betweenness["E"] == 0.0
    assert betweenness["B"] > 0.0
    assert betweenness["D"] > 0.0
    
    # Run full pipeline to check DTOs and Normalization
    scores = engine.compute_metrics()
    assert len(scores) == 5
    
    # Ensure one asset has global_score = 100 and one has 0 due to normalization
    global_scores = [s.global_score for s in scores]
    assert max(global_scores) == 100.0
    assert min(global_scores) == 0.0
    
    # Verify persistence was called
    mock_neo4j.session.assert_called_once()
