import datetime
from typing import Dict, Any, Optional
from backend.graph.mongo_client import MongoDBClient
from backend.graph.logger import logger


class SyncStateManager:
    """Manages the synchronization state for change streams and full-syncs in MongoDB."""

    COLLECTION_NAME = "graph_sync_state"

    def __init__(self, mongo_client: Optional[MongoDBClient] = None):
        client = mongo_client or MongoDBClient()
        self.collection = client.get_collection(self.COLLECTION_NAME)

    def load_state(self, collection_name: str) -> Optional[Dict[str, Any]]:
        """Retrieve the sync state for the given collection."""
        state = self.collection.find_one({"collection_name": collection_name})
        if state:
            state.pop("_id", None)  # Remove ObjectId for serialization ease
        logger.info("load_state", extra={"collection": collection_name, "found": bool(state)})
        return state

    def save_state(self, collection_name: str, resume_token: Any, status: str) -> None:
        """Upsert the sync state for a collection, updating timestamp, status, and incrementing version."""
        current_state = self.load_state(collection_name) or {}
        current_version = current_state.get("sync_version", 0)
        
        doc = {
            "collection_name": collection_name,
            "resume_token": resume_token,
            "processed_at": datetime.datetime.utcnow(),
            "status": status,
            "sync_version": current_version + 1
        }
        
        self.collection.replace_one(
            {"collection_name": collection_name},
            doc,
            upsert=True
        )
        logger.info(
            "save_state", 
            extra={
                "collection": collection_name,
                "sync_version": doc["sync_version"],
                "status": status
            }
        )

    def get_sync_version(self, collection_name: str) -> int:
        """Helper to get the current sync version directly."""
        state = self.load_state(collection_name)
        return state.get("sync_version", 0) if state else 0
