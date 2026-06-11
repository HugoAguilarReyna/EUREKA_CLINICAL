import pandas as pd
import numpy as np
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

def run_data_quality_validation():
    engine = ScientificInsightEngine()
    # Load original
    try:
        df_base = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
        # Ensure correct column naming and formatting if needed
    except:
        # Fallback if missing
        df_base = pd.DataFrame({"Age": [50]*100, "TB": [1.0]*100, "Selector": [1]*50+[2]*50})
        
    results = {}
    
    # Baseline
    with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df_base.copy()):
        base_insights = engine.generate_insights()
        base_count = len(base_insights)
        
    # Degraded - Missing
    for pct in [0.1, 0.2, 0.4]:
        df_deg = df_base.copy()
        for col in df_deg.select_dtypes(include=np.number).columns:
            if col not in ["Selector", "patient_id"]:
                mask = np.random.rand(len(df_deg)) < pct
                df_deg.loc[mask, col] = np.nan
        
        with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df_deg):
            ins = engine.generate_insights()
            retention = len(ins) / base_count if base_count > 0 else 0
            results[f"Missing_{int(pct*100)}%"] = retention

    # Degraded - Noise
    for pct in [0.05, 0.1, 0.2]:
        df_deg = df_base.copy()
        for col in df_deg.select_dtypes(include=np.number).columns:
            if col not in ["Selector", "patient_id"]:
                std = df_deg[col].std()
                noise = np.random.normal(0, std*pct, len(df_deg))
                df_deg[col] += noise
                
        with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df_deg):
            ins = engine.generate_insights()
            retention = len(ins) / base_count if base_count > 0 else 0
            results[f"Noise_{int(pct*100)}%"] = retention
            
    return results

if __name__ == "__main__":
    print(run_data_quality_validation())
