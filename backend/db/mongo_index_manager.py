"""
EPIC 10.0B.2 — MongoDB Index Manager
Ensures correct indexing on collections.
"""

from pymongo import MongoClient
import logging
from backend.db.config import settings

logger = logging.getLogger(__name__)

def ensure_mongo_indexes():
    """
    Creates indexes on MongoDB to support semantic graph and background jobs queries.
    """
    try:
        client = MongoClient(settings.mongo_uri)
        db = client[settings.mongo_db_name]

        # Semantic Graph Nodes
        db["semantic_graph_nodes"].create_index("id", unique=True)
        db["semantic_graph_nodes"].create_index("label")
        
        # Semantic Graph Edges
        db["semantic_graph_edges"].create_index("src_id")
        db["semantic_graph_edges"].create_index("dst_id")
        db["semantic_graph_edges"].create_index("relationship_type")
        
        # Background Jobs
        db["background_jobs"].create_index("job_id", unique=True)
        db["background_jobs"].create_index("status")
        db["background_jobs"].create_index("created_at")

        logger.info("MongoDB indexes verified and created successfully.")
    except Exception as e:
        logger.error(f"Failed to ensure MongoDB indexes: {e}")

if __name__ == "__main__":
    ensure_mongo_indexes()
