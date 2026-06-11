import threading
from typing import Dict, Any, Optional
from backend.graph.mongo_client import MongoDBClient
from backend.graph.sync.sync_state_manager import SyncStateManager
from backend.graph.sync.neo4j_writer import Neo4jWriter
from backend.graph.sync.change_stream_listener import ChangeStreamListener
from backend.graph.logger import logger


class GraphSyncService:
    """Orchestrator that ties together MongoDB to Neo4j mapping, batch writing, and stream listening."""

    def __init__(
        self,
        mongo_client: Optional[MongoDBClient] = None,
        neo4j_writer: Optional[Neo4jWriter] = None,
        sync_state_manager: Optional[SyncStateManager] = None,
    ):
        self.mongo = mongo_client or MongoDBClient()
        self.writer = neo4j_writer or Neo4jWriter()
        self.sync_state = sync_state_manager or SyncStateManager(self.mongo)
        self.listener = ChangeStreamListener(self.mongo, self.writer, self.sync_state)
        self._threads = []

    def sync_document(self, collection_name: str, doc: Dict[str, Any]) -> None:
        """Sync a single document immediately by mapping it and writing to Neo4j."""
        if collection_name not in ChangeStreamListener.WATCHED_COLLECTIONS:
            raise ValueError(f"Unmapped collection: {collection_name}")
            
        if "_id" in doc:
            doc["mongo_id"] = str(doc["_id"])
            
        node_mapper, edge_mapper = self.listener._get_mappers(collection_name)
        
        node_dto = node_mapper(doc)
        if doc.get("mongo_id"):
            node_dto.properties["mongo_id"] = doc["mongo_id"]
            
        self.writer.write_node(node_dto)
        
        edges = edge_mapper(doc)
        if edges:
            self.writer.write_edges(edges)
            
        logger.info(
            "sync_document_success",
            extra={"collection": collection_name, "node_id": node_dto.id}
        )

    def full_sync(self, collection_name: str) -> int:
        """Read all documents from a MongoDB collection, map them, and write them to Neo4j."""
        if collection_name not in ChangeStreamListener.WATCHED_COLLECTIONS:
            raise ValueError(f"Unmapped collection: {collection_name}")

        coll = self.mongo.db[collection_name]
        logger.info("full_sync_start", extra={"collection": collection_name})
        
        count = 0
        cursor = coll.find({})
        for doc in cursor:
            self.sync_document(collection_name, doc)
            count += 1
            
        logger.info(
            "full_sync_complete",
            extra={"collection": collection_name, "synced_count": count}
        )
        return count

    def start_change_stream(self) -> None:
        """Start background threads to listen to change streams for all watched collections."""
        for coll_name in ChangeStreamListener.WATCHED_COLLECTIONS:
            thread = threading.Thread(
                target=self._run_listener_loop,
                args=(coll_name,),
                name=f"ChangeStreamListener-{coll_name}",
                daemon=True
            )
            thread.start()
            self._threads.append(thread)
            logger.info("change_stream_thread_launched", extra={"collection": coll_name})

    def _run_listener_loop(self, collection_name: str) -> None:
        """Indefinitely listen for change stream events."""
        while True:
            try:
                self.listener.listen(collection_name)
            except Exception as e:
                logger.error(
                    "change_stream_loop_failure",
                    extra={"collection": collection_name, "error": str(e)}
                )
                # Brief sleep to avoid rapid spin-lock on persistent failures
                import time
                time.sleep(5)
