import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


@pytest.fixture(autouse=True)
def clear_singletons():
    from backend.graph.mongo_client import MongoDBClient
    MongoDBClient._instance = None
    if hasattr(MongoDBClient, "_initialized"):
        delattr(MongoDBClient, "_initialized")
    yield
    MongoDBClient._instance = None


@pytest.fixture
def mock_mongo():
    """Mocks PyMongo MongoClient and returns mock collection and db."""
    with patch("backend.graph.mongo_client.MongoClient") as mock_client_cls:
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_coll = MagicMock()
        
        mock_client_cls.return_value = mock_client
        mock_client.get_default_database.return_value = mock_db
        mock_db.__getitem__.return_value = mock_coll
        
        yield {
            "client": mock_client,
            "db": mock_db,
            "collection": mock_coll
        }


@pytest.fixture
def mock_neo4j():
    """Mocks Neo4j GraphDatabase.driver and session."""
    with patch("backend.graph.client.GraphDatabase.driver") as mock_driver_cls:
        mock_driver = MagicMock()
        mock_driver_cls.return_value = mock_driver
        mock_session = MagicMock()
        mock_driver.session.return_value.__enter__.return_value = mock_session
        
        # Mock transaction execution functions
        def side_effect_write(fn, *args, **kwargs):
            return fn(mock_session, *args, **kwargs)
        
        def side_effect_read(fn, *args, **kwargs):
            return fn(mock_session, *args, **kwargs)

        mock_session.execute_write = MagicMock(side_effect=side_effect_write)
        mock_session.execute_read = MagicMock(side_effect=side_effect_read)
        
        yield {
            "client": mock_driver,
            "session": mock_session
        }


@pytest.fixture
def api_client(mock_mongo, mock_neo4j):
    """Provides a FastAPI test client with mocked clients."""
    with patch("backend.api.main.init_db") as mock_init_db, \
         patch("backend.graph.sync.graph_sync_service.GraphSyncService") as mock_sync_service:
        
        from fastapi.testclient import TestClient
        from backend.api.main import app
        
        with TestClient(app) as client:
            yield client
