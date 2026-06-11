import pandas as pd
import numpy as np
from typing import List, Dict, Any
from backend.graph.client import Neo4jClient
from backend.models.intelligence import DecisionInsightRecord, MinedRuleRecord
from backend.graph.logger import logger

def get_neo4j_df() -> pd.DataFrame:
    """Fetch all patient measurements from Neo4j and pivot into a pandas DataFrame."""
    client = Neo4jClient()
    records = []
    try:
        with client.session() as session:
            result = session.run("""
                MATCH (p:KnowledgeAsset:Patient)-[:HAS_MEASUREMENT]->(m:KnowledgeAsset:LaboratoryMetric)
                RETURN p.id as patient_id, p.Age as Age, p.Gender as Gender, m.metric_name as metric_name, m.value as value
            """)
            for rec in result:
                records.append({
                    "patient_id": rec["patient_id"],
                    "Age": rec["Age"],
                    "Gender": rec["Gender"],
                    "metric_name": rec["metric_name"],
                    "value": rec["value"]
                })
    except Exception as e:
        logger.warning(f"Error building DataFrame from Neo4j: {e}. Falling back to MongoDB.")
        
    # MongoDB Fallback if records are empty
    if not records:
        try:
            from pymongo import MongoClient
            from backend.db.config import settings
            mongo_client = MongoClient(settings.mongo_uri)
            db = mongo_client[settings.mongo_db_name]
            cases_cursor = db["cases"].find({})
            for c in cases_cursor:
                patient_id = c.get("patient_id")
                raw = c.get("raw_data", {})
                
                # Selector=1 means liver disease, 2 means healthy
                pred = c.get("prediction_result", {})
                selector_val = 1.0 if (pred and (pred.get("is_disease") or pred.get("prediction") == 1)) else 2.0
                
                for metric in ["TB", "DB", "Alkphos", "Sgpt", "Sgot", "TP", "ALB"]:
                    records.append({
                        "patient_id": patient_id,
                        "Age": raw.get("Age"),
                        "Gender": raw.get("Gender"),
                        "metric_name": metric,
                        "value": raw.get(metric, 0.0)
                    })
                records.append({
                    "patient_id": patient_id,
                    "Age": raw.get("Age"),
                    "Gender": raw.get("Gender"),
                    "metric_name": "A/G Ratio",
                    "value": raw.get("A_G_Ratio") or raw.get("A/G Ratio") or 0.0
                })
                records.append({
                    "patient_id": patient_id,
                    "Age": raw.get("Age"),
                    "Gender": raw.get("Gender"),
                    "metric_name": "Selector",
                    "value": selector_val
                })
        except Exception as e_mongo:
            logger.error(f"MongoDB fallback failed: {e_mongo}")

    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df_pivot = df.pivot_table(index=["patient_id", "Age", "Gender"], columns="metric_name", values="value").reset_index()
    return df_pivot


