from typing import Dict, Any, List
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache
from backend.intelligence.root_cause_engine import RootCauseEngine

class ExecutiveAuditEngine:
    """
    Epic 11.1A.5+ Executive Intelligence Certification V2.
    Provides deep traceability into how executive metrics are derived from raw Mongo data.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()
        self.root_engine = RootCauseEngine()

    def get_health_score_audit(self) -> Dict[str, Any]:
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        
        # Calculate exactly how we get to the Health Score
        penalties = []
        total_cases = len(knowledge.get("cases", []))
        if total_cases == 0: total_cases = 1
        
        active_critical_patients = set()
        
        for rule in rules:
            rid = rule.get("id")
            props = rule.get("properties", {})
            expr = props.get("expression", "")
            
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    state_id = f"STATE_{var_name.strip()}_{state_val.strip()}"
                    
                    patient_ids = {e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"}
                    if patient_ids:
                        support = len(patient_ids)
                        conf = props.get("confidence", 0.0)
                        
                        # Simplistic weight logic for the audit explanation
                        # We penalize based on fraction of patients affected
                        weight = round(support / total_cases, 2)
                        
                        # In the Digital Twin, Health Score is 100 - (critical_patients/total_cases * 100)
                        # So the penalty is exactly how many unique patients this rule adds to the critical pool.
                        # For the audit, we can approximate the penalty point contribution.
                        new_patients = patient_ids - active_critical_patients
                        penalty = int((len(new_patients) / total_cases) * 100)
                        
                        active_critical_patients.update(patient_ids)
                        
                        penalties.append({
                            "rule": rid,
                            "affected_patients": support,
                            "confidence": round(conf, 4),
                            "weight": weight,
                            "penalty": penalty
                        })
                        
        # Sort penalties by magnitude
        penalties.sort(key=lambda x: x["penalty"], reverse=True)
        
        critical_count = len(active_critical_patients)
        health_score = max(0, 100 - int((critical_count / total_cases) * 100))
        
        return {
            "health_score": health_score,
            "baseline": 100,
            "penalties": penalties
        }

    def get_critical_population_audit(self) -> Dict[str, Any]:
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        cases = knowledge.get("cases", [])
        
        trigger_rules = []
        active_critical_patients = set()
        
        for rule in rules:
            rid = rule.get("id")
            expr = rule.get("properties", {}).get("expression", "")
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    state_id = f"STATE_{var_name.strip()}_{state_val.strip()}"
                    
                    patient_ids = {e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"}
                    if patient_ids:
                        trigger_rules.append(rid)
                        active_critical_patients.update(patient_ids)
                        
        return {
            "critical_patients": len(active_critical_patients),
            "total_patients": len(cases),
            "critical_definition": {
                "logic": "OR",
                "minimum_trigger_count": 1,
                "rules": trigger_rules
            },
            "top_trigger_rules": trigger_rules[:5] # Just outputting first 5 for brevity
        }

    def get_rule_consistency_audit(self) -> List[Dict[str, Any]]:
        knowledge = self.cache.get_knowledge()
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        
        audit_list = []
        
        for rule in rules:
            rid = rule.get("id")
            props = rule.get("properties", {})
            expr = props.get("expression", "")
            
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    state_id = f"STATE_{var_name.strip()}_{state_val.strip()}"
                    
                    patient_ids = {e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"}
                    
                    audit_list.append({
                        "rule": rid,
                        "support": props.get("support", 0),
                        "confidence": props.get("confidence", 0.0),
                        "lift": props.get("lift", 1.0),
                        "patient_count": len(patient_ids),
                        "derived_from": [f"HAS_STATE -> {state_id}"]
                    })
        return audit_list

    def get_definitions_audit(self) -> Dict[str, str]:
        return {
            "health_score_formula": "100 - (Critical_Patients / Total_Patients * 100)",
            "impact_score_formula": "ActiveSupport * Confidence * Lift * CommunityCoverage",
            "roi_formula": "Expected_Risk_Reduction_in_Patients * Confidence",
            "critical_population_formula": "Union of all patients connected via HAS_STATE to any semantic state defined in active risk rules (OR logic)",
            "reproducibility_guarantee": "All metrics computable from raw Mongo JSON in < 3 mathematical steps without external models."
        }
