import datetime
from typing import List, Dict, Any, Optional
from backend.graph.client import Neo4jClient
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO
from backend.graph.logger import logger


class Neo4jWriter:
    """Handles transactional writes and updates (MERGE and soft-deletes) to Neo4j."""

    VALID_LABELS = {
        "KnowledgeAsset",
        "Case",
        "GovernanceEvent",
        "AgentLog",
        "EpisodicMemoryRecord",
    }

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.client = neo4j_client or Neo4jClient()
        self.create_constraints()

    def create_constraints(self) -> None:
        """Create uniqueness constraints on node IDs for performance and safety."""
        queries = [
            f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE"
            for label in self.VALID_LABELS
        ]
        with self.client.session() as session:
            for query in queries:
                try:
                    session.run(query)
                except Exception as e:
                    logger.warning("constraint_creation_failed", extra={"query": query, "error": str(e)})

    def write_node(self, node: GraphNodeDTO) -> None:
        """Write or update a single node in Neo4j using MERGE."""
        self.write_nodes([node])

    def write_nodes(self, nodes: List[GraphNodeDTO]) -> int:
        """Batch write multiple nodes within a single transaction."""
        if not nodes:
            return 0

        written = 0
        with self.client.session() as session:
            for node in nodes:
                if node.label not in self.VALID_LABELS:
                    logger.error("invalid_node_label", extra={"label": node.label, "node_id": node.id})
                    continue
                
                # Combine node-level standard properties with extra properties
                props = dict(node.properties)
                if node.node_type:
                    props["node_type"] = node.node_type
                if node.confidence is not None:
                    props["confidence"] = node.confidence

                query = f"""
                MERGE (n:{node.label} {{id: $id}})
                ON CREATE SET n += $props, n.id = $id, n.created_at = $created_at, n.updated_at = $updated_at
                ON MATCH SET n += $props, n.id = $id, n.updated_at = $updated_at
                """
                
                params = {
                    "id": node.id,
                    "props": props,
                    "created_at": node.created_at or datetime.datetime.utcnow().isoformat(),
                    "updated_at": node.updated_at or datetime.datetime.utcnow().isoformat(),
                }
                
                session.execute_write(lambda tx: tx.run(query, **params))
                written += 1
        
        logger.info("write_nodes_complete", extra={"count": written})
        return written

    def write_edge(self, edge: GraphEdgeDTO) -> None:
        """Write or update a single relationship in Neo4j using MERGE."""
        self.write_edges([edge])

    def write_edges(self, edges: List[GraphEdgeDTO]) -> int:
        """Batch write multiple relationships within a single transaction."""
        if not edges:
            return 0

        written = 0
        with self.client.session() as session:
            for edge in edges:
                # Find nodes first to ensure they exist before merging relation
                query = f"""
                MATCH (src {{id: $src_id}})
                MATCH (dst {{id: $dst_id}})
                MERGE (src)-[r:{edge.type}]->(dst)
                ON CREATE SET r = $props
                ON MATCH SET r += $props
                """
                
                props = dict(edge.properties)
                if edge.weight is not None:
                    props["weight"] = edge.weight
                if edge.confidence is not None:
                    props["confidence"] = edge.confidence

                params = {
                    "src_id": edge.src_id,
                    "dst_id": edge.dst_id,
                    "props": props,
                }
                
                session.execute_write(lambda tx: tx.run(query, **params))
                written += 1
                
        logger.info("write_edges_complete", extra={"count": written})
        return written

    def soft_delete_node(self, node_id: str, label: str) -> None:
        """Soft deletes a node by setting status='DELETED' instead of physical removal."""
        if label not in self.VALID_LABELS:
            logger.error("invalid_node_label_delete", extra={"label": label, "node_id": node_id})
            return

        query = f"""
        MATCH (n:{label} {{id: $id}})
        SET n.status = 'DELETED', n.deleted_at = $deleted_at
        """
        params = {
            "id": node_id,
            "deleted_at": datetime.datetime.utcnow().isoformat(),
        }
        with self.client.session() as session:
            session.execute_write(lambda tx: tx.run(query, **params))
            
        logger.info("soft_delete_node_complete", extra={"node_id": node_id, "label": label})
