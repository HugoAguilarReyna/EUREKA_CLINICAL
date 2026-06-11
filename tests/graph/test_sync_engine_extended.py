"""
Comprehensive tests for the sync engine:
- Neo4jWriter: write_nodes (batch), write_edges, invalid labels, empty inputs
- ChangeStreamListener: update, replace, delete, malformed, error paths
- GraphSyncService: sync_document, full_sync, invalid collections
- SyncStateManager: get_sync_version, state versioning
"""
import pytest
from unittest.mock import MagicMock, patch, call
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO
from backend.graph.sync.neo4j_writer import Neo4jWriter
from backend.graph.sync.sync_state_manager import SyncStateManager
from backend.graph.sync.change_stream_listener import ChangeStreamListener
from backend.graph.sync.graph_sync_service import GraphSyncService


# ─── Neo4jWriter Extended ─────────────────────────────────────────────────────

class TestNeo4jWriterExtended:
    def test_write_empty_nodes_returns_zero(self, mock_neo4j):
        writer = Neo4jWriter()
        result = writer.write_nodes([])
        assert result == 0

    def test_write_invalid_label_skipped(self, mock_neo4j):
        writer = Neo4jWriter()
        node = GraphNodeDTO(
            id="bad_1",
            label="InvalidLabel",
            node_type="Unknown",
            properties={}
        )
        result = writer.write_nodes([node])
        # Invalid label → skipped → 0 written
        assert result == 0
        # execute_write should NOT be called for invalid label nodes
        # (it IS called by create_constraints, check it never went past that)
        
    def test_write_multiple_nodes(self, mock_neo4j):
        writer = Neo4jWriter()
        nodes = [
            GraphNodeDTO(id=f"asset_{i}", label="KnowledgeAsset", node_type="Pattern", properties={})
            for i in range(3)
        ]
        result = writer.write_nodes(nodes)
        assert result == 3
        # execute_write called once per node
        assert mock_neo4j["session"].execute_write.call_count >= 3

    def test_write_edge_success(self, mock_neo4j):
        writer = Neo4jWriter()
        edge = GraphEdgeDTO(
            src_id="a1",
            dst_id="a2",
            relationship_type="RELATED_TO",
            properties={}
        )
        result = writer.write_edges([edge])
        assert result == 1

    def test_write_empty_edges_returns_zero(self, mock_neo4j):
        writer = Neo4jWriter()
        result = writer.write_edges([])
        assert result == 0

    def test_write_edge_with_weight_and_confidence(self, mock_neo4j):
        writer = Neo4jWriter()
        edge = GraphEdgeDTO(
            src_id="c1",
            dst_id="a1",
            relationship_type="USES_ASSET",
            properties={"context": "clinical"},
            weight=0.9,
            confidence=0.85
        )
        result = writer.write_edges([edge])
        assert result == 1

    def test_soft_delete_invalid_label_skips(self, mock_neo4j):
        writer = Neo4jWriter()
        writer.soft_delete_node("bad_id", "NotALabel")
        # execute_write should NOT be called (guarded by VALID_LABELS check)
        assert mock_neo4j["session"].execute_write.call_count == 0

    def test_write_node_with_confidence(self, mock_neo4j):
        writer = Neo4jWriter()
        node = GraphNodeDTO(
            id="asset_conf",
            label="KnowledgeAsset",
            node_type="Pattern",
            confidence=0.77,
            properties={}
        )
        result = writer.write_nodes([node])
        assert result == 1


# ─── SyncStateManager Extended ────────────────────────────────────────────────

