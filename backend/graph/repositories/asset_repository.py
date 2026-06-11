import logging
from typing import List, Dict, Any, Optional

from backend.graph.mongo_client import MongoDBClient
from backend.graph.logger import logger


class AssetRepository:
    """Repository for knowledge_assets collection in MongoDB (Source of Truth)."""

    def __init__(self, mongo_client: Optional[MongoDBClient] = None):
        client = mongo_client or MongoDBClient()
        self.collection = client.get_collection("knowledge_assets")

    def upsert_asset(self, document: Dict[str, Any]) -> None:
        """Insert or replace an asset document keyed by asset_id."""
        asset_id = document.get("asset_id")
        if not asset_id:
            raise ValueError("document must contain 'asset_id'")
        result = self.collection.replace_one(
            {"asset_id": asset_id}, document, upsert=True
        )
        logger.info(
            "upsert_asset",
            extra={
                "asset_id": asset_id,
                "matched": result.matched_count,
                "modified": result.modified_count,
            },
        )

    def get_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Return the asset document matching asset_id, or None."""
        asset = self.collection.find_one({"asset_id": asset_id}, {"_id": 0})
        logger.info("get_asset", extra={"asset_id": asset_id, "found": bool(asset)})
        return asset

    def list_assets(
        self, skip: int = 0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Return a paginated list of assets."""
        return list(
            self.collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        )

    def get_asset_lineage(self, asset_id: str) -> List[Dict[str, Any]]:
        """Return related assets forming the lineage chain.

        Actual graph traversal is delegated to GraphService via Neo4j.
        This method returns the ``related_assets`` field from Mongo as a
        lightweight fallback.
        """
        asset = self.collection.find_one({"asset_id": asset_id})
        if not asset:
            return []
        return asset.get("related_assets", [])

    def get_asset_usage(self, asset_id: str) -> List[Dict[str, Any]]:
        """Return governance events referencing the given asset_id."""
        governance_coll = MongoDBClient().get_collection("knowledge_governance")
        cursor = governance_coll.find({"asset_id": asset_id}, {"_id": 0})
        usage = list(cursor)
        logger.info(
            "get_asset_usage",
            extra={"asset_id": asset_id, "usage_count": len(usage)},
        )
        return usage
