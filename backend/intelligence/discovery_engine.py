import pandas as pd
import numpy as np
from scipy.stats import fisher_exact, chi2_contingency, mannwhitneyu, spearmanr
from sklearn.feature_selection import mutual_info_classif
from typing import Dict, Any, Tuple

class DiscoveryEngine:
    """
    Motor estadístico encargado de validar la significancia empírica de cualquier hipótesis.
    """
    def __init__(self):
        pass

    def test_binary_association(self, df: pd.DataFrame, feature_col: str, target_col: str) -> Dict[str, Any]:
        """
        Fisher Exact Test for binary vs binary variables.
        Expects feature_col to be boolean or 0/1.
        """
        crosstab = pd.crosstab(df[feature_col], df[target_col])
        if crosstab.shape == (2, 2):
            odds_ratio, p_value = fisher_exact(crosstab)
            # relative risk approximation
            # RR = (a / (a+b)) / (c / (c+d))
            a = crosstab.iloc[1, 1] if 1 in crosstab.columns and 1 in crosstab.index else 0
            b = crosstab.iloc[1, 0] if 0 in crosstab.columns and 1 in crosstab.index else 0
            c = crosstab.iloc[0, 1] if 1 in crosstab.columns and 0 in crosstab.index else 0
            d = crosstab.iloc[0, 0] if 0 in crosstab.columns and 0 in crosstab.index else 0
            
            p1 = a / (a + b) if (a + b) > 0 else 0
            p0 = c / (c + d) if (c + d) > 0 else 0
            rr = (p1 / p0) if p0 > 0 else None
            
            return {
                "test_used": "Fisher Exact Test",
                "p_value": float(p_value),
                "odds_ratio": float(odds_ratio) if odds_ratio != float('inf') else 999.0,
                "relative_risk": float(rr) if rr is not None else None,
                "support": int(a + b)
            }
        return {"test_used": "Fisher Exact Test", "p_value": 1.0, "odds_ratio": 1.0, "relative_risk": 1.0, "support": 0}

    def test_continuous_association(self, df: pd.DataFrame, feature_col: str, target_col: str) -> Dict[str, Any]:
        """
        Mann-Whitney U Test for continuous vs binary (target).
        """
        clean_df = df.dropna(subset=[feature_col, target_col])
        group_pos = clean_df[clean_df[target_col] == 1][feature_col]
        group_neg = clean_df[clean_df[target_col] == 0][feature_col]
        
        if len(group_pos) > 0 and len(group_neg) > 0:
            stat, p_value = mannwhitneyu(group_pos, group_neg, alternative='two-sided')
            # Effect size approximation (rank-biserial correlation)
            n1, n2 = len(group_pos), len(group_neg)
            effect_size = 1 - (2 * stat) / (n1 * n2)
            
            # Spearman correlation as alternative continuous association measure
            spearman_stat, spearman_p = spearmanr(clean_df[feature_col], clean_df[target_col])
            
            return {
                "test_used": "Mann-Whitney U Test",
                "p_value": float(p_value),
                "effect_size": float(abs(effect_size)),
                "spearman_correlation": float(spearman_stat),
                "spearman_p_value": float(spearman_p),
                "support": int(n1 + n2)
            }
        return {"test_used": "Mann-Whitney U Test", "p_value": 1.0, "effect_size": 0.0, "support": 0}

    def evaluate_subgroup(self, df: pd.DataFrame, mask: pd.Series, target_col: str) -> Dict[str, Any]:
        """
        Evaluates a boolean mask (subgroup) against the target column.
        """
        df_temp = pd.DataFrame({'subgroup': mask, 'target': df[target_col]})
        df_temp.dropna(inplace=True)
        return self.test_binary_association(df_temp, 'subgroup', 'target')