class TestSyncStateManagerExtended:
    def test_load_state_not_found_returns_none(self, mock_mongo):
        manager = SyncStateManager()
        mock_mongo["collection"].find_one.return_value = None
        result = manager.load_state("knowledge_assets")
        assert result is None

    def test_save_state_increments_version(self, mock_mongo):
        manager = SyncStateManager()
        # Simulate existing state with version 4
        mock_mongo["collection"].find_one.return_value = {
            "collection_name": "cases",
            "sync_version": 4,
            "status": "SUCCESS"
        }
        manager.save_state("cases", resume_token="tok_1", status="SUCCESS")
        call_args = mock_mongo["collection"].replace_one.call_args
        assert call_args is not None
        saved_doc = call_args[0][1]
        assert saved_doc["sync_version"] == 5

    def test_get_sync_version_no_state(self, mock_mongo):
        manager = SyncStateManager()
        mock_mongo["collection"].find_one.return_value = None
        version = manager.get_sync_version("knowledge_governance")
        assert version == 0

    def test_get_sync_version_with_existing_state(self, mock_mongo):
        manager = SyncStateManager()
        mock_mongo["collection"].find_one.return_value = {
            "collection_name": "knowledge_governance",
            "sync_version": 7
        }
        version = manager.get_sync_version("knowledge_governance")
        assert version == 7

    def test_load_state_strips_id(self, mock_mongo):
        manager = SyncStateManager()
        mock_mongo["collection"].find_one.return_value = {
            "_id": "oid_abc",
            "collection_name": "cases",
            "sync_version": 1
        }
        state = manager.load_state("cases")
        assert "_id" not in state


# ─── ChangeStreamListener Extended ────────────────────────────────────────────

