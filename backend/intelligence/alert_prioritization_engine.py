from typing import List, Dict, Any
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class AlertPrioritizationEngine:
    """
    Ranks alerts based on PriorityScore = Impact * Confidence * Population * Severity.
    Extracts alerts from Rules, Risks, and Insights cached in the ExecutiveKnowledgeCache.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()

    def get_top_alerts(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Returns the top N prioritized alerts.
        """
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        insights = knowledge.get("insights", [])
        cases = knowledge.get("cases", [])
        total_population = len(cases) if cases else 1
        
        alerts = []
        
        # We can extract alerts from Rules (e.g. High risk rules)
        for r in rules:
            props = r.get("properties", {})
            confidence = props.get("confidence", 0.0)
            support = props.get("support", 0.0) # Population fraction
            
            # Estimate severity based on target class (e.g., RISK_HIGH = 1.0, RISK_MEDIUM = 0.5)
            # Find the risk node this rule points to
            rule_id = r.get("id")
            risk_edges = [e for e in knowledge.get("edges", []) if e.get("src_id") == rule_id and e.get("relationship_type") == "INDICATES"]
            
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
            
            # Centrality as a proxy for impact
            centrality = knowledge.get("centralities", {}).get(rule_id, {}).get("eigenvector", 0.1)
            impact = centrality * 10  # Scale up
            
            # Calculate score
            # PriorityScore = Impact x Confidence x Population x Severity
            priority_score = impact * confidence * support * severity
            
            # Extract clinical variable drivers from the rule expression
            expr = props.get("expression", "")
            
            if priority_score > 0:
                alerts.append({
                    "id": rule_id,
                    "title": f"High Risk Clinical Pattern Detected",
                    "description": f"Condition: {expr} indicates {target_class} risk.",
                    "priority_score": round(priority_score, 4),
                    "impact": round(impact, 4),
                    "confidence": round(confidence, 4),
                    "population_affected": int(support * total_population),
                    "severity": severity,
                    "source": "RuleEngine"
                })
                
        # Also process Insights that might be flagged as critical
        for i in insights:
            props = i.get("properties", {})
            if "odds_ratio" in props:
                # Evidence node
                strength = str(props.get("strength", "MEDIUM")).upper()
                sev = 1.0 if strength == "STRONG" else (0.7 if strength == "MEDIUM" else 0.3)
                conf = props.get("confidence", 0.8)
                supp = props.get("support", 0.1)
                
                # proxy impact
                impact = 0.5
                priority_score = impact * conf * supp * sev
                
                alerts.append({
                    "id": i.get("id"),
                    "title": i.get("properties", {}).get("name", "Insight"),
                    "description": f"Statistical evidence with Odds Ratio {props.get('odds_ratio')}",
                    "priority_score": round(priority_score, 4),
                    "impact": round(impact, 4),
                    "confidence": round(conf, 4),
                    "population_affected": int(supp * total_population),
                    "severity": sev,
                    "source": "InsightEngine"
                })

        # Sort by priority score descending
        alerts.sort(key=lambda x: x["priority_score"], reverse=True)
        
        # Deduplicate by title/description heuristically
        unique_alerts = []
        seen = set()
        for a in alerts:
            if a["description"] not in seen:
                seen.add(a["description"])
                unique_alerts.append(a)
                if len(unique_alerts) >= limit:
                    break
                    
        return unique_alerts
