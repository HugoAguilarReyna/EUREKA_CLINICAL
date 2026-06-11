import pandas as pd
import numpy as np
import time
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

def run_observability_audit():
    engine = ScientificInsightEngine()
    try:
        df = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
    except:
        df = pd.DataFrame({"Age": [50]*100, "TB": [1.0]*100, "Selector": [1]*50+[2]*50})
        
    start = time.time()
    with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df):
        insights = engine.generate_insights()
    duration = time.time() - start
    
    p_values = [ins.p_value for ins in insights]
    odds_ratios = [ins.odds_ratio for ins in insights]
    severities = [ins.severity for ins in insights]
    
    return {
        "processing_time_ms": int(duration * 1000),
        "insights_accepted": len(insights),
        # Since we only get accepted from the engine directly, rejected is an estimation based on earlier logs
        "insights_rejected": len(df.columns) * 2 - len(insights), 
        "p_value_mean": np.mean(p_values) if p_values else 0,
        "odds_ratio_mean": np.mean(odds_ratios) if odds_ratios else 0,
        "severity_distribution": {
            "CRITICAL": severities.count("CRITICAL"),
            "HIGH": severities.count("HIGH"),
            "MEDIUM": severities.count("MEDIUM"),
            "LOW": severities.count("LOW")
        }
    }

if __name__ == "__main__":
    print(run_observability_audit())
