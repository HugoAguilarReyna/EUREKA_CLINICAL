from typing import List, Dict, Any, Optional
from backend.graph.client import Neo4jClient
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO, GraphPathDTO
from backend.graph.logger import logger


from backend.graph.analytics.cache import GraphAnalyticsCache
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder
from backend.graph.analytics.centrality_engine import CentralityEngine
from backend.graph.analytics.influence_engine import InfluenceEngine
from backend.graph.analytics.explainability_engine import ExplainabilityEngine
from backend.graph.analytics.traceability_engine import TraceabilityEngine
from backend.graph.models.intelligence_dtos import KnowledgeAssetScoreDTO, InfluenceDTO, ExplainabilityDTO, TraceabilityDTO, GraphAnalyticsSummaryDTO

class GraphService:
    """Facade for performing Read queries on the Neo4j Knowledge Graph."""

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.client = neo4j_client or Neo4jClient()
        self.cache = GraphAnalyticsCache()
        self.snapshot_builder = GraphSnapshotBuilder(self.client)
        self.centrality_engine = CentralityEngine(self.snapshot_builder, self.client)
        self.influence_engine = InfluenceEngine(self.snapshot_builder)
        self.explainability_engine = ExplainabilityEngine(self.snapshot_builder)
        self.traceability_engine = TraceabilityEngine(self.snapshot_builder)

    def query_lineage(self, asset_id: str) -> GraphPathDTO:
        """Retrieve the lineage path for a given KnowledgeAsset."""
        query = """
        MATCH path = (a:KnowledgeAsset {id: $asset_id})-[:RELATED_TO*0..3]-(b:KnowledgeAsset)
        WHERE (a.status IS NULL OR a.status <> 'DELETED') 
          AND (b.status IS NULL OR b.status <> 'DELETED')
        RETURN path
        """
        logger.info("query_lineage", extra={"asset_id": asset_id})
        return self._extract_path(query, {"asset_id": asset_id})

    def query_usage(self, asset_id: str) -> List[GraphNodeDTO]:
        """Find Case nodes that referenced or used the given asset_id."""
        query = """
        MATCH (c:Case)-[:USES_ASSET]->(a:KnowledgeAsset {id: $asset_id})
        WHERE (c.status IS NULL OR c.status <> 'DELETED') 
          AND (a.status IS NULL OR a.status <> 'DELETED')
        RETURN c
        """
        logger.info("query_usage", extra={"asset_id": asset_id})
        nodes = []
        with self.client.session() as session:
            result = session.run(query, asset_id=asset_id)
            for record in result:
                node = record["c"]
                nodes.append(self._map_neo4j_node_to_dto(node))
        return nodes

    def query_governance(self, asset_id: str) -> List[Dict[str, Any]]:
        """Retrieve the governance events and history of a given asset_id."""
        query = """
        MATCH (g:GovernanceEvent)-[:GOVERNS]->(a:KnowledgeAsset {id: $asset_id})
        WHERE (g.status IS NULL OR g.status <> 'DELETED') 
          AND (a.status IS NULL OR a.status <> 'DELETED')
        RETURN g ORDER BY g.timestamp ASC
        """
        logger.info("query_governance", extra={"asset_id": asset_id})
        events = []
        with self.client.session() as session:
            result = session.run(query, asset_id=asset_id)
            for record in result:
                node = record["g"]
                events.append(dict(node))
        return events

    def query_discovery(self, case_id: str) -> GraphPathDTO:
        """Find how a Case is linked to KnowledgeAssets and their related assets/patterns."""
        query = """
        MATCH path = (c:Case {id: $case_id})-[:USES_ASSET]->(a:KnowledgeAsset)-[:RELATED_TO*0..2]-(b:KnowledgeAsset)
        WHERE (c.status IS NULL OR c.status <> 'DELETED')
          AND (a.status IS NULL OR a.status <> 'DELETED')
          AND (b.status IS NULL OR b.status <> 'DELETED')
        RETURN path
        """
        logger.info("query_discovery", extra={"case_id": case_id})
        return self._extract_path(query, {"case_id": case_id})

    def query_explainability(self, case_id: str) -> GraphPathDTO:
        """Retrieve the complete explanation path for a Case (case, logs, memory, assets)."""
        query = """
        MATCH path = (c:Case {id: $case_id})-[r:USES_ASSET|HAS_LOG|HAS_MEMORY*1..2]-(n)
        WHERE (c.status IS NULL OR c.status <> 'DELETED')
          AND (n.status IS NULL OR n.status <> 'DELETED')
        RETURN path
        """
        logger.info("query_explainability", extra={"case_id": case_id})
        return self._extract_path(query, {"case_id": case_id})

    def _extract_path(self, query: str, params: Dict[str, Any]) -> GraphPathDTO:
        """Executes a Cypher query returning paths and extracts a GraphPathDTO."""
        nodes_dict = {}
        edges_set = set()
        edges_list = []

        with self.client.session() as session:
            result = session.run(query, **params)
            for record in result:
                path = record["path"]
                # Process nodes in path
                for node in path.nodes:
                    node_dto = self._map_neo4j_node_to_dto(node)
                    nodes_dict[node_dto.id] = node_dto
                # Process relationships in path
                for rel in path.relationships:
                    # Create a unique key for deduplication
                    edge_key = (rel.start_node.element_id, rel.end_node.element_id, rel.type)
                    if edge_key not in edges_set:
                        edges_set.add(edge_key)
                        
                        # Get start and end node custom ids
                        src_id = rel.start_node.get("id")
                        dst_id = rel.end_node.get("id")
                        
                        edge_dto = GraphEdgeDTO(
                            src_id=src_id,
                            dst_id=dst_id,
                            relationship_type=rel.type,
                            properties=dict(rel),
                            confidence=rel.get("confidence"),
                            weight=rel.get("weight")
                        )
                        edges_list.append(edge_dto)

        return GraphPathDTO(nodes=list(nodes_dict.values()), edges=edges_list)

    def _map_neo4j_node_to_dto(self, node) -> GraphNodeDTO:
        """Convert a Neo4j node object into a GraphNodeDTO."""
        props = dict(node)
        node_id = props.pop("id", node.element_id)
        label = list(node.labels)[0] if node.labels else "Unknown"
        
        # Sanitize datetime properties for JSON serialization
        import datetime
        clean_props = {}
        for k, v in props.items():
            if hasattr(v, "isoformat"):
                clean_props[k] = v.isoformat()
            elif isinstance(v, datetime.datetime):
                clean_props[k] = v.isoformat()
            else:
                clean_props[k] = v
                
        return GraphNodeDTO(
            id=node_id,
            label=label,
            node_type=clean_props.pop("node_type", None),
            confidence=clean_props.pop("confidence", None),
            created_at=clean_props.pop("created_at", None),
            updated_at=clean_props.pop("updated_at", None),
            properties=clean_props,
            metadata=clean_props.get("metadata", {})
        )

    # --- SPRINT 3B.2: Knowledge Intelligence Layer ---
    
    def query_centrality(self) -> List[KnowledgeAssetScoreDTO]:
        cached = self.cache.get("centrality")
        if cached:
            return cached
        results = self.centrality_engine.compute_metrics()
        self.cache.set("centrality", results)
        return results

    def query_influence(self, asset_id: str) -> InfluenceDTO:
        cache_key = f"influence_{asset_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        result = self.influence_engine.calculate_asset_influence(asset_id)
        self.cache.set(cache_key, result)
        return result
        
    def query_explain(self, case_id: str) -> ExplainabilityDTO:
        # Advanced explainability via NetworkX shortest path
        return self.explainability_engine.explain_case(case_id)

    def query_traceability(self, asset_id: str) -> TraceabilityDTO:
        return self.traceability_engine.trace_asset(asset_id)
