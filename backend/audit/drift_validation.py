import pandas as pd
import numpy as np
from backend.intelligence.drift_detection_engine import DriftDetectionEngine

def run_drift_validation():
    engine = DriftDetectionEngine()
    try:
        df_ref = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
    except:
        df_ref = pd.DataFrame({"Age": np.random.normal(50, 10, 500), "TB": np.random.normal(1.0, 0.5, 500)})
        
    results = {"Detection Rate": 0, "False Alarm Rate": 0}
    
    # 5 No-Drift Scenarios
    false_alarms = 0
    for i in range(5):
        df_curr = df_ref.copy()
        # Minor natural variation
        for col in df_curr.select_dtypes(include=np.number).columns:
            df_curr[col] += np.random.normal(0, df_curr[col].std() * 0.01, len(df_curr))
        
        drifts = engine.detect_drift(df_ref, df_curr)
        if any(d["drift_detected"] for d in drifts.values()):
            false_alarms += 1
            
    # 10 Drift Scenarios
    detections = 0
    for i in range(10):
        df_curr = df_ref.copy()
        # Inject significant drift into 2 random features
        cols = np.random.choice(df_curr.select_dtypes(include=np.number).columns, 2, replace=False)
        for col in cols:
            df_curr[col] += np.random.normal(df_curr[col].std() * 1.5, df_curr[col].std() * 0.5, len(df_curr))
            
        drifts = engine.detect_drift(df_ref, df_curr)
        if any(d["drift_detected"] for k, d in drifts.items() if k in cols):
            detections += 1
            
    results["Detection Rate"] = detections / 10
    results["False Alarm Rate"] = false_alarms / 5
    return results

if __name__ == "__main__":
    print(run_drift_validation())
