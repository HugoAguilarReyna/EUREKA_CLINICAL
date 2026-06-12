import sys
import json

class PayloadGovernor:
    MAX_RESPONSE_MB = 2.0
    MAX_NODES = 500
    MAX_EDGES = 2000

    @classmethod
    def govern_payload(cls, nodes: list, edges: list) -> dict:
        truncated = False
        reason = None
        
        # Check node limits
        if len(nodes) > cls.MAX_NODES:
            nodes = nodes[:cls.MAX_NODES]
            truncated = True
            reason = "node_limit"
            
        # Check edge limits (only keep edges between remaining nodes)
        if len(edges) > cls.MAX_EDGES:
            edges = edges[:cls.MAX_EDGES]
            truncated = True
            reason = "edge_limit"
            
        # Quick size check using string serialization
        # (This is an approximation. A full json.dumps might be slower but more accurate)
        rough_json = json.dumps({"nodes": nodes, "edges": edges})
        size_bytes = len(rough_json.encode('utf-8'))
        size_mb = size_bytes / (1024 * 1024)
        
        if size_mb > cls.MAX_RESPONSE_MB:
            # Aggressive truncation if size is still too large
            ratio = cls.MAX_RESPONSE_MB / size_mb
            allowed_nodes = max(10, int(len(nodes) * ratio))
            allowed_edges = max(10, int(len(edges) * ratio))
            
            nodes = nodes[:allowed_nodes]
            edges = edges[:allowed_edges]
            
            # Re-calculate
            rough_json = json.dumps({"nodes": nodes, "edges": edges})
            size_bytes = len(rough_json.encode('utf-8'))
            size_mb = size_bytes / (1024 * 1024)
            truncated = True
            reason = "payload_limit"
            
        # Ensure edges only reference remaining nodes
        remaining_node_ids = {n["id"] for n in nodes}
        edges = [e for e in edges if e["src_id"] in remaining_node_ids and e["dst_id"] in remaining_node_ids]

        return {
            "nodes": nodes,
            "edges": edges,
            "metadata": {
                "truncated": truncated,
                "reason": reason,
                "payload_size_mb": round(size_mb, 2),
                "payload_size_bytes": size_bytes
            }
        }
