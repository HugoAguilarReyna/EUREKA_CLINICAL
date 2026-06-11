import pandas as pd
import numpy as np
from scipy.spatial.distance import jensenshannon

class DriftDetectionEngine:
    def __init__(self, psi_threshold=0.20, jsd_threshold=0.10):
        self.psi_threshold = psi_threshold
        self.jsd_threshold = jsd_threshold

    def calculate_psi(self, expected, actual, buckets=10):
        def scale_range(input_data, min_val, max_val):
            input_data += -(np.min(input_data))
            input_data /= np.max(input_data) / (max_val - min_val)
            input_data += min_val
            return input_data

        breakpoints = np.arange(0, buckets + 1) / buckets * 100
        expected_perc = np.percentile(expected, breakpoints)
        
        expected_counts = np.histogram(expected, expected_perc)[0]
        actual_counts = np.histogram(actual, expected_perc)[0]

        expected_freq = np.maximum(expected_counts / len(expected), 0.0001)
        actual_freq = np.maximum(actual_counts / len(actual), 0.0001)

        psi_value = np.sum((actual_freq - expected_freq) * np.log(actual_freq / expected_freq))
        return psi_value

    def calculate_jsd(self, expected, actual, bins=10):
        min_val = min(np.min(expected), np.min(actual))
        max_val = max(np.max(expected), np.max(actual))
        
        p, _ = np.histogram(expected, bins=bins, range=(min_val, max_val), density=True)
        q, _ = np.histogram(actual, bins=bins, range=(min_val, max_val), density=True)
        
        # Add epsilon to avoid log(0)
        p = p + 1e-10
        q = q + 1e-10
        p = p / p.sum()
        q = q / q.sum()
        
        return jensenshannon(p, q)

    def detect_drift(self, df_reference: pd.DataFrame, df_current: pd.DataFrame) -> dict:
        results = {}
        for col in df_reference.select_dtypes(include=np.number).columns:
            if col not in df_current.columns or col == "patient_id" or col == "Selector":
                continue
                
            ref = df_reference[col].dropna()
            cur = df_current[col].dropna()
            
            if len(ref) < 10 or len(cur) < 10:
                continue
                
            psi = self.calculate_psi(ref.values, cur.values)
            jsd = self.calculate_jsd(ref.values, cur.values)
            
            mean_shift = np.mean(cur) - np.mean(ref)
            var_shift = np.var(cur) - np.var(ref)
            
            is_drift = psi > self.psi_threshold or jsd > self.jsd_threshold
            
            results[col] = {
                "psi": psi,
                "jsd": jsd,
                "mean_shift": mean_shift,
                "var_shift": var_shift,
                "drift_detected": is_drift
            }
            
        return results
