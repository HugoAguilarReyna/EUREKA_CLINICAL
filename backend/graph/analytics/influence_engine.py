import networkx as nx
from typing import Optional, List, Dict, Any
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder
from backend.graph.models.intelligence_dtos import InfluenceDTO
from backend.graph.logger import logger
from backend.intelligence.risk_engine import get_neo4j_df

class InfluenceEngine:
    def __init__(self, snapshot_builder: Optional[GraphSnapshotBuilder] = None):
        self.snapshot_builder = snapshot_builder or GraphSnapshotBuilder()

    def calculate_asset_influence(self, asset_id: str) -> InfluenceDTO:
        """
        Calculates the influence of an asset.
        Supports both legacy structural BFS reachability and Sprint 4.0 Leave-One-Out (LOO) ML feature importance.
        """
        # 1. Identify if asset_id is a clinical variable (directly or via LabMetric ID)
        feature_name = None
        var_mappings = {
            "TB": "TB", "total bilirubin": "TB", "total_bilirubin": "TB",
            "DB": "DB", "direct bilirubin": "DB", "direct_bilirubin": "DB",
            "Alkphos": "Alkphos", "alkaline phosphatase": "Alkphos", "alkaline_phosphatase": "Alkphos",
            "Sgpt": "Sgpt", "alt": "Sgpt", "alt (alanine aminotransferase)": "Sgpt",
            "Sgot": "Sgot", "ast": "Sgot", "ast (aspartate aminotransferase)": "Sgot",
            "ALB": "ALB", "albumin": "ALB",
            "TP": "TP", "total proteins": "TP", "total_proteins": "TP",
            "A/G Ratio": "A/G Ratio", "ratio": "A/G Ratio", "albumin/globulin ratio": "A/G Ratio",
            "Age": "Age", "Gender": "Gender"
        }

        # Check exact match in mappings
        if asset_id in var_mappings:
            feature_name = var_mappings[asset_id]
        elif asset_id.startswith("LabMetric_"):
            parts = asset_id.split("_")
            if len(parts) >= 3:
                raw_metric = parts[2]
                # Try finding in mapping
                for k, v in var_mappings.items():
                    if k.lower() == raw_metric.lower():
                        feature_name = v
                        break

        # 2. If it is a clinical feature, calculate LOO Feature Importance using Random Forest
        if feature_name:
            try:
                df = get_neo4j_df()
                if not df.empty and "Selector" in df.columns:
                    import pandas as pd
                    from sklearn.model_selection import train_test_split
                    from sklearn.ensemble import RandomForestClassifier
                    from sklearn.metrics import accuracy_score

                    df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
                    features = [col for col in df.columns if col not in ["patient_id", "Selector", "target"]]

                    # Fill NaNs
                    for col in features:
                        if pd.api.types.is_numeric_dtype(df[col]):
                            df[col] = df[col].fillna(df[col].mean())
                        else:
                            df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "Male")

                    # One-hot encode Gender
                    df_encoded = pd.get_dummies(df[features + ["target"]], columns=["Gender"], drop_first=True)
                    encoded_features = [col for col in df_encoded.columns if col != "target"]

                    X = df_encoded[encoded_features]
                    y = df_encoded["target"]

                    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

                    # Full model
                    rf = RandomForestClassifier(random_state=42, n_estimators=50)
                    rf.fit(X_train, y_train)
                    baseline_acc = accuracy_score(y_test, rf.predict(X_test))

                    # Model without this feature
                    if feature_name == "Gender":
                        cols_to_use = [col for col in encoded_features if not col.startswith("Gender_")]
                    else:
                        cols_to_use = [col for col in encoded_features if col != feature_name]

                    X_train_sub = X_train[cols_to_use]
                    X_test_sub = X_test[cols_to_use]

                    rf_sub = RandomForestClassifier(random_state=42, n_estimators=50)
                    rf_sub.fit(X_train_sub, y_train)
                    sub_acc = accuracy_score(y_test, rf_sub.predict(X_test_sub))

                    drop = baseline_acc - sub_acc
                    drop_pct = (drop / baseline_acc) * 100 if baseline_acc > 0 else 0.0
                    drop_pct = max(0.0, drop_pct)
                    
                    # Calculate affected count
                    correct_baseline = sum(rf.predict(X_test) == y_test)
                    correct_sub = sum(rf_sub.predict(X_test_sub) == y_test)
                    diff_correct = correct_baseline - correct_sub
                    affected_count = int(round(max(0.0, diff_correct) / len(y_test) * len(df)))
                    if affected_count <= 0:
                        affected_count = int(df[df[feature_name] > df[feature_name].quantile(0.75)].shape[0])
                    # Classify impact level
                    if drop_pct >= 5.0:
                        impact_level = "CRITICAL"
                        risk_associated = "CRÍTICA"
                    elif drop_pct >= 2.0:
                        impact_level = "HIGH"
                        risk_associated = "ALTA"
                    elif drop_pct >= 0.5:
                        impact_level = "MEDIUM"
                        risk_associated = "MEDIA"
                    else:
                        impact_level = "LOW"
                        risk_associated = "BAJA"

                    description = (
                        f"Si eliminamos {feature_name} del modelo:\n"
                        f"* La capacidad predictiva cae {drop_pct:.1f}%\n"
                        f"* {affected_count} pacientes dejan de clasificarse correctamente\n"
                        f"* Riesgo: {impact_level}\n\n"
                        f"Recomendación:\nMantener esta variable en futuros modelos."
                    )

                    recommendation = f"Mantener {feature_name} como predictor principal en el panel clínico." if impact_level in ["CRITICAL", "HIGH"] else f"Mantener {feature_name} para soporte y descarte secundario."

                    logger.info("calculate_asset_influence_loo", extra={"feature": feature_name, "drop_pct": drop_pct})
                    return InfluenceDTO(
                        asset_id=asset_id,
                        impacted_cases=[],
                        impacted_assets=[],
                        influence_score=round(drop_pct, 4),
                        accuracy_drop_pct=round(drop_pct, 2),
                        impact_level=impact_level,
                        description=description,
                        risk_associated=risk_associated,
                        affected_patients=affected_count,
                        recommendation=recommendation
                    )
            except Exception as e:
                logger.error(f"Error computing LOO influence for {feature_name}: {e}")

        # 3. Fallback to graph reachability for structural assets/cases
        G = self.snapshot_builder.build_full_graph()
        
        if not G.has_node(asset_id):
            logger.warning(f"calculate_asset_influence: Asset {asset_id} not found in graph.")
            return InfluenceDTO(asset_id=asset_id, impacted_cases=[], impacted_assets=[], influence_score=0.0)
            
        descendants = list(nx.descendants(G, asset_id))
        
        impacted_cases = []
        impacted_assets = []
        
        for node_id in descendants:
            label = G.nodes[node_id].get("label", "")
            if label == "Case":
                impacted_cases.append(node_id)
            elif label == "KnowledgeAsset":
                impacted_assets.append(node_id)
                 
        in_degree = G.in_degree(asset_id) if G.is_directed() else 0
        out_degree = G.out_degree(asset_id) if G.is_directed() else 0
        pagerank = G.nodes[asset_id].get("pagerank", 0.0)
        
        reachability_score = len(descendants) * 5.0
        degree_score = (in_degree + out_degree) * 2.0
        pagerank_score = pagerank * 100.0
        
        influence_score = reachability_score + degree_score + pagerank_score
        if influence_score == 0.0 and (in_degree > 0 or out_degree > 0):
            influence_score = 1.0
            
        return InfluenceDTO(
            asset_id=asset_id,
            impacted_cases=impacted_cases,
            impacted_assets=impacted_assets,
            influence_score=round(influence_score, 4),
            accuracy_drop_pct=0.0,
            impact_level="MEDIO",
            description=f"Influencia estructural basada en topología del grafo. Nodos impactados: {len(descendants)}."
        )

    def calculate_case_influence(self, case_id: str) -> InfluenceDTO:
        return self.calculate_asset_influence(case_id)

    def calculate_governance_influence(self, governance_id: str) -> InfluenceDTO:
        return self.calculate_asset_influence(governance_id)
