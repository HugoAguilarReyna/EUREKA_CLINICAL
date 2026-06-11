import pytest
from unittest.mock import MagicMock


def test_get_asset_endpoint(api_client, mock_mongo):
    mock_mongo["collection"].find_one.return_value = {
        "asset_id": "asset_123",
        "asset_type": "Pattern",
        "confidence": 0.95
    }
    
    response = api_client.get("/graph/assets/asset_123")
    assert response.status_code == 200
    assert response.json()["asset_id"] == "asset_123"


def test_get_asset_endpoint_not_found(api_client, mock_mongo):
    mock_mongo["collection"].find_one.return_value = None
    response = api_client.get("/graph/assets/invalid_id")
    assert response.status_code == 404


def test_get_lineage_endpoint(api_client, mock_neo4j):
    # Mock Neo4j session query path result
    mock_path = MagicMock()
    mock_node = MagicMock()
    mock_node.labels = ["KnowledgeAsset"]
    mock_node.element_id = "asset_123"
    mock_node.get.return_value = "asset_123"
    mock_node.__iter__.return_value = [("id", "asset_123")]
    
    mock_path.nodes = [mock_node]
    mock_path.relationships = []
    
    mock_record = MagicMock()
    mock_record.__getitem__.return_value = mock_path
    
    mock_neo4j["session"].run.return_value = [mock_record]
    
    response = api_client.get("/graph/assets/asset_123/lineage")
    assert response.status_code == 200
    assert len(response.json()["nodes"]) == 1
    assert response.json()["nodes"][0]["id"] == "asset_123"


def test_get_usage_endpoint(api_client, mock_neo4j):
    mock_node = MagicMock()
    mock_node.labels = ["Case"]
    mock_node.element_id = "case_abc"
    mock_node.get.return_value = "case_abc"
    mock_node.__iter__.return_value = [("id", "case_abc")]
    
    mock_record = MagicMock()
    mock_record.__getitem__.return_value = mock_node
    
    mock_neo4j["session"].run.return_value = [mock_record]
    
    response = api_client.get("/graph/assets/asset_123/usage")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "case_abc"


def test_get_governance_endpoint(api_client, mock_neo4j):
    class MockNode(dict):
        def __init__(self, data, labels):
            super().__init__(data)
            self.labels = labels
    
    mock_node = MockNode({"governance_id": "gov_1", "action": "APPROVED"}, ["GovernanceEvent"])
    
    mock_record = MagicMock()
    mock_record.get.return_value = mock_node
    mock_record.__getitem__.return_value = mock_node
    
    mock_neo4j["session"].run.return_value = [mock_record]
    
    response = api_client.get("/graph/assets/asset_123/governance")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["governance_id"] == "gov_1"
