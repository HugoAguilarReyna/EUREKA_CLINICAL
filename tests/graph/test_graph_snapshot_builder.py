import pytest
from unittest.mock import MagicMock
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder

def test_build_full_graph():
    mock_neo4j = MagicMock()
    mock_session = MagicMock()
    mock_neo4j.session.return_value.__enter__.return_value = mock_session
    
    class MockNode(dict):
        def __init__(self, id, labels, **kwargs):
            super().__init__(**kwargs)
            self.element_id = id
            self.labels = labels
        def get(self, key, default=None):
            if key == "id": return self.element_id
            return super().get(key, default)
            
    class MockRel(dict):
        def __init__(self, type, **kwargs):
            super().__init__(**kwargs)
            self.type = type
            
    n1 = MockNode("node1", ["KnowledgeAsset"])
    n2 = MockNode("node2", ["Case"])
    r = MockRel("USES_ASSET")
    
    mock_session.run.return_value = [{"n": n1, "r": r, "m": n2}, {"n": n1, "r": None, "m": None}]
    
    builder = GraphSnapshotBuilder(mock_neo4j)
    G = builder.build_full_graph()
    
    assert G.number_of_nodes() == 2
    assert G.number_of_edges() == 1
    assert G.has_edge("node1", "node2")

def test_build_subgraphs():
    mock_neo4j = MagicMock()
    mock_session = MagicMock()
    mock_neo4j.session.return_value.__enter__.return_value = mock_session
    mock_session.run.return_value = []
    
    builder = GraphSnapshotBuilder(mock_neo4j)
    G_asset = builder.build_asset_subgraph("asset1")
    assert G_asset.number_of_nodes() == 0
    
    G_case = builder.build_case_subgraph("case1")
    assert G_case.number_of_nodes() == 0
