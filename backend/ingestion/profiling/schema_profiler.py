import pandas as pd
import numpy as np
from typing import Dict, Any, List

def profile_schema(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not data:
        return {}
        
    df = pd.DataFrame(data)
    
    # Missing values
    missing_values = int(df.isnull().sum().sum())
    
    # Target detection
    target_candidate = None
    target_keywords = ['target', 'label', 'class', 'selector', 'outcome']
    for col in df.columns:
        if str(col).lower() in target_keywords:
            target_candidate = col
            break
    
    if not target_candidate:
        # Fallback to binary columns at the end
        for col in reversed(df.columns):
            if df[col].nunique() == 2:
                target_candidate = col
                break

    # Correlation Analysis
    highly_correlated_features = []
    if target_candidate and target_candidate in df.columns and pd.api.types.is_numeric_dtype(df[target_candidate]):
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty and target_candidate in numeric_df.columns:
            correlations = numeric_df.corr(method='pearson')[target_candidate].drop(target_candidate, errors='ignore')
            for feat, corr_val in correlations.items():
                if pd.notnull(corr_val) and abs(corr_val) > 0.3:  # Threshold for relevance
                    highly_correlated_features.append({
                        "feature": feat,
                        "correlation": float(corr_val)
                    })
            # Sort by absolute correlation
            highly_correlated_features.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    # Outlier detection (IQR)
    outliers_detected = 0
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
        outliers_detected += int(outliers)

    # Duplicate rows
    num_duplicates = int(df.duplicated().sum())

    # Quality Score (0-100)
    total_cells = df.shape[0] * df.shape[1]
    if total_cells == 0:
        quality_score = 0
    else:
        penalty_missing = (missing_values / total_cells) * 40
        penalty_dups = (num_duplicates / df.shape[0]) * 30 if df.shape[0] > 0 else 0
        penalty_outliers = min((outliers_detected / total_cells) * 30, 30)
        quality_score = max(0, int(100 - penalty_missing - penalty_dups - penalty_outliers))

    profile = {
        "num_rows": len(df),
        "num_columns": len(df.columns),
        "columns": {},
        "missing_values": missing_values,
        "target_candidate": target_candidate,
        "highly_correlated_features": highly_correlated_features,
        "outliers_detected": outliers_detected,
        "quality_score": quality_score,
        "num_duplicates": num_duplicates
    }
    
    for col in df.columns:
        col_data = df[col]
        profile["columns"][col] = {
            "data_type": str(col_data.dtype),
            "num_unique": int(col_data.nunique(dropna=True)),
            "null_rate": float(col_data.isnull().mean()),
            "is_unique": int(col_data.nunique(dropna=True)) == len(df),
        }
        
    return profile
