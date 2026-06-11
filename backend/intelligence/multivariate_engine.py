import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier, _tree
from backend.intelligence.discovery_engine import DiscoveryEngine
from backend.intelligence.risk_engine import get_neo4j_df
from backend.graph.logger import logger
from typing import Dict, Any, List

class MultivariateEngine:
    """
    Motor para descubrimiento de interacciones multivariadas (Subgroup Discovery) 
    usando shallow Decision Trees para minar reglas combinadas interpretables.
    """
    def __init__(self):
        self.discovery_engine = DiscoveryEngine()

    def _extract_rules(self, tree, feature_names):
        tree_ = tree.tree_
        feature_name = [
            feature_names[i] if i != _tree.TREE_UNDEFINED else "undefined!"
            for i in tree_.feature
        ]

        rules = []

        def recurse(node, current_rule):
            if tree_.feature[node] != _tree.TREE_UNDEFINED:
                name = feature_name[node]
                threshold = tree_.threshold[node]
                
                # left child (<= threshold)
                rule_left = current_rule.copy()
                rule_left.append((name, "<=", threshold))
                recurse(tree_.children_left[node], rule_left)
                
                # right child (> threshold)
                rule_right = current_rule.copy()
                rule_right.append((name, ">", threshold))
                recurse(tree_.children_right[node], rule_right)
            else:
                # Leaf node: get class probabilities
                value = tree_.value[node][0]
                prob = value / np.sum(value)
                rules.append({"conditions": current_rule, "probabilities": prob, "samples": np.sum(value)})

        recurse(0, [])
        return rules

    def find_multivariate_rules(self, df: pd.DataFrame = None) -> List[Dict[str, Any]]:
        if df is None:
            df = get_neo4j_df()
            
        if df.empty or "Selector" not in df.columns:
            return []

        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]
        
        df_clean = df.dropna(subset=features + ["target"])
        if df_clean.empty:
            return []

        X = df_clean[features]
        y = df_clean["target"]

        # Entrenar un árbol superficial (max depth 2 o 3 permite reglas de 2 o 3 interacciones)
        clf = DecisionTreeClassifier(max_depth=2, random_state=42, min_samples_leaf=10)
        clf.fit(X, y)

        raw_rules = self._extract_rules(clf, features)
        
        valid_multivariate_rules = []
        for r in raw_rules:
            # Solo reglas con más de 1 condición
            if len(r["conditions"]) < 2:
                continue
                
            # Solo subgrupos predictivos de enfermedad (clase 1)
            prob_disease = r["probabilities"][1] if len(r["probabilities"]) > 1 else 0
            if prob_disease < 0.6: # Debe ser mayor al baseline
                continue
                
            # Evaluar la regla contra los datos para sacar métricas robustas
            mask = pd.Series(True, index=df_clean.index)
            rule_strings = []
            for feat, op, val in r["conditions"]:
                if op == "<=":
                    mask = mask & (df_clean[feat] <= val)
                    rule_strings.append(f"{feat} <= {val:.2f}")
                else:
                    mask = mask & (df_clean[feat] > val)
                    rule_strings.append(f"{feat} > {val:.2f}")
                    
            stats = self.discovery_engine.evaluate_subgroup(df_clean, mask, "target")
            
            valid_multivariate_rules.append({
                "rule_string": " AND ".join(rule_strings),
                "features_involved": [cond[0] for cond in r["conditions"]],
                "confidence": float(prob_disease),
                "support": int(r["samples"]),
                "odds_ratio": stats["odds_ratio"],
                "p_value": stats["p_value"],
                "relative_risk": stats["relative_risk"]
            })
            
        return valid_multivariate_rules
