from typing import Dict, Any, List, Optional
from collections import deque

class GraphAbstractionEngine:
    @staticmethod
    def get_abstract_view(
        nodes: List[Dict[str, Any]], 
        edges: List[Dict[str, Any]], 
        level: int, 
        community_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        depth: int = 1
    ) -> Dict[str, Any]:
        """
        Slices the rich semantic graph into 3 distinct levels of abstraction:
        - Level 1 (Executive): Community, Pattern, Hypothesis, Rule, Risk, Action
        - Level 2 (Clinical): Patient, SemanticState, Rule, Hypothesis, Community
        - Level 3 (Forensic): Progressive Investigation Graph around a selected node.
        """
        if level == 1:
            allowed_labels = {"Community", "Pattern", "Hypothesis", "Rule", "Risk", "Action"}
            filtered_nodes = [n for n in nodes if n["label"] in allowed_labels]
            node_ids = {n["id"] for n in filtered_nodes}
            filtered_edges = [e for e in edges if e["src_id"] in node_ids and e["dst_id"] in node_ids]
            
        elif level == 2:
            allowed_labels = {"Patient", "SemanticState", "Rule", "Hypothesis", "Community"}
            
            valid_patients = None
            if community_id:
                valid_patients = {
                    e["src_id"] for e in edges 
                    if e["relationship_type"] == "MEMBER_OF" and e["dst_id"] == community_id
                }
            
            filtered_nodes = []
            for n in nodes:
                if n["label"] not in allowed_labels:
                    continue
                if n["label"] == "Patient" and valid_patients is not None and n["id"] not in valid_patients:
                    continue
                filtered_nodes.append(n)
                
            node_ids = {n["id"] for n in filtered_nodes}
            filtered_edges = [e for e in edges if e["src_id"] in node_ids and e["dst_id"] in node_ids]
            
        elif level == 3:
            # Progressive Investigation Mode
            if not entity_id or not entity_type:
                # Return empty nodes and edges when no entity is selected
                return {
                    "nodes": [],
                    "edges": []
                }
                
            etype = entity_type.lower()
            
            allowed_scopes = {
                "patient": {"Patient", "Variable", "SemanticState", "Rule"},
                "community": {"Community", "Pattern", "Rule", "Risk", "Patient"},
                "pattern": {"Pattern", "Hypothesis", "Rule", "Evidence", "Community"},
                "rule": {"Rule", "Evidence", "Risk", "Action"},
                "risk": {"Risk", "Rule", "Action", "Community"},
                "hypothesis": {"Hypothesis", "Pattern", "Rule", "Evidence"}
            }
            
            scope_limits = {
                "patient": 50,
                "community": 100,
                "pattern": 80,
                "rule": 50,
                "risk": 50,
                "hypothesis": 50
            }
            
            allowed_labels = allowed_scopes.get(etype, {"Patient", "Community", "Pattern", "Rule", "Risk", "Action", "Variable", "SemanticState", "Hypothesis", "Evidence"})
            scope_limit = scope_limits.get(etype, 150)
            
            # Build graph adjacency list
            adj = {}
            for e in edges:
                src = e["src_id"]
                dst = e["dst_id"]
                if src not in adj:
                    adj[src] = []
                if dst not in adj:
                    adj[dst] = []
                adj[src].append((dst, e))
                adj[dst].append((src, e))
                
            # Verify starting node exists
            start_node = next((n for n in nodes if n["id"] == entity_id), None)
            if not start_node:
                return {
                    "nodes": [],
                    "edges": []
                }
                
            # BFS Traversal Engine
            # queue element: (node_id, current_depth)
            queue = deque([(entity_id, 0)])
            discovered_depths = {entity_id: 0}
            
            MAX_DEPTH = 3
            MAX_NODES = 150
            MAX_EDGES = 300
            
            while queue:
                curr_id, curr_depth = queue.popleft()
                if curr_depth >= min(depth, MAX_DEPTH):
                    continue
                    
                neighbors = adj.get(curr_id, [])
                for neighbor_id, edge in neighbors:
                    if neighbor_id in discovered_depths:
                        continue
                        
                    neighbor_node = next((n for n in nodes if n["id"] == neighbor_id), None)
                    if not neighbor_node:
                        continue
                        
                    if neighbor_node["label"] in allowed_labels:
                        discovered_depths[neighbor_id] = curr_depth + 1
                        queue.append((neighbor_id, curr_depth + 1))
                        
            # Get actual nodes
            matched_nodes = [n for n in nodes if n["id"] in discovered_depths]
            matched_node_ids = {n["id"] for n in matched_nodes}
            matched_edges = [e for e in edges if e["src_id"] in matched_node_ids and e["dst_id"] in matched_node_ids]
            
            # Global Hard Limits check
            if len(matched_nodes) > MAX_NODES or len(matched_edges) > MAX_EDGES:
                return {
                    "nodes": [],
                    "edges": [],
                    "warning": True,
                    "message": "Graph exceeds rendering threshold."
                }
                
            # Apply scope limit
            matched_nodes = matched_nodes[:scope_limit]
            matched_node_ids = {n["id"] for n in matched_nodes}
            matched_edges = [e for e in edges if e["src_id"] in matched_node_ids and e["dst_id"] in matched_node_ids]
                
            # Enforce expansion budget properties on returned nodes
            import copy
            final_nodes = []
            for n in matched_nodes:
                # Deep copy to avoid modifying original persisted graph data in builder
                n_copy = copy.deepcopy(n)
                if "properties" not in n_copy or n_copy["properties"] is None:
                    n_copy["properties"] = {}
                node_depth = discovered_depths.get(n_copy["id"], 0)
                remaining = MAX_DEPTH - node_depth
                n_copy["properties"]["remaining_depth"] = max(0, remaining)
                n_copy["properties"]["expandable"] = remaining > 0
                final_nodes.append(n_copy)
                
            return {
                "nodes": final_nodes,
                "edges": matched_edges
            }
            
        else:
            filtered_nodes = nodes
            filtered_edges = edges
            
        return {
            "nodes": filtered_nodes,
            "edges": filtered_edges
        }
