import pytest
from unittest.mock import MagicMock
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO
from backend.graph.sync.neo4j_writer import Neo4jWriter
from backend.graph.sync.sync_state_manager import SyncStateManager
from backend.graph.sync.change_stream_listener import ChangeStreamListener


def test_neo4j_writer_write_node(mock_neo4j):
    writer = Neo4jWriter()
    node = GraphNodeDTO(
        id="asset_1",
        label="KnowledgeAsset",
        node_type="ClinicalPattern",
        properties={"status": "ACTIVE"}
    )
    
    writer.write_node(node)
    
    # Assert query execution was run in driver session
    mock_neo4j["session"].run.assert_any_call(
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:KnowledgeAsset) REQUIRE n.id IS UNIQUE"
    )
    # Check session.execute_write was triggered (it runs the lambda internally)
    assert mock_neo4j["session"].execute_write.call_count >= 1


def test_neo4j_writer_soft_delete(mock_neo4j):
    writer = Neo4jWriter()
    writer.soft_delete_node("case_1", "Case")
    
    assert mock_neo4j["session"].execute_write.call_count >= 1


def test_sync_state_manager_load_save(mock_mongo):
    manager = SyncStateManager()
    
    mock_mongo["collection"].find_one.return_value = {
        "collection_name": "cases",
        "sync_version": 2,
        "status": "SUCCESS"
    }
    
    state = manager.load_state("cases")
    assert state["sync_version"] == 2
    
    manager.save_state("cases", resume_token="token_xyz", status="SUCCESS")
    mock_mongo["collection"].replace_one.assert_called_once()


def test_change_stream_listener_process_event(mock_mongo, mock_neo4j):
    listener = ChangeStreamListener()
    
    # Mock insert event
    event = {
        "operationType": "insert",
        "_id": "token_123",
        "fullDocument": {
            "_id": "dummy_oid",
            "asset_id": "asset_1",
            "asset_type": "Pattern",
            "confidence": 0.9,
            "clinical_relevance": "high",
            "related_assets": []
        }
    }
    
    listener.process_change_event("knowledge_assets", event)
    
    # Check sync state saved
    mock_mongo["collection"].replace_one.assert_called_once()