class RiskEngine:
    """
    Subgroup Discovery and Clinical Pattern Mining Engine.
    Examines clinical metrics to extract high-risk patient subgroups and logic rules.
    """

    def __init__(self):
        # Maps clinical metrics to semantic readable names, units, and recommendations
        self.metric_info = {
            "TB": {"name": "Total Bilirubin", "unit": "mg/dL", "high_action": "Priorizar evaluación clínica hepatológica y descartar colestasis.", "low_action": "Monitoreo rutinario."},
            "DB": {"name": "Direct Bilirubin", "unit": "mg/dL", "high_action": "Realizar ecografía hepatobiliar urgente para descartar obstrucción extrahepática.", "low_action": "Monitoreo de rutina."},
            "Alkphos": {"name": "Alkaline Phosphatase", "unit": "IU/L", "high_action": "Perfil hepatobiliar y óseo completo para evaluar colestasis o disfunción hepática.", "low_action": "Seguimiento periódico."},
            "Sgpt": {"name": "ALT (Alanine Aminotransferase)", "unit": "IU/L", "high_action": "Descartar daño hepatocelular activo, suspender fármacos hepatotóxicos y realizar serología para hepatitis.", "low_action": "Monitoreo general."},
            "Sgot": {"name": "AST (Aspartate Aminotransferase)", "unit": "IU/L", "high_action": "Evaluar necrosis hepatocelular aguda o compromiso muscular sistémico.", "low_action": "Monitoreo general."},
            "ALB": {"name": "Albumin", "unit": "g/dL", "high_action": "Monitoreo general.", "low_action": "Soporte nutricional intensivo y evaluación de síntesis proteica hepática."},
            "TP": {"name": "Total Proteins", "unit": "g/dL", "high_action": "Monitoreo general.", "low_action": "Evaluar estado nutricional y síndrome nefrótico/pérdida proteica."},
            "A/G Ratio": {"name": "Albumin/Globulin Ratio", "unit": "", "high_action": "Monitoreo general.", "low_action": "Evaluar inflamación crónica hepática o cirrosis."}
        }

    async def mine_patterns(self) -> Dict[str, Any]:
        """
        Runs subgroup analysis to find thresholds of high-risk metrics.
        Persists results in MongoDB (decision_insights and mined_rules).
        """
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            return {"status": "skipped", "reason": "No data or missing target column 'Selector'"}

        # Clear existing rules/insights to start fresh
        await DecisionInsightRecord.find_all().delete()
        await MinedRuleRecord.find_all().delete()

        # In Indian Liver Patient Dataset, Selector=1 means diseased, 2 means healthy
        # Let's map target to boolean: True = Liver Disease (value 1)
        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        
        baseline_rate = df["target"].mean()
        total_patients = len(df)
        
        mined_rules = []
        decision_insights = []
        
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]
        
        rule_idx = 0
        insight_idx = 0

        for col in features:
            val_col = df[col].dropna()
            if len(val_col) < 20:
                continue
                
            q75 = val_col.quantile(0.75)
            q25 = val_col.quantile(0.25)
            
            info = self.metric_info.get(col, {"name": col, "unit": "", "high_action": "Priorizar evaluación clínica.", "low_action": "Monitoreo."})
            
            # --- Test High Threshold (col > Q75) ---
            subset_high = df[df[col] > q75]
            if len(subset_high) >= 10:
                incidence_high = subset_high["target"].mean()
                lift_high = incidence_high / baseline_rate if baseline_rate > 0 else 1.0
                
                # If risk is higher than baseline and significant
                if incidence_high > baseline_rate and lift_high > 1.1:
                    rule_idx += 1
                    rule_id = f"RULE_{rule_idx}_{col}_HIGH"
                    expression = f"{col} > {round(q75, 2)}"
                    
                    mined_rule = MinedRuleRecord(
                        rule_id=rule_id,
                        expression=expression,
                        conditions=[{"variable": col, "op": ">", "val": float(q75)}],
                        target_class="Liver Disease",
                        lift=float(lift_high),
                        support=float(len(subset_high) / total_patients),
                        confidence=float(incidence_high),
                        affected_count=int(len(subset_high)),
                        rule_status="ACTIVE"
                    )
                    await mined_rule.insert()
                    mined_rules.append(mined_rule)
                    
                    # Generate Decision Insight
                    insight_idx += 1
                    insight_id = f"INSIGHT_{insight_idx}_{col}_HIGH"
                    
                    title = f"High Risk Pattern: Elevated {info['name']}"
                    finding = f"{len(subset_high)} pacientes presentan valores elevados de {info['name']} (> {round(q75, 2)} {info['unit']}).".strip()
                    risk = f"{incidence_high * 100:.1f}% de estos pacientes presentan enfermedad hepática (Incidencia de alto riesgo)."
                    
                    risk_level = "CRITICAL" if incidence_high > 0.85 else "HIGH" if incidence_high > 0.70 else "MEDIUM"
                    
                    insight = DecisionInsightRecord(
                        insight_id=insight_id,
                        title=title,
                        description=f"Subgrupo de alto riesgo detectado mediante Pattern Mining lógico: {expression}.",
                        evidence=finding + " " + risk,
                        confidence=float(round(incidence_high, 2)),
                        risk_level=risk_level,
                        action=info["high_action"],
                        affected_population=int(len(subset_high)),
                        impacted_variables=[col]
                    )
                    await insight.insert()
                    decision_insights.append(insight)

            # --- Test Low Threshold (col < Q25) ---
            subset_low = df[df[col] < q25]
            if len(subset_low) >= 10:
                incidence_low = subset_low["target"].mean()
                lift_low = incidence_low / baseline_rate if baseline_rate > 0 else 1.0
                
                # If risk is higher than baseline
                if incidence_low > baseline_rate and lift_low > 1.1:
                    rule_idx += 1
                    rule_id = f"RULE_{rule_idx}_{col}_LOW"
                    expression = f"{col} < {round(q25, 2)}"
                    
                    mined_rule = MinedRuleRecord(
                        rule_id=rule_id,
                        expression=expression,
                        conditions=[{"variable": col, "op": "<", "val": float(q25)}],
                        target_class="Liver Disease",
                        lift=float(lift_low),
                        support=float(len(subset_low) / total_patients),
                        confidence=float(incidence_low),
                        affected_count=int(len(subset_low)),
                        rule_status="ACTIVE"
                    )
                    await mined_rule.insert()
                    mined_rules.append(mined_rule)
                    
                    # Generate Decision Insight
                    insight_idx += 1
                    insight_id = f"INSIGHT_{insight_idx}_{col}_LOW"
                    
                    title = f"High Risk Pattern: Reduced {info['name']}"
                    finding = f"{len(subset_low)} pacientes presentan valores bajos de {info['name']} (< {round(q25, 2)} {info['unit']}).".strip()
                    risk = f"{incidence_low * 100:.1f}% de estos pacientes presentan enfermedad hepática (Incidencia de alto riesgo)."
                    
                    risk_level = "CRITICAL" if incidence_low > 0.85 else "HIGH" if incidence_low > 0.70 else "MEDIUM"
                    
                    insight = DecisionInsightRecord(
                        insight_id=insight_id,
                        title=title,
                        description=f"Subgrupo de alto riesgo detectado mediante Pattern Mining lógico: {expression}.",
                        evidence=finding + " " + risk,
                        confidence=float(round(incidence_low, 2)),
                        risk_level=risk_level,
                        action=info["low_action"],
                        affected_population=int(len(subset_low)),
                        impacted_variables=[col]
                    )
                    await insight.insert()
                    decision_insights.append(insight)

        logger.info(f"Mined {len(mined_rules)} rules and {len(decision_insights)} insights successfully.")
        return {
            "status": "success",
            "rules_mined": len(mined_rules),
            "insights_generated": len(decision_insights)
        }
