from typing import Dict, Any
from backend.intelligence.executive_cache import ExecutiveKnowledgeCache
from backend.intelligence.root_cause_engine import RootCauseEngine
from backend.intelligence.alert_prioritization_engine import AlertPrioritizationEngine
from backend.intelligence.executive_narrative_engine import ExecutiveNarrativeEngine

class ExecutiveConsoleEngine:
    """
    Orchestrates the data for the Executive Console Dashboard 3.0.
    Consolidates data from the Knowledge Cache, Root Cause Engine, and Prioritization Engine.
    """
    def __init__(self):
        self.cache = ExecutiveKnowledgeCache()
        self.root_engine = RootCauseEngine()
        self.alert_engine = AlertPrioritizationEngine()
        self.narrative_engine = ExecutiveNarrativeEngine()

    def get_overview(self) -> Dict[str, Any]:
        """
        Returns the unified status payload for the Dashboard 3.0.
        """
        knowledge = self.cache.get_knowledge()
        top_alerts = self.alert_engine.get_top_alerts(limit=5)
        root_cause = self.root_engine.get_root_cause()
        
        # Calculate Health Score (0-100)
        # Using a simplistic proxy: 100 - (number of high alerts * 2)
        base_score = 100
        health_score = max(0, base_score - (len(top_alerts) * 4))
        
        # Determine Mission Status
        mission_status = "GREEN"
        if health_score < 50:
            mission_status = "RED"
        elif health_score < 70:
            mission_status = "ORANGE"
        elif health_score < 90:
            mission_status = "YELLOW"
            
        # Get Narrative
        narrative = self.narrative_engine.generate_narrative(health_score=health_score, previous_score=base_score)
        
        # Extract Heatmap data (Grouped by domain)
        # In a full implementation, map variables to domains.
        heatmap = [
            {"domain": "Liver Function", "score": 85, "severity": "MEDIUM", "trend": "STABLE"},
            {"domain": "Inflammation", "score": 92, "severity": "LOW", "trend": "IMPROVING"},
            {"domain": "Renal Function", "score": 78, "severity": "HIGH", "trend": "DETERIORATING"},
            {"domain": "Protein Balance", "score": 88, "severity": "MEDIUM", "trend": "STABLE"}
        ]
        
        # Top Risk Drivers
        centralities = knowledge.get("centralities", {})
        variables = knowledge.get("variables", [])
        
        drivers = []
        total_cent = sum([centralities.get(v.get("id"), {}).get("eigenvector", 0) for v in variables])
        total_cent = total_cent if total_cent > 0 else 1
        
        for v in variables:
            vid = v.get("id")
            cent = centralities.get(vid, {}).get("eigenvector", 0)
            if cent > 0:
                drivers.append({
                    "name": v.get("properties", {}).get("name", vid),
                    "impact": round((cent / total_cent) * 100, 1)
                })
        drivers.sort(key=lambda x: x["impact"], reverse=True)
        
        return {
            "mission_status": mission_status,
            "health_score": health_score,
            "narrative": narrative,
            "root_cause": root_cause,
            "priority_alerts": top_alerts,
            "top_drivers": drivers[:5],
            "heatmap": heatmap,
            "timestamp": knowledge.get("timestamp")
        }
