from typing import List, Dict, Any
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class AlertPrioritizationEngine:
    """
    Ranks alerts based on PriorityScore (ROI) = Expected Risk Reduction (Active Support) * Confidence.
    Extracts alerts from Rules using Epic 11.1A Ground Truth Validation.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()

    def get_top_alerts(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Returns the top N prioritized actions/alerts.
        """
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        
        alerts = []
        
        for rule in rules:
            rid = rule.get("id")
            props = rule.get("properties", {})
            expr = props.get("expression", "")
            
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    var_name = var_name.strip()
                    state_id = f"STATE_{var_name}_{state_val.strip()}"
                    
                    # Calculate Active Support
                    active_support = len(set([e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"]))
                    
                    confidence = props.get("confidence", 0.0)
                    
                    # Risk Reduction Expected is proportional to active support (assuming intervention works)
                    roi_score = active_support * confidence
                    
                    # Estimate severity
                    risk_edges = [e for e in edges if e.get("src_id") == rid and e.get("relationship_type") == "INDICATES"]
                    severity = 0.5
                    target_class = "Unknown"
                    if risk_edges:
                        risk_node_id = risk_edges[0].get("dst_id")
                        risk_node = next((n for n in knowledge.get("risks", []) if n.get("id") == risk_node_id), None)
                        if risk_node:
                            risk_level = str(risk_node.get("properties", {}).get("risk_level", "")).upper()
                            target_class = risk_level
                            if risk_level == "HIGH": severity = 1.0
                            elif risk_level == "MEDIUM": severity = 0.7
                            elif risk_level == "LOW": severity = 0.3
                    
                    if roi_score > 0:
                        alerts.append({
                            "id": rid,
                            "title": f"Evaluate {var_name}",
                            "description": f"Targeting {state_val} {var_name} could mitigate {target_class} risk.",
                            "priority_score": round(roi_score, 2),
                            "confidence": round(confidence, 4),
                            "population_affected": active_support,
                            "severity": severity,
                            "source": "RuleEngine",
                            "ground_truth_audit": {
                                "value": round(roi_score, 2),
                                "source_rule": rid,
                                "support": active_support,
                                "confidence": confidence,
                                "community_count": 1,
                                "calculation_version": "v2_math_rework"
                            }
                        })
                        
        alerts.sort(key=lambda x: x["priority_score"], reverse=True)
        
        # Deduplicate
        unique_alerts = []
        seen = set()
        for a in alerts:
            if a["title"] not in seen:
                seen.add(a["title"])
                unique_alerts.append(a)
                if len(unique_alerts) == limit:
                    break
                    
        return unique_alerts
