import time
import threading
from typing import Dict, Any, Optional
from pymongo import MongoClient
from backend.db.config import settings

class ExecutiveKnowledgeCache:
    """
    Global Cache for Executive Console with a 60s TTL.
    Prevents overwhelming the database by hitting 10 endpoints for a single dashboard load.
    Pre-loads: rules, insights, communities, actions, patterns, centralities, cases.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ExecutiveKnowledgeCache, cls).__new__(cls)
                cls._instance._init()
            return cls._instance

    def _init(self):
        self.client = MongoClient(settings.mongo_uri)
        self.db = self.client[settings.mongo_db_name]
        self.cache: Dict[str, Any] = {}
        self.last_updated: float = 0
        self.ttl_seconds: int = 60
        self.update_lock = threading.Lock()

    def get_knowledge(self) -> Dict[str, Any]:
        """
        Returns the entire cached knowledge payload.
        Refreshes automatically if TTL is expired.
        """
        current_time = time.time()
        
        # Fast path
        if current_time - self.last_updated < self.ttl_seconds and self.cache:
            return self.cache

        # Slow path (refresh cache)
        with self.update_lock:
            # Double check inside lock
            if current_time - self.last_updated < self.ttl_seconds and self.cache:
                return self.cache
                
            self._refresh_cache()
            return self.cache

    def _refresh_cache(self):
        """
        Fetches all core data needed for the Executive Console.
        """
        # Load core collections
        cases = list(self.db["cases"].find({}, {"_id": 0}))
        graph_nodes = list(self.db["semantic_graph_nodes"].find({}, {"_id": 0}))
        graph_edges = list(self.db["semantic_graph_edges"].find({}, {"_id": 0}))
        
        # Derived views for fast O(1) access
        rules = [n for n in graph_nodes if n.get("label") == "Rule"]
        insights = [n for n in graph_nodes if n.get("label") == "Insight" or n.get("label") == "Evidence"]
        communities = [n for n in graph_nodes if n.get("label") == "Community"]
        actions = [n for n in graph_nodes if n.get("label") == "Action"]
        risks = [n for n in graph_nodes if n.get("label") == "Risk"]
        states = [n for n in graph_nodes if n.get("label") == "SemanticState"]
        variables = [n for n in graph_nodes if n.get("label") == "Variable"]
        
        # Get Centralities from nodes (Graph Centrality Engine added these to properties)
        centralities = {}
        for n in graph_nodes:
            props = n.get("properties", {})
            if "eigenvector_centrality" in props or "pagerank" in props:
                centralities[n["id"]] = {
                    "eigenvector": props.get("eigenvector_centrality", 0),
                    "pagerank": props.get("pagerank", 0),
                    "betweenness": props.get("betweenness_centrality", 0)
                }

        # Save to cache
        self.cache = {
            "cases": cases,
            "nodes": graph_nodes,
            "edges": graph_edges,
            "rules": rules,
            "insights": insights,
            "communities": communities,
            "actions": actions,
            "risks": risks,
            "states": states,
            "variables": variables,
            "centralities": centralities,
            "timestamp": time.time()
        }
        self.last_updated = time.time()

    def force_refresh(self):
        """Force a cache refresh immediately (e.g. after dataset ingest)"""
        with self.update_lock:
            self._refresh_cache()
