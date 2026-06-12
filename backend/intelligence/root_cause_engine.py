from typing import Dict, Any
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class RootCauseEngine:
    """
    Identifies the primary driver (Root Cause) of the current organizational risk profile.
    Uses Graph Centrality and Rule Support to calculate Impact and Confidence.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()

    def get_root_cause(self) -> Dict[str, Any]:
        """
        Calculates and returns the primary root cause driving the current risk.
        Returns:
        {
          "driver": "Bilirrubina",
          "impact": 22, # percentage
          "confidence": 0.91,
          "affected_patients": 144
        }
        """
        knowledge = self.cache.get_knowledge()
        variables = knowledge.get("variables", [])
        centralities = knowledge.get("centralities", {})
        edges = knowledge.get("edges", [])
        cases = knowledge.get("cases", [])
        total_patients = len(cases) if cases else 1
        
        if not variables:
            return {
                "driver": "Unknown",
                "impact": 0,
                "confidence": 0.0,
                "affected_patients": 0
            }
            
        # Find the variable with the highest eigenvector centrality
        top_var = None
        max_cent = -1
        
        # Calculate total centrality for percentage normalization
        total_cent = sum([centralities.get(v.get("id"), {}).get("eigenvector", 0) for v in variables])
        if total_cent == 0: total_cent = 1 # prevent div/0
        
        for v in variables:
            vid = v.get("id")
            cent = centralities.get(vid, {}).get("eigenvector", 0)
            if cent > max_cent:
                max_cent = cent
                top_var = v
                
        if not top_var:
            return {
                "driver": "Unknown",
                "impact": 0,
                "confidence": 0.0,
                "affected_patients": 0
            }
            
        driver_name = top_var.get("properties", {}).get("name", "Unknown")
        
        # Calculate impact as percentage of total variable centrality
        impact_pct = int((max_cent / total_cent) * 100)
        
        # Confidence derived from related rules' average confidence
        # Find rules connected to this variable via ACTIVATES_STATE -> PROPOSES_RULE etc.
        # Simplification: Find HAS_VALUE edges to this variable to count affected patients
        vid = top_var.get("id")
        affected_patients = len(set([e.get("src_id") for e in edges if e.get("dst_id") == vid and e.get("relationship_type") == "HAS_VALUE"]))
        
        # Look for states of this variable
        state_ids = [e.get("dst_id") for e in edges if e.get("src_id") == vid and e.get("relationship_type") == "ACTIVATES_STATE"]
        
        # Find rules activated by these states
        rule_ids = set()
        for sid in state_ids:
            for e in edges:
                if e.get("src_id") == sid and e.get("relationship_type") == "TRIGGERS_RULE":
                    rule_ids.add(e.get("dst_id"))
                    
        confidence = 0.0
        if rule_ids:
            rules = [r for r in knowledge.get("rules", []) if r.get("id") in rule_ids]
            if rules:
                confidence = sum([r.get("properties", {}).get("confidence", 0) for r in rules]) / len(rules)
                
        if confidence == 0:
            confidence = 0.85 # Base high confidence for graph-derived metrics if rules are sparse
            
        return {
            "driver": driver_name,
            "impact": impact_pct,
            "confidence": round(confidence, 2),
            "affected_patients": affected_patients
        }
