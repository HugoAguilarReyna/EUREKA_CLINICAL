import sys
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Ensure backend imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.intelligence.risk_engine import get_neo4j_df

def main():
    df = get_neo4j_df()
    if df.empty:
        print("DataFrame is empty.")
        return

    # In ILPD dataset, Selector = 1 (diseased), Selector = 2 (healthy)
    # Target = True (diseased)
    df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
    
    variables = ["Age", "TB", "DB", "Alkphos", "Sgpt", "Sgot", "TP", "ALB", "A/G Ratio"]
    
    # Fill NaNs
    for col in variables + ["Gender"]:
        if col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].mean())
            else:
                df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "Male")

    # One-hot encode Gender
    df_encoded = pd.get_dummies(df[variables + ["Gender", "target"]], columns=["Gender"], drop_first=True)
    encoded_features = [col for col in df_encoded.columns if col != "target"]

    X = df_encoded[encoded_features]
    y = df_encoded["target"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 1. Train Full Model and get RF Gini Feature Importances
    rf = RandomForestClassifier(random_state=42, n_estimators=50)
    rf.fit(X_train, y_train)
    baseline_acc = accuracy_score(y_test, rf.predict(X_test))
    
    importances = rf.feature_importances_
    feat_importances = dict(zip(encoded_features, importances))

    # 2. Compute Pearson Correlation with boolean target
    correlations = {}
    for var in variables:
        correlations[var] = df[var].corr(df["target"])

    # 3. Compute LOO Impact for each variable
    loo_impacts = {}
    for var in variables:
        cols_to_use = [col for col in encoded_features if col != var]
        X_train_sub = X_train[cols_to_use]
        X_test_sub = X_test[cols_to_use]
        
        rf_sub = RandomForestClassifier(random_state=42, n_estimators=50)
        rf_sub.fit(X_train_sub, y_train)
        sub_acc = accuracy_score(y_test, rf_sub.predict(X_test_sub))
        
        drop = baseline_acc - sub_acc
        drop_pct = (drop / baseline_acc) * 100 if baseline_acc > 0 else 0.0
        loo_impacts[var] = (drop, drop_pct)

    print("--- COMPARISON METRICS FOR 9 VARIABLES ---")
    print(f"{'Variable':<12} | {'RF Gini Importance':<18} | {'Pearson Corr (target)':<21} | {'LOO Drop (Acc)':<14} | {'LOO Drop %':<10}")
    print("-" * 78)
    for var in variables:
        gini = feat_importances.get(var, 0.0)
        corr = correlations.get(var, 0.0)
        drop, drop_pct = loo_impacts.get(var, (0.0, 0.0))
        corr_str = f"{corr:+.4f}"
        print(f"{var:<12} | {gini:<18.4f} | {corr_str:<21} | {drop:<14.4f} | {drop_pct:<10.1f}%")

if __name__ == "__main__":
    main()
