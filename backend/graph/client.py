import os
from neo4j import GraphDatabase, basic_auth
from backend.graph.logger import logger

class Neo4jClient:
    _is_offline = None

    def __init__(self):
        uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = GraphDatabase.driver(
            uri, 
            auth=basic_auth(user, password),
            connection_timeout=1.0,
            max_connection_lifetime=2.0
        )
        if Neo4jClient._is_offline is None:
            try:
                # Quick verify
                self.driver.verify_connectivity()
                Neo4jClient._is_offline = False
            except Exception:
                Neo4jClient._is_offline = True
                logger.warning("Neo4j is offline. Fail-fast mode activated.")

    def close(self):
        self.driver.close()

    def session(self, **kwargs):
        if Neo4jClient._is_offline:
            raise Exception("Neo4j is offline (fail-fast)")
        return self.driver.session(**kwargs)

