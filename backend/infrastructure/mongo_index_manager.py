import logging
from typing import Dict, Any, List
from pymongo.database import Database
from pymongo import ASCENDING

logger = logging.getLogger(__name__)

class MongoIndexManager:
    """
    Manages MongoDB indexes for the knowledge system.
    Ensures idempotency and background creation.
    """

    def __init__(self, db: Database):
        self.db = db
        self.collections = [
            "cases",
            "dataset_history",
            "semantic_graph_nodes",
            "semantic_graph_edges",
            "background_jobs"
        ]

    def create_all_indexes(self) -> Dict[str, Any]:
        """
        Create all required indexes for the application.
        Also known as create_indexes() in the epic plan.
        """
        results = {}
        try:
            # 1. cases
            res = self.db.cases.create_index([("patient_id", ASCENDING)], background=True)
            results["cases"] = res

            # 2. dataset_history
            res = self.db.dataset_history.create_index([("created_at", ASCENDING)], background=True)
            results["dataset_history"] = res

            # 3. semantic_graph_nodes
            res1 = self.db.semantic_graph_nodes.create_index([("id", ASCENDING)], background=True, unique=True)
            res2 = self.db.semantic_graph_nodes.create_index([("label", ASCENDING)], background=True)
            res3 = self.db.semantic_graph_nodes.create_index([("type", ASCENDING)], background=True)
            results["semantic_graph_nodes"] = [res1, res2, res3]

            # 4. semantic_graph_edges
            res1 = self.db.semantic_graph_edges.create_index([("source", ASCENDING)], background=True)
            res2 = self.db.semantic_graph_edges.create_index([("target", ASCENDING)], background=True)
            res3 = self.db.semantic_graph_edges.create_index([("relationship", ASCENDING)], background=True)
            results["semantic_graph_edges"] = [res1, res2, res3]

            # 5. background_jobs
            res = self.db.background_jobs.create_index([("status", ASCENDING)], background=True)
            results["background_jobs"] = res

            logger.info("MongoDB indexes created successfully.")
            return {"status": "success", "indexes_created": results}
        
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            return {"status": "error", "message": str(e)}

    def get_index_stats(self) -> Dict[str, Any]:
        """
        Returns index information and document count per collection.
        Also known as get_index_summary() in the epic plan.
        """
        stats = {}
        try:
            for coll_name in self.collections:
                coll = self.db[coll_name]
                count = coll.count_documents({})
                
                try:
                    indexes = list(coll.index_information().keys())
                except Exception:
                    indexes = []
                
                stats[coll_name] = {
                    "count": count,
                    "indexes": indexes
                }
            return stats
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return {"error": str(e)}
