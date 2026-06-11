from typing import Dict, Any, List, Optional

from backend.graph.mongo_client import MongoDBClient
from backend.graph.logger import logger


class CaseRepository:
    """Repository for the cases collection in MongoDB (Source of Truth)."""

    def __init__(self, mongo_client: Optional[MongoDBClient] = None):
        client = mongo_client or MongoDBClient()
        self.collection = client.get_collection("cases")

    def upsert_case(self, document: Dict[str, Any]) -> None:
        """Insert or replace a case document keyed by case_id."""
        case_id = document.get("case_id")
        if not case_id:
            raise ValueError("document must contain 'case_id'")
        result = self.collection.replace_one(
            {"case_id": case_id}, document, upsert=True
        )
        logger.info(
            "upsert_case",
            extra={
                "case_id": case_id,
                "matched": result.matched_count,
                "modified": result.modified_count,
            },
        )

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Return the case document matching case_id, or None."""
        case = self.collection.find_one({"case_id": case_id}, {"_id": 0})
        logger.info("get_case", extra={"case_id": case_id, "found": bool(case)})
        return case

    def list_cases(
        self, skip: int = 0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Return a paginated list of cases."""
        return list(
            self.collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        )

    def get_case_assets(self, case_id: str) -> List[Dict[str, Any]]:
        """Return asset documents referenced by a case via knowledge_assets_used."""
        case = self.collection.find_one({"case_id": case_id})
        if not case:
            return []
        asset_ids = case.get("knowledge_assets_used", [])
        if not asset_ids:
            return []
        asset_coll = MongoDBClient().get_collection("knowledge_assets")
        return list(asset_coll.find({"asset_id": {"$in": asset_ids}}, {"_id": 0}))
