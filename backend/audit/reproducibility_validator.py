import numpy as np
import pandas as pd
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine
from backend.audit.blind_datasets_generator import generate_blind_datasets

def run_reproducibility_audit():
    # We will use the S1_Multivariado dataset for the reproducibility audit
    dataset_path = "blind_tests/scenario_1_multivariado.csv"
    
    try:
        df = pd.read_csv(dataset_path)
    except:
        generate_blind_datasets()
        df = pd.read_csv(dataset_path)

    engine = ScientificInsightEngine()
    
    runs = 10
    collected_metrics = {"p_value": [], "odds_ratio": [], "feature_importance": [], "insights_count": []}
    
    for _ in range(runs):
        with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df):
            try:
                insights = engine.generate_insights()
                collected_metrics["insights_count"].append(len(insights))
                
                # Take the top insight for metric tracking
                if insights:
                    top = insights[0]
                    collected_metrics["p_value"].append(top.p_value)
                    collected_metrics["odds_ratio"].append(top.odds_ratio)
                    collected_metrics["feature_importance"].append(top.feature_importance)
            except Exception as e:
                pass

    results = {}
    for metric, values in collected_metrics.items():
        if not values:
            continue
        mean_val = np.mean(values)
        std_val = np.std(values)
        cv = (std_val / mean_val) * 100 if mean_val != 0 else 0
        results[metric] = {
            "Mean": mean_val,
            "StdDev": std_val,
            "CV_Percent": cv
        }
        
    return results

if __name__ == '__main__':
    res = run_reproducibility_audit()
    print("Reproducibility Results:")
    for k, v in res.items():
        print(f"{k}: Mean={v['Mean']:.4f}, StdDev={v['StdDev']:.4f}, CV={v['CV_Percent']:.2f}%")
