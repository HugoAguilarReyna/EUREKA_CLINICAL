import pandas as pd
import numpy as np
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

def run_deployment_simulation():
    engine = ScientificInsightEngine()
    try:
        df_base = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
    except:
        df_base = pd.DataFrame({"Age": [50]*100, "TB": [1.0]*100, "Selector": [1]*50+[2]*50})
        
    with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df_base.copy()):
        base_insights = engine.generate_insights()
        base_count = len(base_insights)
        
    horizons = [30, 90, 180]
    results = {}
    
    for days in horizons:
        df_sim = df_base.copy()
        
        # Drift: shift mean
        drift_factor = 1.0 + (0.005 * days)
        # Missing:
        missing_pct = min(0.001 * days, 0.4)
        # Noise:
        noise_pct = 0.0005 * days
        
        for col in df_sim.select_dtypes(include=np.number).columns:
            if col not in ["Selector", "patient_id"]:
                df_sim[col] = df_sim[col] * drift_factor
                std = df_sim[col].std()
                noise = np.random.normal(0, std*noise_pct, len(df_sim))
                df_sim[col] += noise
                
                mask = np.random.rand(len(df_sim)) < missing_pct
                df_sim.loc[mask, col] = np.nan
                
        with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df_sim):
            sim_insights = engine.generate_insights()
            retention = len(sim_insights) / base_count if base_count > 0 else 0
            
            results[f"Day_{days}"] = {
                "performance_stability": retention,
                "insights_count": len(sim_insights)
            }
            
    return results

if __name__ == "__main__":
    print(run_deployment_simulation())
