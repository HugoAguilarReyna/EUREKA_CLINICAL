from typing import Dict, Any
from backend.intelligence.root_cause_engine import RootCauseEngine
from backend.intelligence.alert_prioritization_engine import AlertPrioritizationEngine

class ExecutiveNarrativeEngine:
    """
    Generates an executive natural-language narrative describing the mission status.
    E.g. "Health deteriorated by 12 points. Primary driver: Elevated Bilirrubina..."
    """
    def __init__(self):
        self.root_engine = RootCauseEngine()
        self.alert_engine = AlertPrioritizationEngine()

    def generate_narrative(self, health_score: int, previous_score: int = 100) -> str:
        """
        Generates the executive summary.
        """
        root_cause = self.root_engine.get_root_cause()
        driver = root_cause.get("driver", "Unknown Factors")
        patients = root_cause.get("affected_patients", 0)
        
        # Determine trend
        delta = health_score - previous_score
        if delta < -5:
            trend_str = f"Health deteriorated by {abs(delta)} points."
        elif delta > 5:
            trend_str = f"Health improved by {delta} points."
        else:
            trend_str = "Health remains relatively stable."
            
        # Get recommended action from top alert
        top_alerts = self.alert_engine.get_top_alerts(limit=1)
        action_str = "Continue routine monitoring."
        if top_alerts:
            action_str = f"Investigate {top_alerts[0]['description']}"
            
        narrative = (
            f"{trend_str}\n\n"
            f"Primary driver:\nElevated {driver} and related anomalies.\n\n"
            f"{patients} patients are currently affected.\n\n"
            f"Recommended action:\n{action_str}"
        )
        return narrative
