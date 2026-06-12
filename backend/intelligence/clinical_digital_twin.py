from typing import Dict, Any, List
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class ClinicalDigitalTwin:
    """
    In-memory simulation layer.
    Allows testing "What-if" scenarios (e.g. reduce Bilirubin by 20%) without touching the DB.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()

    def simulate(self, modifications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Runs a simulation based on the modifications.
        Example modification: {"variable": "TB", "change_pct": -20}
        
        Returns projected deltas:
        {
           "health_score_delta": 18,
           "critical_risks_delta": -5,
           "high_risk_patients_delta": -92
        }
        """
        knowledge = self.cache.get_knowledge()
        cases = knowledge.get("cases", [])
        rules = knowledge.get("rules", [])
        
        # Calculate baseline
        # Health score approximation: 100 - (number of high severity rules triggered)
        baseline_critical_patients = set()
        
        # For simplicity in this mock-up of the simulation, we'll iterate through patients
        # and mathematically project the change.
        # Let's say baseline critical patients is derived from actual support of high risk rules
        for r in rules:
            # Assume rules with HIGH target class
            if "HIGH" in r.get("properties", {}).get("expression", ""):
                # Approximate number of patients
                baseline_critical_patients.add(r.get("id")) # placeholder
                
        base_critical_count = int(len(cases) * 0.25) if cases else 0 # Mock 25% critical
        base_health_score = max(0, 100 - int(base_critical_count / max(len(cases), 1) * 100))
        
        # Apply modifications (Memory-only math projection)
        proj_critical_count = base_critical_count
        
        for mod in modifications:
            var = mod.get("variable")
            change = mod.get("change_pct", 0)
            
            # If we reduce a negative driver (like TB), risk drops.
            # Very simplified model: A 20% reduction in a key variable reduces critical patients by roughly 15-20%.
            # In a real fuzzy engine, we would recalculate membership values here.
            if change < 0:
                reduction_factor = abs(change) / 100.0
                proj_critical_count = int(proj_critical_count * (1.0 - (reduction_factor * 0.8)))
                
        proj_health_score = max(0, 100 - int(proj_critical_count / max(len(cases), 1) * 100))
        
        return {
            "baseline_health_score": base_health_score,
            "projected_health_score": proj_health_score,
            "health_score_delta": proj_health_score - base_health_score,
            
            "baseline_critical_patients": base_critical_count,
            "projected_critical_patients": proj_critical_count,
            "critical_patients_delta": proj_critical_count - base_critical_count,
            
            "baseline_critical_risks": len(rules),
            "projected_critical_risks": max(0, len(rules) - int(abs(proj_health_score - base_health_score)/5)),
            "critical_risks_delta": max(0, len(rules) - int(abs(proj_health_score - base_health_score)/5)) - len(rules)
        }
