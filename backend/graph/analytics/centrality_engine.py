import networkx as nx
from typing import Dict, Any, List, Optional
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder
from backend.graph.models.intelligence_dtos import KnowledgeAssetScoreDTO
from backend.graph.logger import logger
from backend.graph.client import Neo4jClient

class CentralityEngine:
    def __init__(self, snapshot_builder: Optional[GraphSnapshotBuilder] = None, neo4j_client: Optional[Neo4jClient] = None):
        self.snapshot_builder = snapshot_builder or GraphSnapshotBuilder()
        self.neo4j_client = neo4j_client or Neo4jClient()

    def compute_metrics(self) -> List[KnowledgeAssetScoreDTO]:
        G = self.snapshot_builder.build_full_graph()
        
        if len(G) == 0:
            logger.warning("compute_metrics: Graph is empty.")
            return []

        # Convert to undirected for some metrics if needed, but PageRank works well on directed.
        pagerank = self.compute_pagerank(G)
        degree = self.compute_degree(G)
        
        # Skip expensive $O(VE)$ metrics for large graphs to prevent hanging
        if len(G) > 1000:
            betweenness = {n: 0.0 for n in G.nodes()}
            eigenvector = {n: 0.0 for n in G.nodes()}
        else:
            betweenness = self.compute_betweenness(G)
            eigenvector = self.compute_eigenvector(G)

        scores = []
        for node in G.nodes():
            pr = pagerank.get(node, 0.0)
            bt = betweenness.get(node, 0.0)
            ev = eigenvector.get(node, 0.0)
            deg = degree.get(node, 0.0)
            
            # Global score calculation as per constraints
            raw_global = (0.40 * pr) + (0.25 * bt) + (0.20 * ev) + (0.15 * deg)
            
            scores.append({
                "asset_id": node,
                "pagerank": pr,
                "betweenness": bt,
                "eigenvector": ev,
                "degree": deg,
                "raw_global": raw_global
            })

        # Normalize 0-100
        if scores:
            max_score = max([s["raw_global"] for s in scores])
            min_score = min([s["raw_global"] for s in scores])
            score_range = max_score - min_score
            
            results = []
            for s in scores:
                if score_range > 0:
                    normalized = ((s["raw_global"] - min_score) / score_range) * 100.0
                else:
                    normalized = 100.0 if max_score > 0 else 0.0
                    
                dto = KnowledgeAssetScoreDTO(
                    asset_id=s["asset_id"],
                    pagerank=s["pagerank"],
                    betweenness=s["betweenness"],
                    eigenvector=s["eigenvector"],
                    degree=s["degree"],
                    global_score=normalized
                )
                results.append(dto)
                
            if len(G) <= 1000:
                self._persist_scores(results)
            return results
            
        return []

    def compute_pagerank(self, G: nx.DiGraph) -> Dict[str, float]:
        try:
            return nx.pagerank(G, alpha=0.85)
        except Exception as e:
            logger.error(f"PageRank computation failed: {e}")
            return {n: 0.0 for n in G.nodes()}

    def compute_betweenness(self, G: nx.DiGraph) -> Dict[str, float]:
        try:
            return nx.betweenness_centrality(G)
        except Exception as e:
            logger.error(f"Betweenness computation failed: {e}")
            return {n: 0.0 for n in G.nodes()}

    def compute_eigenvector(self, G: nx.DiGraph) -> Dict[str, float]:
        try:
            return nx.eigenvector_centrality(G, max_iter=1000)
        except Exception as e:
            logger.warning(f"Eigenvector computation failed (may not converge): {e}. Returning degree as fallback.")
            return self.compute_degree(G)

    def compute_degree(self, G: nx.DiGraph) -> Dict[str, float]:
        try:
            # For directed graph, in_degree + out_degree can be used, or just out_degree
            # nx.degree_centrality calculates based on in + out
            return nx.degree_centrality(G)
        except Exception as e:
            logger.error(f"Degree computation failed: {e}")
            return {n: 0.0 for n in G.nodes()}

    def _persist_scores(self, scores: List[KnowledgeAssetScoreDTO]):
        """Persist computed scores back to Neo4j nodes."""
        query = """
        UNWIND $scores AS score
        MATCH (n:KnowledgeAsset {id: score.asset_id})
        SET n.pagerank = score.pagerank,
            n.betweenness = score.betweenness,
            n.eigenvector = score.eigenvector,
            n.degree = score.degree,
            n.global_score = score.global_score,
            n.centrality_updated_at = datetime()
        """
        score_dicts = [s.model_dump() for s in scores]
        try:
            with self.neo4j_client.session() as session:
                session.run(query, scores=score_dicts)
            logger.info("Persisted centrality scores to Neo4j.", extra={"count": len(score_dicts)})
        except Exception as e:
            logger.error(f"Failed to persist centrality scores: {e}")
