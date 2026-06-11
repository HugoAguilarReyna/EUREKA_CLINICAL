import time
from typing import Dict, Any, Optional
from pydantic import BaseModel

class GraphAnalyticsCacheModel(BaseModel):
    metric_type: str
    graph_version: str
    computed_at: float
    results: Any

class GraphAnalyticsCache:
    """
    In-memory cache for expensive graph analytics computations.
    """
    _instance = None

    def __new__(cls, ttl_seconds: int = 3600):
        if cls._instance is None:
            cls._instance = super(GraphAnalyticsCache, cls).__new__(cls)
            cls._instance.cache = {}
            cls._instance.ttl_seconds = ttl_seconds
        return cls._instance

    def set(self, metric_type: str, results: Any, graph_version: str = "latest"):
        """Store results in cache."""
        self.cache[metric_type] = {
            "metric_type": metric_type,
            "graph_version": graph_version,
            "computed_at": time.time(),
            "results": results
        }

    def get(self, metric_type: str) -> Optional[Any]:
        """Retrieve results from cache if not expired."""
        if metric_type in self.cache:
            entry = self.cache[metric_type]
            if time.time() - entry["computed_at"] < self.ttl_seconds:
                return entry["results"]
            else:
                # Expired
                del self.cache[metric_type]
        return None

    def invalidate(self, metric_type: str):
        """Invalidate a specific metric cache."""
        if metric_type in self.cache:
            del self.cache[metric_type]

    def clear(self):
        """Clear all cache."""
        self.cache.clear()
