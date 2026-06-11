import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif
from scipy.stats import spearmanr
from sklearn.preprocessing import MinMaxScaler
from backend.intelligence.risk_engine import get_neo4j_df
from backend.graph.logger import logger
from typing import Dict, Any, List

class FeatureImportanceEngine:
    def __init__(self):
        pass

    def evaluate_features(self, df: pd.DataFrame = None) -> List[Dict[str, Any]]:
        """
        Calculates Feature Importance using an Ensemble approach (RF, MI, Spearman, Pearson).
        Normalizes the scores and provides a definitive 'ensemble_importance_score'.
        """
        if df is None:
            df = get_neo4j_df()
            
        if df.empty or "Selector" not in df.columns:
            logger.warning("FeatureImportanceEngine: empty DataFrame or missing Selector.")
            return []

        # Create target
        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]
        
        df_clean = df.dropna(subset=features + ["target"])
        if df_clean.empty:
            return []

        X = df_clean[features]
        y = df_clean["target"]

        # 1. Random Forest Importance
        rf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
        rf.fit(X, y)
        rf_importances = rf.feature_importances_

        # 2. Mutual Information
        mi_scores = mutual_info_classif(X, y, random_state=42)

        raw_results = []
        for idx, col in enumerate(features):
            # 3. Pearson (Linear)
            pearson_score = df_clean[col].corr(df_clean["target"])
            if np.isnan(pearson_score):
                pearson_score = 0.0

            # 4. Spearman (Monotonic)
            spearman_score, _ = spearmanr(df_clean[col], df_clean["target"])
            if np.isnan(spearman_score):
                spearman_score = 0.0

            raw_results.append({
                "feature": col,
                "pearson_score": abs(float(pearson_score)),
                "spearman_score": abs(float(spearman_score)),
                "mutual_information_score": float(mi_scores[idx]),
                "random_forest_score": float(rf_importances[idx])
            })

        if not raw_results:
            return []

        # Normalize the scores to 0-1 range to create the ensemble
        scaler = MinMaxScaler()
        metrics = ["pearson_score", "spearman_score", "mutual_information_score", "random_forest_score"]
        
        matrix = np.array([[r[m] for m in metrics] for r in raw_results])
        normalized_matrix = scaler.fit_transform(matrix)
        
        # Calculate ensemble score (Simple average of normalized scores)
        # Weights could be adjusted, e.g., RF and MI given slightly more weight
        ensemble_scores = np.mean(normalized_matrix, axis=1)

        results = []
        for idx, r in enumerate(raw_results):
            r["ensemble_importance_score"] = float(ensemble_scores[idx])
            results.append(r)

        # Sort by ensemble score
        results.sort(key=lambda x: x["ensemble_importance_score"], reverse=True)
        return results
