from typing import Dict, Any, List, Optional

from backend.graph.mongo_client import MongoDBClient
from backend.graph.logger import logger


class GovernanceRepository:
    """Repository for the knowledge_governance collection in MongoDB (Source of Truth).

    Governance events track actions taken on knowledge assets:
    approvals, rejections, reviews, promotions, deprecations, etc.
    """

    def __init__(self, mongo_client: Optional[MongoDBClient] = None):
        client = mongo_client or MongoDBClient()
        self.collection = client.get_collection("knowledge_governance")

    def upsert_governance_event(self, document: Dict[str, Any]) -> None:
        """Insert or replace a governance event keyed by governance_id."""
        governance_id = document.get("governance_id")
        if not governance_id:
            raise ValueError("document must contain 'governance_id'")
        result = self.collection.replace_one(
            {"governance_id": governance_id}, document, upsert=True
        )
        logger.info(
            "upsert_governance_event",
            extra={
                "governance_id": governance_id,
                "matched": result.matched_count,
                "modified": result.modified_count,
            },
        )

    def get_governance_event(
        self, governance_id: str
    ) -> Optional[Dict[str, Any]]:
        """Return a single governance event by governance_id."""
        event = self.collection.find_one(
            {"governance_id": governance_id}, {"_id": 0}
        )
        logger.info(
            "get_governance_event",
            extra={"governance_id": governance_id, "found": bool(event)},
        )
        return event

    def get_governance_trail(
        self, asset_id: str
    ) -> List[Dict[str, Any]]:
        """Return the full governance trail for a given asset_id, ordered by timestamp."""
        cursor = self.collection.find(
            {"asset_id": asset_id}, {"_id": 0}
        ).sort("timestamp", 1)
        trail = list(cursor)
        logger.info(
            "get_governance_trail",
            extra={"asset_id": asset_id, "trail_count": len(trail)},
        )
        return trail

    def list_governance_events(
        self, skip: int = 0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Return a paginated list of governance events."""
        return list(
            self.collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        )
