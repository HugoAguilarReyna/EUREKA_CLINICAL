import sys

class GraphMetricsService:
    @staticmethod
    def get_graph_metrics(nodes: list, edges: list, aggregation_enabled: bool, truncated: bool, payload_size_bytes: int = 0) -> dict:
        node_count = len(nodes)
        edge_count = len(edges)
        
        community_count = sum(1 for n in nodes if n.get("label") == "Community")
        
        # Calculate density: edges / (nodes * (nodes - 1)) if directed
        density = 0.0
        if node_count > 1:
            density = edge_count / (node_count * (node_count - 1))
            
        # Estimate size if not provided
        if payload_size_bytes == 0:
            # rough estimation
            payload_size_bytes = sys.getsizeof(str(nodes)) + sys.getsizeof(str(edges))
            
        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "community_count": community_count,
            "density": round(density, 4),
            "payload_size_bytes": payload_size_bytes,
            "payload_size_mb": round(payload_size_bytes / (1024 * 1024), 2),
            "aggregation_enabled": aggregation_enabled,
            "truncated": truncated
        }
