from typing import Dict, Any
from backend.intelligence.root_cause_engine import RootCauseEngine
from backend.intelligence.alert_prioritization_engine import AlertPrioritizationEngine
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache

class ExecutiveNarrativeEngine:
    """
    Generates an executive natural-language narrative describing the mission status.
    Epic 11.1A Mission Narrative Engine.
    """
    def __init__(self):
        self.root_engine = RootCauseEngine()
        self.alert_engine = AlertPrioritizationEngine()
        self.cache = ExecutiveKnowledgeCache()

    def generate_narrative(self, health_score: int, previous_score: int = 100) -> str:
        """
        Generates the executive summary.
        """
        knowledge = self.cache.get_knowledge()
        total_cases = len(knowledge.get("cases", []))
        if total_cases == 0:
            total_cases = 1
            
        root_cause = self.root_engine.get_root_cause()
        driver = root_cause.get("driver", "Unknown Factors")
        patients = root_cause.get("affected_patients", 0)
        conf = root_cause.get("confidence", 0.0)
        pct_affected = round((patients / total_cases) * 100, 1)
        
        # Determine trend
        delta = health_score - previous_score
        status = "STABLE"
        if delta < -5:
            status = "DETERIORATING"
        elif delta > 5:
            status = "IMPROVING"
            
        top_drivers = self.root_engine.get_top_drivers()
        driver_bullets = "\n".join([f"• {d['name']} (Impact: {d['impact']}%)" for d in top_drivers[:3]])
        
        top_alerts = self.alert_engine.get_top_alerts(limit=1)
        reduction_str = "0%"
        if top_alerts:
            reduction_score = top_alerts[0].get("ground_truth_audit", {}).get("value", 0)
            reduction_pct = round((reduction_score / total_cases) * 100, 1)
            reduction_str = f"{reduction_pct}%"
            
        narrative = (
            f"MISSION STATUS\n\n"
            f"{status}\n\n"
            f"{pct_affected}% of the population exhibits clinical disease indicators.\n\n"
            f"Primary drivers:\n"
            f"{driver_bullets}\n\n"
            f"Confidence: {int(conf * 100)}%\n\n"
            f"Projected risk reduction (Top Action): {reduction_str}"
        )
        return narrative

