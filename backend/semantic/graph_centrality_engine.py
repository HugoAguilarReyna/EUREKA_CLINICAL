import networkx as nx
from typing import Dict, Any, List

class GraphCentralityEngine:
    @staticmethod
    def compute_centralities(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
        """
        Builds a networkx graph from the nodes and edges, then calculates PageRank, 
        Degree, Betweenness, and Eigenvector centralities.
        """
        G = nx.Graph()
        
        for n in nodes:
            G.add_node(n["id"])
            
        for e in edges:
            G.add_edge(e["src_id"], e["dst_id"])
            
        # Compute centralities
        try:
            deg = nx.degree_centrality(G)
        except Exception:
            deg = {n: 0.0 for n in G.nodes}
            
        try:
            bet = nx.betweenness_centrality(G)
        except Exception:
            bet = {n: 0.0 for n in G.nodes}
            
        try:
            pr = nx.pagerank(G, alpha=0.85)
        except Exception:
            pr = {n: 0.0 for n in G.nodes}
            
        try:
            eig = nx.eigenvector_centrality(G, max_iter=1000)
        except Exception:
            eig = pr.copy()
            
        centralities = {}
        for node in G.nodes:
            centralities[node] = {
                "degree": float(deg.get(node, 0.0)),
                "betweenness": float(bet.get(node, 0.0)),
                "pagerank": float(pr.get(node, 0.0)),
                "eigenvector": float(eig.get(node, 0.0))
            }
            
        return centralities
