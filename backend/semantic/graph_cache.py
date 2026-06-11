import time
from typing import Dict, Any, Tuple, Optional

class GraphCache:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(GraphCache, cls).__new__(cls, *args, **kwargs)
            cls._instance.cache = {}
            cls._instance.ttl = 600  # 10 minutes in seconds
        return cls._instance

    def get(self, entity_type: str, entity_id: str, depth: int) -> Optional[Dict[str, Any]]:
        # Handle case where entity_type or entity_id is None
        if not entity_type or not entity_id:
            return None
        key = (entity_type.lower(), entity_id, depth)
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]
        return None

    def set(self, entity_type: str, entity_id: str, depth: int, data: Dict[str, Any]) -> None:
        if not entity_type or not entity_id:
            return
        key = (entity_type.lower(), entity_id, depth)
        self.cache[key] = (data, time.time())

    def clear(self) -> None:
        self.cache.clear()
