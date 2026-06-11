"""
Extended tests for graph_service.py (GraphService) and graph_routes.py.
Covers: query_lineage, query_discovery, query_explainability (_extract_path),
_map_neo4j_node_to_dto, empty results, and REST route edge cases.
"""
import pytest
from unittest.mock import MagicMock


# ─── GraphService Extended ────────────────────────────────────────────────────

class TestGraphServiceExtended:
    """Tests for GraphService query methods using mocked Neo4j sessions."""

    def _make_mock_node(self, id_val, label, **props):
        """Create a mock Neo4j node that behaves like dict."""
        class MockNode(dict):
            def __init__(self, data, labels, element_id):
                super().__init__(data)
                self.labels = labels
                self.element_id = element_id
            def get(self, key, default=None):
                return super().get(key, default)
        
        data = {"id": id_val, **props}
        return MockNode(data, [label], f"elem_{id_val}")

    def _make_mock_rel(self, src_node, dst_node, rel_type, **props):
        """Create a mock Neo4j relationship."""
        class MockRel(dict):
            def __init__(self, data, start_node, end_node, rel_type):
                super().__init__(data)
                self.start_node = start_node
                self.end_node = end_node
                self.type = rel_type
            def get(self, key, default=None):
                return super().get(key, default)
        
        return MockRel(props, src_node, dst_node, rel_type)

    def test_query_usage_empty(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        mock_neo4j["session"].run.return_value = []
        
        result = service.query_usage("asset_nonexistent")
        assert result == []

    def test_query_usage_with_results(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        
        mock_node = self._make_mock_node("case_1", "Case",
            patient_id="p1", status="COMPLETED", node_type="Case")
        
        mock_record = MagicMock()
        mock_record.__getitem__.side_effect = lambda k: mock_node if k == "c" else None
        mock_neo4j["session"].run.return_value = [mock_record]
        
        result = service.query_usage("asset_1")
        assert len(result) == 1
        assert result[0].id == "case_1"
        assert result[0].label == "Case"

    def test_query_governance_empty(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        mock_neo4j["session"].run.return_value = []
        
        result = service.query_governance("asset_noevents")
        assert result == []

    def test_query_governance_with_events(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        
        mock_node = self._make_mock_node("gov_1", "GovernanceEvent",
            action="APPROVE", actor="admin")
        
        mock_record = MagicMock()
        mock_record.__getitem__.side_effect = lambda k: mock_node if k == "g" else None
        mock_neo4j["session"].run.return_value = [mock_record]
        
        result = service.query_governance("asset_1")
        assert len(result) == 1
        assert result[0]["action"] == "APPROVE"

    def test_query_lineage_empty(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        mock_neo4j["session"].run.return_value = []
        
        result = service.query_lineage("asset_orphan")
        assert result.nodes == []
        assert result.edges == []

    def test_query_lineage_with_path(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        
        node_a = self._make_mock_node("a1", "KnowledgeAsset")
        node_b = self._make_mock_node("a2", "KnowledgeAsset")
        rel = self._make_mock_rel(node_a, node_b, "RELATED_TO")
        
        mock_path = MagicMock()
        mock_path.nodes = [node_a, node_b]
        mock_path.relationships = [rel]
        
        mock_record = MagicMock()
        mock_record.__getitem__.side_effect = lambda k: mock_path if k == "path" else None
        mock_neo4j["session"].run.return_value = [mock_record]
        
        result = service.query_lineage("a1")
        assert len(result.nodes) == 2
        assert len(result.edges) == 1
        assert result.edges[0].type == "RELATED_TO"

    def test_query_discovery_empty(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        mock_neo4j["session"].run.return_value = []
        
        result = service.query_discovery("case_orphan")
        assert result.nodes == []

    def test_query_explainability_empty(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        mock_neo4j["session"].run.return_value = []
        
        result = service.query_explainability("case_nothing")
        assert result.nodes == []
        assert result.edges == []

    def test_map_neo4j_node_no_labels(self, mock_neo4j):
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        
        class NoLabelNode(dict):
            labels = []
            element_id = "elem_1"
        
        node = NoLabelNode({"id": "n1", "status": "ACTIVE"})
        dto = service._map_neo4j_node_to_dto(node)
        assert dto.id == "n1"
        assert dto.label == "Unknown"

    def test_extract_path_deduplicates_edges(self, mock_neo4j):
        """Same relationship should not be added twice."""
        from backend.graph.services.graph_service import GraphService
        service = GraphService()
        
        node_a = self._make_mock_node("a1", "KnowledgeAsset")
        node_b = self._make_mock_node("a2", "KnowledgeAsset")
        rel = self._make_mock_rel(node_a, node_b, "RELATED_TO")
        
        mock_path = MagicMock()
        mock_path.nodes = [node_a, node_b]
        mock_path.relationships = [rel]
        
        mock_record = MagicMock()
        mock_record.__getitem__.side_effect = lambda k: mock_path if k == "path" else None
        # Return the same path twice — edges should be deduped
        mock_neo4j["session"].run.return_value = [mock_record, mock_record]
        
        result = service._extract_path(
            "MATCH path = (a)-[]->(b) RETURN path",
            {}
        )
        assert len(result.edges) == 1


# ─── REST API Extended ────────────────────────────────────────────────────────

class TestGraphRoutesExtended:
    def test_health_check(self, api_client):
        response = api_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_get_asset_returns_404_when_not_found(self, api_client, mock_mongo, mock_neo4j):
        """When repo returns None, route raises 404."""
        mock_mongo["collection"].find_one.return_value = None
        response = api_client.get("/graph/assets/nonexistent_asset")
        assert response.status_code == 404

    def test_lineage_endpoint_returns_404_when_empty(self, api_client, mock_neo4j):
        """When lineage query returns no nodes, route raises 404 (by design)."""
        mock_neo4j["session"].run.return_value = []
        response = api_client.get("/graph/assets/asset_1/lineage")
        assert response.status_code == 404

    def test_usage_endpoint_returns_empty_list(self, api_client, mock_neo4j):
        mock_neo4j["session"].run.return_value = []
        response = api_client.get("/graph/assets/asset_1/usage")
        assert response.status_code == 200
        assert response.json() == []

    def test_governance_endpoint_returns_empty_list(self, api_client, mock_neo4j):
        mock_neo4j["session"].run.return_value = []
        response = api_client.get("/graph/assets/asset_1/governance")
        assert response.status_code == 200
        assert response.json() == []
