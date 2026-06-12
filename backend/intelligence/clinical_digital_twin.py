from typing import Dict, Any, List
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class ClinicalDigitalTwin:
    """
    In-memory simulation layer.
    Allows testing "What-if" scenarios (e.g. reduce Bilirubin by 20%) without touching the DB.
    Epic 11.1A Ground Truth Simulation.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()

    def simulate(self, modifications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Runs a simulation based on the modifications.
        Example modification: {"variable": "TB", "change_pct": -20}
        """
        knowledge = self.cache.get_knowledge()
        cases = knowledge.get("cases", [])
        rules = knowledge.get("rules", [])
        edges = knowledge.get("edges", [])
        
        # We need to map patients to their IDs to match edges
        case_map = {c.get("patient_id"): c for c in cases if c.get("patient_id")}
        
        # 1. Baseline calculation
        # Find active rules and their active support
        active_rules = []
        baseline_critical_patients = set()
        
        for rule in rules:
            rid = rule.get("id")
            expr = rule.get("properties", {}).get("expression", "")
            if " IF " in f" {expr} " and " THEN " in expr:
                condition = expr.split(" THEN ")[0].replace("IF ", "").strip()
                if " = " in condition:
                    var_name, state_val = condition.split(" = ")
                    var_name = var_name.strip()
                    state_id = f"STATE_{var_name}_{state_val.strip()}"
                    
                    # Find patients in this state
                    patient_ids = {e.get("src_id") for e in edges if e.get("dst_id") == state_id and e.get("relationship_type") == "HAS_STATE"}
                    
                    # Find threshold by looking at raw_data of these patients
                    threshold = 0
                    vals = []
                    for pid in patient_ids:
                        if pid in case_map:
                            val = case_map[pid].get("raw_data", {}).get(var_name)
                            if val is not None:
                                vals.append(val)
                    if vals:
                        if state_val.upper() == "HIGH":
                            threshold = min(vals)
                        elif state_val.upper() == "LOW":
                            threshold = max(vals)
                            
                    active_rules.append({
                        "id": rid,
                        "var_name": var_name,
                        "state_val": state_val.upper(),
                        "state_id": state_id,
                        "patient_ids": patient_ids,
                        "threshold": threshold
                    })
                    baseline_critical_patients.update(patient_ids)
                    
        base_critical_count = len(baseline_critical_patients)
        base_health_score = max(0, 100 - int((base_critical_count / max(len(cases), 1)) * 100))
        
        # 2. Mutate (Snapshot)
        mutated_cases = {}
        for c in cases:
            pid = c.get("patient_id")
            if pid:
                # Shallow copy of raw_data to mutate
                mutated_cases[pid] = dict(c.get("raw_data", {}))
                
        for mod in modifications:
            var = mod.get("variable")
            change = mod.get("change_pct", 0)
            multiplier = 1.0 + (change / 100.0)
            
            for pid, raw_data in mutated_cases.items():
                if var in raw_data and raw_data[var] is not None:
                    raw_data[var] = raw_data[var] * multiplier
                    
        # 3. Recalculate
        proj_critical_patients = set()
        
        for rule in active_rules:
            var_name = rule["var_name"]
            state_val = rule["state_val"]
            threshold = rule["threshold"]
            
            # Re-evaluate which patients still meet the threshold
            for pid, raw_data in mutated_cases.items():
                val = raw_data.get(var_name)
                if val is not None:
                    if state_val == "HIGH" and val >= threshold:
                        proj_critical_patients.add(pid)
                    elif state_val == "LOW" and val <= threshold:
                        proj_critical_patients.add(pid)
                        
        proj_critical_count = len(proj_critical_patients)
        proj_health_score = max(0, 100 - int((proj_critical_count / max(len(cases), 1)) * 100))
        
        return {
            "baseline_health_score": base_health_score,
            "projected_health_score": proj_health_score,
            "health_score_delta": proj_health_score - base_health_score,
            
            "baseline_critical_patients": base_critical_count,
            "projected_critical_patients": proj_critical_count,
            "critical_patients_delta": proj_critical_count - base_critical_count,
            
            "baseline_critical_risks": len(rules),
            "projected_critical_risks": max(0, len(rules) - int(abs(proj_health_score - base_health_score)/5)),
            "critical_risks_delta": max(0, len(rules) - int(abs(proj_health_score - base_health_score)/5)) - len(rules),
            
            "ground_truth_audit": {
                "snapshot_cases": len(cases),
                "baseline_critical": base_critical_count,
                "projected_critical": proj_critical_count,
                "calculation_version": "v2_math_rework"
            }
        }
