import datetime
from typing import Dict, Any, Optional
from pymongo.errors import PyMongoError
from backend.graph.mongo_client import MongoDBClient
from backend.graph.sync.sync_state_manager import SyncStateManager
from backend.graph.sync.neo4j_writer import Neo4jWriter
from backend.graph.sync import graph_mapper
from backend.graph.logger import logger


class ChangeStreamListener:
    """Listens to MongoDB change streams and applies updates to Neo4j in near real-time."""

    WATCHED_COLLECTIONS = {
        "knowledge_assets": "KnowledgeAsset",
        "cases": "Case",
        "knowledge_governance": "GovernanceEvent",
        "agent_logs": "AgentLog",
        "episodic_memory": "EpisodicMemoryRecord",
    }

    def __init__(
        self,
        mongo_client: Optional[MongoDBClient] = None,
        neo4j_writer: Optional[Neo4jWriter] = None,
        sync_state_manager: Optional[SyncStateManager] = None,
    ):
        self.mongo = mongo_client or MongoDBClient()
        self.writer = neo4j_writer or Neo4jWriter()
        self.sync_state = sync_state_manager or SyncStateManager(self.mongo)
        self.db = self.mongo.db

    def _get_mappers(self, collection_name: str):
        """Return node mapper and edge mapper for the given collection."""
        if collection_name == "knowledge_assets":
            return graph_mapper.map_knowledge_asset, graph_mapper.map_asset_relationships
        elif collection_name == "cases":
            return graph_mapper.map_case, graph_mapper.map_case_asset_relationships
        elif collection_name == "knowledge_governance":
            return graph_mapper.map_governance_event, graph_mapper.map_governance_relationships
        elif collection_name == "agent_logs":
            return graph_mapper.map_agent_log, graph_mapper.map_agent_log_relationships
        elif collection_name == "episodic_memory":
            return graph_mapper.map_episodic_memory, graph_mapper.map_episodic_memory_relationships
        raise ValueError(f"No mappers defined for collection: {collection_name}")

    def process_change_event(self, collection_name: str, change_event: Dict[str, Any]) -> None:
        """Process a single change stream event and sync it to Neo4j."""
        op_type = change_event.get("operationType")
        resume_token = change_event.get("_id")
        
        logger.info(
            "process_change_event_start",
            extra={
                "collection": collection_name,
                "operation": op_type,
            }
        )

        try:
            if op_type in ("insert", "update", "replace"):
                # Get the full document
                doc = change_event.get("fullDocument")
                if not doc:
                    logger.warning("missing_full_document", extra={"event": change_event})
                    return
                
                # Enforce mongo_id mapping
                if "_id" in doc:
                    doc["mongo_id"] = str(doc["_id"])
                    
                # Fetch mappers
                node_mapper, edge_mapper = self._get_mappers(collection_name)
                
                # Map to Node DTO
                node_dto = node_mapper(doc)
                if doc.get("mongo_id"):
                    node_dto.properties["mongo_id"] = doc["mongo_id"]
                    
                # Write Node
                self.writer.write_node(node_dto)
                
                # Map and Write Relationships
                edges = edge_mapper(doc)
                if edges:
                    self.writer.write_edges(edges)
                    
            elif op_type == "delete":
                # Delete events only contain the documentKey (_id)
                doc_key = change_event.get("documentKey", {})
                mongo_id = str(doc_key.get("_id"))
                label = self.WATCHED_COLLECTIONS.get(collection_name)
                
                if mongo_id and label:
                    # Perform dynamic soft delete using the saved mongo_id property
                    query = f"""
                    MATCH (n:{label}) WHERE n.mongo_id = $mongo_id
                    SET n.status = 'DELETED', n.deleted_at = $deleted_at
                    """
                    params = {
                        "mongo_id": mongo_id,
                        "deleted_at": datetime.datetime.utcnow().isoformat()
                    }
                    with self.writer.client.session() as session:
                        session.execute_write(lambda tx: tx.run(query, **params))
                    logger.info("change_stream_soft_delete", extra={"mongo_id": mongo_id, "label": label})

            # Save sync progress resume token
            self.sync_state.save_state(collection_name, resume_token, "SUCCESS")

        except Exception as e:
            logger.error(
                "process_change_event_error",
                extra={
                    "collection": collection_name,
                    "operation": op_type,
                    "error": str(e)
                }
            )
            # Mark state as failed but store the token to prevent getting stuck
            if resume_token:
                self.sync_state.save_state(collection_name, resume_token, "FAILED")
            raise

    def listen(self, collection_name: str, max_events: Optional[int] = None) -> None:
        """Start listening to change stream events on a collection.
        
        Optional max_events parameter is useful for controlled testing.
        """
        if collection_name not in self.WATCHED_COLLECTIONS:
            raise ValueError(f"Collection {collection_name} is not watched.")

        coll = self.db[collection_name]
        state = self.sync_state.load_state(collection_name)
        resume_token = state.get("resume_token") if state else None

        logger.info(
            "change_stream_listener_start",
            extra={
                "collection": collection_name,
                "resume_from_token": bool(resume_token),
            }
        )

        watch_opts = {"full_document": "updateLookup"}
        if resume_token:
            watch_opts["resume_after"] = resume_token

        try:
            with coll.watch(**watch_opts) as stream:
                event_count = 0
                while stream.alive:
                    change_event = stream.try_next()
                    if change_event is not None:
                        self.process_change_event(collection_name, change_event)
                        event_count += 1
                        if max_events is not None and event_count >= max_events:
                            break
        except PyMongoError as e:
            logger.error(
                "change_stream_listener_critical_error",
                extra={"collection": collection_name, "error": str(e)}
            )
            raise
