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
        Uses Epic 11.1A Math Rework:
        ImpactScore = ActiveSupport * Confidence * Lift * CommunityCoverage
        """
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        cases = knowledge.get("cases", [])
        
        if not rules:
            return {
                "driver": "Unknown",
                "impact": 0,
                "confidence": 0.0,
                "affected_patients": 0,
                "ground_truth_audit": None
            }
            
        variable_impacts = {}
        variable_audits = {}
        total_impact = 0.0
        
        for rule in rules:
            rid = rule.get("id")
            props = rule.get("properties", {})
            expr = props.get("expression", "")
            # Example expr: "IF Total Bilirubin = HIGH THEN Liver Disease Risk = HIGH"
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    var_name = var_name.strip()
                    state_val = state_val.strip()
                    
                    state_id = f"STATE_{var_name}_{state_val}"
                    
                    # 1. Active Support: How many patients currently have this state?
                    active_support = len(set([e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"]))
                    
                    # 2. Confidence and Lift
                    conf = props.get("confidence", 0.5)
                    lift = props.get("lift", 1.0)
                    
                    # 3. Community Coverage: How many communities are characterized by this state?
                    communities = len(set([e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "CHARACTERIZED_BY"]))
                    if communities == 0: communities = 1 # At least 1 if active
                    
                    # 4. Impact Score Calculation
                    impact_score = active_support * conf * lift * communities
                    
                    if var_name not in variable_impacts:
                        variable_impacts[var_name] = 0.0
                        variable_audits[var_name] = {
                            "value": 0.0,
                            "source_rule": rid,
                            "support": active_support,
                            "confidence": conf,
                            "lift": lift,
                            "community_count": communities,
                            "calculation_version": "v2_math_rework"
                        }
                        
                    variable_impacts[var_name] += impact_score
                    total_impact += impact_score
                    
                    # Keep track of the max support rule for audit
                    if impact_score > variable_audits[var_name]["value"]:
                        variable_audits[var_name]["value"] = impact_score
                        variable_audits[var_name]["source_rule"] = rid
                        variable_audits[var_name]["support"] = active_support
                        variable_audits[var_name]["confidence"] = conf
                        variable_audits[var_name]["lift"] = lift
                        variable_audits[var_name]["community_count"] = communities

        if not variable_impacts or total_impact == 0:
            return {
                "driver": "Unknown",
                "impact": 0,
                "confidence": 0.0,
                "affected_patients": 0,
                "ground_truth_audit": None
            }
            
        # Find the top driver
        top_driver = max(variable_impacts, key=variable_impacts.get)
        top_impact = variable_impacts[top_driver]
        
        audit = variable_audits[top_driver]
        impact_pct = int((top_impact / total_impact) * 100) if total_impact > 0 else 0
        
        return {
            "driver": top_driver,
            "impact": impact_pct,
            "confidence": round(audit["confidence"], 2),
            "affected_patients": audit["support"],
            "ground_truth_audit": audit
        }

    def get_top_drivers(self) -> list:
        # Reusing the same math to return top 5 drivers
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        
        variable_impacts = {}
        variable_audits = {}
        total_impact = 0.0
        
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
                    
                    active_support = len(set([e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"]))
                    conf = props.get("confidence", 0.5)
                    lift = props.get("lift", 1.0)
                    communities = len(set([e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "CHARACTERIZED_BY"]))
                    if communities == 0: communities = 1
                    
                    impact_score = active_support * conf * lift * communities
                    
                    if var_name not in variable_impacts:
                        variable_impacts[var_name] = 0.0
                    variable_impacts[var_name] += impact_score
                    total_impact += impact_score

        drivers = []
        for var_name, impact in variable_impacts.items():
            impact_pct = int((impact / total_impact) * 100) if total_impact > 0 else 0
            drivers.append({
                "name": var_name,
                "impact": impact_pct
            })
            
        # Sort by impact descending
        drivers = sorted(drivers, key=lambda x: x["impact"], reverse=True)
        return drivers[:5]
