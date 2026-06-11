import pytest
import time
from backend.graph.analytics.cache import GraphAnalyticsCache

def test_cache_set_and_get():
    cache = GraphAnalyticsCache(ttl_seconds=10)
    cache.clear()
    
    cache.set("test_metric", {"data": 123})
    result = cache.get("test_metric")
    assert result == {"data": 123}
    
def test_cache_expiration():
    cache = GraphAnalyticsCache()
    cache.ttl_seconds = 0 # Force immediate expiration
    cache.clear()

    
    cache.set("expire_metric", {"data": 123})
    time.sleep(0.01)
    
    result = cache.get("expire_metric")
    assert result is None
    
def test_cache_invalidate():
    cache = GraphAnalyticsCache(ttl_seconds=10)
    cache.clear()
    
    cache.set("inv_metric", "val")
    cache.invalidate("inv_metric")
    assert cache.get("inv_metric") is None

def test_cache_clear():
    cache = GraphAnalyticsCache(ttl_seconds=10)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    assert cache.get("a") is None
    assert cache.get("b") is None