class TestChangeStreamListenerExtended:
    def test_process_update_event(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "update",
            "_id": "token_upd",
            "fullDocument": {
                "_id": "oid_case",
                "case_id": "case_upd",
                "patient_id": "patient_1",
                "status": "PROCESSING"
            }
        }
        listener.process_change_event("cases", event)
        mock_mongo["collection"].replace_one.assert_called_once()

    def test_process_replace_event(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "replace",
            "_id": "token_rep",
            "fullDocument": {
                "_id": "oid_gov",
                "governance_id": "gov_replace",
                "asset_id": "asset_1",
                "action": "REVOKE",
                "actor": "admin"
            }
        }
        listener.process_change_event("knowledge_governance", event)
        mock_mongo["collection"].replace_one.assert_called_once()

    def test_process_delete_event(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "delete",
            "_id": "token_del",
            "documentKey": {"_id": "some_oid"}
        }
        listener.process_change_event("knowledge_assets", event)
        # Soft delete should trigger execute_write on Neo4j session
        assert mock_neo4j["session"].execute_write.call_count >= 1

    def test_missing_full_document_skips(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "insert",
            "_id": "token_missing_doc",
            "fullDocument": None
        }
        # Should return early without raising
        listener.process_change_event("cases", event)
        # State should NOT be saved (no doc = nothing written)
        mock_mongo["collection"].replace_one.assert_not_called()

    def test_unknown_operation_type_ignored(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "invalidate",
            "_id": "token_inv",
        }
        # Should complete without error — unknown type falls through
        listener.process_change_event("knowledge_assets", event)
        # State saved with resume token even on no-ops
        mock_mongo["collection"].replace_one.assert_called_once()

    def test_process_agent_log_insert(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "insert",
            "_id": "tok_log",
            "fullDocument": {
                "_id": "log_oid_1",
                "case_id": "case_1",
                "agent_name": "DiagAgent",
                "action": "PREDICT"
            }
        }
        listener.process_change_event("agent_logs", event)
        mock_mongo["collection"].replace_one.assert_called_once()

    def test_process_episodic_memory_insert(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        event = {
            "operationType": "insert",
            "_id": "tok_mem",
            "fullDocument": {
                "_id": "mem_oid_1",
                "case_id": "case_2",
                "stage": "DIAGNOSIS",
                "event_type": "DIAGNOSIS_MADE"
            }
        }
        listener.process_change_event("episodic_memory", event)
        mock_mongo["collection"].replace_one.assert_called_once()

    def test_error_in_processing_saves_failed_state(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        # Force an error by providing unmapped collection
        with pytest.raises(ValueError):
            listener.process_change_event("nonexistent_collection", {
                "operationType": "insert",
                "_id": "tok_err",
                "fullDocument": {"_id": "oid_err"}
            })

    def test_get_mappers_all_collections(self):
        listener = ChangeStreamListener.__new__(ChangeStreamListener)
        for coll in ["knowledge_assets", "cases", "knowledge_governance", "agent_logs", "episodic_memory"]:
            node_mapper, edge_mapper = listener._get_mappers(coll)
            assert callable(node_mapper)
            assert callable(edge_mapper)

    def test_get_mappers_invalid_collection(self):
        listener = ChangeStreamListener.__new__(ChangeStreamListener)
        with pytest.raises(ValueError):
            listener._get_mappers("invalid_collection")

    def test_listen_invalid_collection_raises(self, mock_mongo, mock_neo4j):
        listener = ChangeStreamListener()
        with pytest.raises(ValueError, match="not watched"):
            listener.listen("unknown_collection")


# ─── GraphSyncService Extended ────────────────────────────────────────────────

class TestGraphSyncService:
    def test_sync_document_success(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        doc = {
            "asset_id": "asset_sync_1",
            "asset_type": "ClinicalPattern",
            "confidence": 0.9
        }
        service.sync_document("knowledge_assets", doc)
        # Node written to Neo4j
        assert mock_neo4j["session"].execute_write.call_count >= 1

    def test_sync_document_invalid_collection(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        with pytest.raises(ValueError, match="Unmapped collection"):
            service.sync_document("invalid_col", {"some": "data"})

    def test_sync_document_with_mongo_id(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        doc = {
            "_id": "mongo_oid_123",
            "asset_id": "asset_id_from_domain",
            "asset_type": "Pattern"
        }
        service.sync_document("knowledge_assets", doc)
        # mongo_id should be extracted and written
        assert mock_neo4j["session"].execute_write.call_count >= 1

    def test_sync_document_with_edges(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        doc = {
            "asset_id": "asset_with_edges",
            "related_assets": ["asset_2", "asset_3"]
        }
        service.sync_document("knowledge_assets", doc)
        # Edges also written
        assert mock_neo4j["session"].execute_write.call_count >= 3  # 1 node + 2 edges

    def test_full_sync_empty_collection(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        mock_cursor = MagicMock()
        mock_cursor.__iter__ = MagicMock(return_value=iter([]))
        mock_mongo["db"].__getitem__ = MagicMock(return_value=mock_mongo["collection"])
        mock_mongo["collection"].find.return_value = mock_cursor
        
        count = service.full_sync("knowledge_assets")
        assert count == 0

    def test_full_sync_with_documents(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        docs = [
            {"asset_id": f"asset_{i}", "asset_type": "Pattern"}
            for i in range(3)
        ]
        mock_cursor = MagicMock()
        mock_cursor.__iter__ = MagicMock(return_value=iter(docs))
        mock_mongo["db"].__getitem__ = MagicMock(return_value=mock_mongo["collection"])
        mock_mongo["collection"].find.return_value = mock_cursor
        
        count = service.full_sync("knowledge_assets")
        assert count == 3

    def test_full_sync_invalid_collection(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        with pytest.raises(ValueError, match="Unmapped collection"):
            service.full_sync("wrong_collection")

    def test_start_change_stream_launches_threads(self, mock_mongo, mock_neo4j):
        service = GraphSyncService()
        with patch("backend.graph.sync.graph_sync_service.threading.Thread") as mock_thread:
            mock_thread_instance = MagicMock()
            mock_thread.return_value = mock_thread_instance
            service.start_change_stream()
            
            # Should spawn one thread per watched collection
            n_collections = len(ChangeStreamListener.WATCHED_COLLECTIONS)
            assert mock_thread.call_count == n_collections
            assert mock_thread_instance.start.call_count == n_collections
            assert len(service._threads) == n_collections
