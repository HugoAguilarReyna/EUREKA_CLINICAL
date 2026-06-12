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
        depth: int = 1,
        aggregation: bool = True
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
            if aggregation:
                allowed_labels = {"Community", "Rule", "Risk", "Pattern", "Recommendation", "Insight"}
            else:
                allowed_labels = {"Patient", "SemanticState", "Rule", "Hypothesis", "Community"}
            
            community_stats = {}
            if aggregation:
                for e in edges:
                    if e["relationship_type"] == "MEMBER_OF":
                        c_id = e["dst_id"]
                        p_id = e["src_id"]
                        if c_id not in community_stats:
                            community_stats[c_id] = {
                                "patient_count": 0,
                                "patients": set(),
                                "risk_distribution": {"low": 0, "medium": 0, "high": 0},
                                "top_rules": set(),
                                "severity_score": 0.0
                            }
                        community_stats[c_id]["patient_count"] += 1
                        community_stats[c_id]["patients"].add(p_id)
                
                for e in edges:
                    if e["relationship_type"] == "HAS_RISK":
                        p_id = e["src_id"]
                        r_id = e["dst_id"]
                        for c_id, stats in community_stats.items():
                            if p_id in stats["patients"]:
                                r_level = "medium"
                                if "high" in r_id.lower() or "critical" in r_id.lower():
                                    r_level = "high"
                                elif "low" in r_id.lower():
                                    r_level = "low"
                                stats["risk_distribution"][r_level] += 1
                                break
                                
            valid_patients = None
            if community_id and not aggregation:
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
                    
                if aggregation and n["label"] == "Community":
                    c_id = n["id"]
                    if c_id in community_stats:
                        stats = community_stats[c_id]
                        total_risk = stats["risk_distribution"]["low"] + stats["risk_distribution"]["medium"]*2 + stats["risk_distribution"]["high"]*3
                        max_risk = max(1, stats["patient_count"] * 3)
                        stats["severity_score"] = round(total_risk / max_risk, 2) if max_risk > 0 else 0
                        
                        import copy
                        n = copy.deepcopy(n)
                        if "properties" not in n:
                            n["properties"] = {}
                        n["properties"]["patient_count"] = stats["patient_count"]
                        n["properties"]["risk_distribution"] = stats["risk_distribution"]
                        n["properties"]["severity_score"] = stats["severity_score"]
                        n["properties"]["top_rules"] = list(stats["top_rules"])
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
            MAX_NODES = 800
            MAX_EDGES = 1500
            
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
            
            # Apply scope limit

            matched_nodes = matched_nodes[:scope_limit]
            matched_node_ids = {n["id"] for n in matched_nodes}
            
            # Deduplicate edges
            seen = set()
            unique_edges = []
            for e in edges:
                if e["src_id"] in matched_node_ids and e["dst_id"] in matched_node_ids:
                    key = (e["src_id"], e["dst_id"], e["relationship_type"])
                    if key not in seen:
                        seen.add(key)
                        unique_edges.append(e)
                        
            matched_edges = unique_edges
                
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
