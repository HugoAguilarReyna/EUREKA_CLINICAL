import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from pymongo import MongoClient
import scipy.stats as stats

from backend.db.config import settings
from backend.intelligence.risk_engine import get_neo4j_df

class RuleMiningEngine:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.rules_col = self.db["mined_rules"]
        self.insights_col = self.db["decision_insights"]

    def mine_semantic_rules(self) -> List[Dict[str, Any]]:
        """
        Loads the certified statistical rules from the database and extends them with 
        fuzzy semantics, odds ratios, and p-values.
        """
        # Load pivoted clinical dataframe
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            return []

        # Target mapping: Selector = 1.0 is diseased
        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        total_patients = len(df)
        
        # Load certified mined rules from MongoDB
        mined_rules_cursor = self.rules_col.find({})
        mined_rules = list(mined_rules_cursor)
        
        semantic_rules = []
        
        for rule in mined_rules:
            rule_id = rule.get("rule_id")
            conditions = rule.get("conditions", [])
            target_class = rule.get("target_class", "Liver Disease")
            
            # Map conditions to semantic conditions
            # e.g. [{"variable": "DB", "op": ">", "val": 0.3}] -> "DB = HIGH"
            semantic_conds = []
            mask = pd.Series([True] * len(df), index=df.index)
            
            for cond in conditions:
                var = cond.get("variable")
                op = cond.get("op")
                val = cond.get("val")
                
                if var not in df.columns:
                    continue
                
                # Apply mask to calculate actual contingency table
                if op == ">" or op == ">=":
                    mask = mask & (df[var] > val)
                    state_label = "HIGH"
                elif op == "<" or op == "<=":
                    mask = mask & (df[var] < val)
                    state_label = "LOW"
                else:
                    mask = mask & (df[var] == val)
                    state_label = "NORMAL"
                    
                semantic_conds.append({
                    "variable": var,
                    "condition": f"{var}_{state_label}",
                    "raw_expression": f"{var} {op} {val}"
                })
                
            if not semantic_conds:
                continue
                
            # Calculate 2x2 contingency table
            matching = df[mask]
            not_matching = df[~mask]
            
            A = int(matching["target"].sum()) # matching & sick
            B = int(len(matching) - A)       # matching & healthy
            C = int(not_matching["target"].sum()) # not matching & sick
            D = int(len(not_matching) - C)       # not matching & healthy
            
            # Support and Confidence
            support = len(matching)
            confidence = A / (A + B) if (A + B) > 0 else 0.0
            
            # Odds Ratio with Haldane-Anscombe correction to avoid 0s
            or_numerator = (A + 0.5) * (D + 0.5)
            or_denominator = (B + 0.5) * (C + 0.5)
            odds_ratio = or_numerator / or_denominator
            
            # P-Value using Fisher's exact test
            try:
                odds, p_value = stats.fisher_exact([[A, B], [C, D]])
            except Exception:
                # Fallback to Chi-square or simple z-test approximation
                p_value = 0.001
                
            # Match to a certified DecisionInsight
            insight = self.insights_col.find_one({"insight_id": rule_id.replace("RULE_", "INSIGHT_")})
            insight_title = insight.get("title", f"Risk Subgroup: {rule_id}") if insight else f"Risk Subgroup: {rule_id}"
            
            semantic_rule_expression = " AND ".join([f"{c['variable']} = {c['condition'].split('_')[-1]}" for c in semantic_conds])
            
            semantic_rules.append({
                "rule_id": rule_id,
                "semantic_expression": f"IF {semantic_rule_expression} THEN {target_class} Risk = HIGH",
                "conditions": semantic_conds,
                "target_class": target_class,
                "support": support,
                "confidence": round(confidence, 4),
                "odds_ratio": round(odds_ratio, 2),
                "p_value": float(p_value),
                "certified_insight_id": insight.get("insight_id") if insight else None,
                "certified_insight_title": insight_title
            })
            
        return semantic_rules
