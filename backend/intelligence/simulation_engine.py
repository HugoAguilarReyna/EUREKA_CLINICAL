import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.intelligence.risk_engine import get_neo4j_df
from backend.graph.logger import logger
from sklearn.ensemble import RandomForestClassifier

class SimulationEngine:
    """
    Simulation Engine for What-If scenario analysis.
    Computes global correlation and statistical changes under different subset filters and interventions.
    """

    def run_outlier_simulation(self, iqr_multiplier: float = 1.5) -> Dict[str, Any]:
        """
        Simulates what happens to feature correlations when outliers are removed.
        Outliers are detected based on the Interquartile Range (IQR) method.
        """
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            return {"error": "Dataset is empty or missing Selector target column"}

        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]

        # 1. Compute baseline correlations (with target boolean)
        baseline_corrs = {}
        for col in features:
            val_col = df[[col, "target"]].dropna()
            if len(val_col) > 10:
                corr_val = val_col[col].corr(val_col["target"])
                baseline_corrs[col] = float(corr_val) if not np.isnan(corr_val) else 0.0

        # 2. Filter outliers using IQR multiplier
        df_clean = df.copy()
        for col in features:
            col_data = df_clean[col].dropna()
            if len(col_data) < 10:
                continue
            q25 = col_data.quantile(0.25)
            q75 = col_data.quantile(0.75)
            iqr = q75 - q25
            lower_bound = q25 - (iqr_multiplier * iqr)
            upper_bound = q75 + (iqr_multiplier * iqr)
            df_clean = df_clean[(df_clean[col] >= lower_bound) & (df_clean[col] <= upper_bound)]

        # 3. Compute simulated correlations after dropping outliers
        simulated_corrs = {}
        for col in features:
            val_col = df_clean[[col, "target"]].dropna()
            if len(val_col) > 10:
                corr_val = val_col[col].corr(val_col["target"])
                simulated_corrs[col] = float(corr_val) if not np.isnan(corr_val) else 0.0

        semantic_names = {
            "TB": "Total Bilirubin",
            "DB": "Direct Bilirubin",
            "Alkphos": "Alkaline Phosphatase",
            "Sgpt": "ALT (Alanine Aminotransferase)",
            "Sgot": "AST (Aspartate Aminotransferase)",
            "ALB": "Albumin",
            "TP": "Total Proteins",
            "A/G Ratio": "Albumin/Globulin Ratio"
        }

        # Build comparison details
        comparison = []
        for col in features:
            base = baseline_corrs.get(col, 0.0)
            sim = simulated_corrs.get(col, 0.0)
            diff = sim - base
            comparison.append({
                "variable": col,
                "display_name": semantic_names.get(col, col),
                "baseline_correlation": round(base, 4),
                "simulated_correlation": round(sim, 4),
                "correlation_shift": round(diff, 4)
            })

        comparison.sort(key=lambda x: abs(x["correlation_shift"]), reverse=True)

        baseline_prev = df["target"].mean()
        sim_prev = df_clean["target"].mean()
        removed = len(df) - len(df_clean)

        return {
            "scenario_name": "Scenario 1: IQR Outlier Trim",
            "expected_change": f"Eliminación de outliers clínicos usando un umbral IQR de {iqr_multiplier}x.",
            "expected_risk": f"La prevalencia de enfermedad hepática cambia de {baseline_prev*100:.1f}% a {sim_prev*100:.1f}%.",
            "expected_impact": f"Se descartaron {removed} pacientes con valores extremos atípicos.",
            "baseline_sample_size": len(df),
            "simulated_sample_size": len(df_clean),
            "outliers_removed": int(removed),
            "iqr_multiplier_used": iqr_multiplier,
            "correlation_comparison": comparison
        }

    def run_scenario(self, scenario_id: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Runs specific what-if scenarios and returns expected change, expected risk, and expected impact.
        """
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            return {"error": "Dataset is empty or missing Selector target column"}

        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]

        # Mean-fill numeric features for Random Forest
        df_rf = df.copy()
        for col in features:
            if pd.api.types.is_numeric_dtype(df_rf[col]):
                df_rf[col] = df_rf[col].fillna(df_rf[col].mean())
            else:
                df_rf[col] = df_rf[col].fillna(df_rf[col].mode()[0] if not df_rf[col].mode().empty else "Male")

        # Encode categorical variables (Gender)
        df_encoded = pd.get_dummies(df_rf[features + ["Gender", "target"]], columns=["Gender"], drop_first=True)
        encoded_features = [col for col in df_encoded.columns if col != "target"]


        semantic_names = {
            "TB": "Total Bilirubin",
            "DB": "Direct Bilirubin",
            "Alkphos": "Alkaline Phosphatase",
            "Sgpt": "ALT (Alanine Aminotransferase)",
            "Sgot": "AST (Aspartate Aminotransferase)",
            "ALB": "Albumin",
            "TP": "Total Proteins",
            "A/G Ratio": "Albumin/Globulin Ratio"
        }

        if scenario_id == "outlier_trim":
            iqr_mult = params.get("iqr_multiplier", 1.5) if params else 1.5
            return self.run_outlier_simulation(iqr_mult)

        elif scenario_id == "reduce_db_30":
            # Scenario 2: Therapy reducing DB by 30%
            # Train RF model on baseline
            X = df_encoded[encoded_features]
            y = df_encoded["target"]
            
            rf = RandomForestClassifier(random_state=42, n_estimators=50)
            rf.fit(X, y)
            
            # Baseline predictions
            baseline_preds = rf.predict(X)
            baseline_pred_diseased = int(sum(baseline_preds))
            
            # Simulate: Reduce DB by 30%
            df_sim_encoded = df_encoded.copy()
            if "DB" in df_sim_encoded.columns:
                df_sim_encoded["DB"] = df_sim_encoded["DB"] * 0.70
                
            sim_preds = rf.predict(df_sim_encoded[encoded_features])
            sim_pred_diseased = int(sum(sim_preds))
            recovered = max(0, baseline_pred_diseased - sim_pred_diseased)

            # Compute correlations
            baseline_corrs = {}
            simulated_corrs = {}
            for col in features:
                val_col = df[[col, "target"]].dropna()
                if len(val_col) > 10:
                    corr_val = val_col[col].corr(val_col["target"])
                    baseline_corrs[col] = float(corr_val) if not np.isnan(corr_val) else 0.0

                df_col_sim = df.copy()
                if col == "DB":
                    df_col_sim["DB"] = df_col_sim["DB"] * 0.70
                val_col_sim = df_col_sim[[col, "target"]].dropna()
                if len(val_col_sim) > 10:
                    corr_val_sim = val_col_sim[col].corr(val_col_sim["target"])
                    simulated_corrs[col] = float(corr_val_sim) if not np.isnan(corr_val_sim) else 0.0

            comparison = []
            for col in features:
                base = baseline_corrs.get(col, 0.0)
                sim = simulated_corrs.get(col, 0.0)
                diff = sim - base
                comparison.append({
                    "variable": col,
                    "display_name": semantic_names.get(col, col),
                    "baseline_correlation": round(base, 4),
                    "simulated_correlation": round(sim, 4),
                    "correlation_shift": round(diff, 4)
                })

            comparison.sort(key=lambda x: abs(x["correlation_shift"]), reverse=True)

            baseline_prev_pct = (baseline_pred_diseased / len(df)) * 100
            sim_prev_pct = (sim_pred_diseased / len(df)) * 100

            return {
                "scenario_name": "Scenario 2: Therapy - Reduce DB by 30%",
                "expected_change": "Reducción terapéutica de Bilirrubina Directa (DB) en un 30% en toda la población.",
                "expected_risk": f"Disminución estimada de la tasa de riesgo predicho de {baseline_prev_pct:.1f}% a {sim_prev_pct:.1f}%.",
                "expected_impact": f"Se estima que {recovered} pacientes saldrían de la categoría de alto riesgo.",
                "baseline_sample_size": len(df),
                "simulated_sample_size": len(df),
                "outliers_removed": 0,
                "correlation_comparison": comparison
            }

        elif scenario_id == "age_gt_60":
            # Scenario 3: Cohort Age > 60
            df_age = df[df["Age"] > 60]
            
            baseline_corrs = {}
            simulated_corrs = {}
            for col in features:
                val_col = df[[col, "target"]].dropna()
                if len(val_col) > 10:
                    corr_val = val_col[col].corr(val_col["target"])
                    baseline_corrs[col] = float(corr_val) if not np.isnan(corr_val) else 0.0

                val_col_age = df_age[[col, "target"]].dropna()
                if len(val_col_age) > 10:
                    corr_val_age = val_col_age[col].corr(val_col_age["target"])
                    simulated_corrs[col] = float(corr_val_age) if not np.isnan(corr_val_age) else 0.0

            comparison = []
            for col in features:
                base = baseline_corrs.get(col, 0.0)
                sim = simulated_corrs.get(col, 0.0)
                diff = sim - base
                comparison.append({
                    "variable": col,
                    "display_name": semantic_names.get(col, col),
                    "baseline_correlation": round(base, 4),
                    "simulated_correlation": round(sim, 4),
                    "correlation_shift": round(diff, 4)
                })

            comparison.sort(key=lambda x: abs(x["correlation_shift"]), reverse=True)

            baseline_prev = df["target"].mean()
            age_prev = df_age["target"].mean() if not df_age.empty else 0.0

            return {
                "scenario_name": "Scenario 3: Cohort - Age > 60",
                "expected_change": "Segmentación de la cohorte para analizar exclusivamente pacientes mayores de 60 años.",
                "expected_risk": f"La prevalencia de enfermedad hepática en este subgrupo de edad avanzada es de {age_prev*100:.1f}% (frente al {baseline_prev*100:.1f}% general).",
                "expected_impact": f"{len(df_age)} pacientes pertenecen a esta cohorte de riesgo acumulado.",
                "baseline_sample_size": len(df),
                "simulated_sample_size": len(df_age),
                "outliers_removed": 0,
                "correlation_comparison": comparison
            }
        else:
            return {"error": f"Unknown scenario_id: {scenario_id}"}
