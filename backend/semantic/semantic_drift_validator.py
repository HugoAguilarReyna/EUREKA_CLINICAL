import numpy as np
from typing import Dict, Any, List, Optional
from pymongo import MongoClient

from backend.db.config import settings
from backend.semantic.fuzzy_engine import FuzzyEngine
from backend.semantic.semantic_state_engine import SemanticStateEngine
from backend.semantic.rule_mining_engine import RuleMiningEngine

class SemanticDriftValidator:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.state_engine = SemanticStateEngine()
        self.rule_engine = RuleMiningEngine()

    def run_drift_analysis(self) -> Dict[str, Any]:
        """
        Analyzes drift by comparing a baseline cohort (e.g., first 50% of patient records)
        against a newer target cohort (e.g., last 50% of patient records) in the database.
        This provides a live temporal evaluation of membership, rule, and entropy shifts.
        """
        cases = list(self.db["cases"].find({}))
        if len(cases) < 40:
            return {
                "status": "SKIPPED",
                "reason": "Not enough patients to perform drift analysis",
                "alerts": []
            }
            
        # Partition cohorts
        midpoint = len(cases) // 2
        baseline_cases = cases[:midpoint]
        current_cases = cases[midpoint:]
        
        # 1. Membership Drift & Semantic Entropy Drift
        variables = ["TB", "DB", "Alkphos", "Sgpt", "Sgot", "ALB", "TP", "A/G Ratio", "Age"]
        
        membership_drift = {}
        entropy_drift = {}
        alerts = []
        
        for var in variables:
            base_vals = [c["raw_data"].get(var) for c in baseline_cases if c.get("raw_data") and c["raw_data"].get(var) is not None]
            curr_vals = [c["raw_data"].get(var) for c in current_cases if c.get("raw_data") and c["raw_data"].get(var) is not None]
            
            if not base_vals or not curr_vals:
                continue
                
            # Compute memberships
            base_mems = [FuzzyEngine.get_memberships(var, float(v)) for v in base_vals]
            curr_mems = [FuzzyEngine.get_memberships(var, float(v)) for v in curr_vals]
            
            base_entropies = [FuzzyEngine.compute_semantic_entropy(m) for m in base_mems]
            curr_entropies = [FuzzyEngine.compute_semantic_entropy(m) for m in curr_mems]
            
            mean_base_entropy = np.mean(base_entropies)
            mean_curr_entropy = np.mean(curr_entropies)
            
            # Check entropy shift
            entropy_shift = abs(mean_curr_entropy - mean_base_entropy) / (mean_base_entropy + 1e-5)
            entropy_drift[var] = {
                "baseline_entropy": float(mean_base_entropy),
                "current_entropy": float(mean_curr_entropy),
                "shift": float(entropy_shift)
            }
            
            if entropy_shift > 0.25: # Threshold: 25%
                alerts.append({
                    "type": "SEMANTIC_ENTROPY_DRIFT",
                    "variable": var,
                    "threshold": 0.25,
                    "observed_shift": float(entropy_shift),
                    "message": f"Semantic entropy for {var} shifted by {entropy_shift*100:.1f}%, exceeding 25% threshold."
                })
                
            # Check Membership Drift per class
            classes = ["LOW", "NORMAL", "HIGH", "VERY_HIGH"]
            var_m_drift = {}
            for cl in classes:
                base_cl_avg = np.mean([m[cl] for m in base_mems])
                curr_cl_avg = np.mean([m[cl] for m in curr_mems])
                shift = abs(curr_cl_avg - base_cl_avg) / (base_cl_avg + 1e-5)
                var_m_drift[cl] = {
                    "baseline_avg": float(base_cl_avg),
                    "current_avg": float(curr_cl_avg),
                    "shift": float(shift)
                }
                
                if shift > 0.20 and base_cl_avg > 0.05: # Threshold: 20% (ignore tiny baseline probabilities)
                    alerts.append({
                        "type": "MEMBERSHIP_DRIFT",
                        "variable": var,
                        "class": cl,
                        "threshold": 0.20,
                        "observed_shift": float(shift),
                        "message": f"Fuzzy membership of {var} for set {cl} shifted by {shift*100:.1f}%, exceeding 20% threshold."
                    })
            membership_drift[var] = var_m_drift
            
        # 2. Rule Confidence Drift
        # We can calculate rules for baseline cohort and current cohort
        rules = self.rule_engine.mine_semantic_rules()
        rule_drifts = {}
        
        # We simulate rule drift by calculating their performance in baseline vs current cases
        for r in rules:
            rule_id = r["rule_id"]
            conds = r["conditions"]
            
            def match_rule(case) -> bool:
                raw = case.get("raw_data", {})
                for c in conds:
                    var = c["variable"]
                    val = raw.get(var)
                    if val is None:
                        return False
                    op = c["raw_expression"].split(" ")[1]
                    limit = float(c["raw_expression"].split(" ")[2])
                    if op == ">" and float(val) <= limit:
                        return False
                    elif op == "<" and float(val) >= limit:
                        return False
                return True
                
            base_matched = [c for c in baseline_cases if match_rule(c)]
            curr_matched = [c for c in current_cases if match_rule(c)]
            
            def get_conf(cohort) -> float:
                if not cohort: return 0.0
                diseased = sum([1 for c in cohort if c.get("prediction_result", {}).get("is_disease") or c.get("prediction_result", {}).get("prediction") == 1])
                return diseased / len(cohort)
                
            base_conf = get_conf(base_matched)
            curr_conf = get_conf(curr_matched)
            
            conf_shift = abs(curr_conf - base_conf) / (base_conf + 1e-5)
            rule_drifts[rule_id] = {
                "rule_expression": r["semantic_expression"],
                "baseline_confidence": float(base_conf),
                "current_confidence": float(curr_conf),
                "shift": float(conf_shift)
            }
            
            if conf_shift > 0.15: # Threshold: 15%
                alerts.append({
                    "type": "RULE_CONFIDENCE_DRIFT",
                    "rule_id": rule_id,
                    "threshold": 0.15,
                    "observed_shift": float(conf_shift),
                    "message": f"Rule {rule_id} confidence shifted by {conf_shift*100:.1f}%, exceeding 15% threshold."
                })
                
        status = "DRIFT_DETECTED" if len(alerts) > 0 else "STABLE"
        
        return {
            "status": status,
            "membership_drift": membership_drift,
            "rule_drift": rule_drifts,
            "entropy_drift": entropy_drift,
            "alerts": alerts
        }
