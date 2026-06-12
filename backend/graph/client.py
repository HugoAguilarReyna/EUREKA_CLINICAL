import os
from neo4j import GraphDatabase, basic_auth
from backend.graph.logger import logger

class Neo4jClient:
    def __init__(self):
        uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        # Configurable timeout — increased to allow cloud connections
        connection_timeout = float(os.getenv("NEO4J_CONNECTION_TIMEOUT", "15.0"))
        self.driver = GraphDatabase.driver(
            uri,
            auth=basic_auth(user, password),
            connection_timeout=connection_timeout,
            max_connection_lifetime=200.0
        )
        try:
            self.driver.verify_connectivity()
        except Exception as e:
            logger.error(f"Neo4j connection error: {e}")

    def close(self):
        self.driver.close()

    def session(self, **kwargs):
        return self.driver.session(**kwargs)

