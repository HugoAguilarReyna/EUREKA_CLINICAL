import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.intelligence.risk_engine import get_neo4j_df
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pandas as pd
import numpy as np

df = get_neo4j_df()
if df.empty:
    print("DataFrame is empty.")
    sys.exit()

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
print(f"Baseline Accuracy: {baseline_acc:.4f}")

# LOO
for f in features:
    # Drop f from X (handle one-hot encoded cols if it's Gender)
    if f == "Gender":
        cols_to_use = [col for col in encoded_features if not col.startswith("Gender_")]
    else:
        cols_to_use = [col for col in encoded_features if col != f]
        
    X_train_sub = X_train[cols_to_use]
    X_test_sub = X_test[cols_to_use]
    
    rf_sub = RandomForestClassifier(random_state=42, n_estimators=50)
    rf_sub.fit(X_train_sub, y_train)
    sub_acc = accuracy_score(y_test, rf_sub.predict(X_test_sub))
    drop = baseline_acc - sub_acc
    drop_pct = (drop / baseline_acc) * 100 if baseline_acc > 0 else 0
    print(f"Drop without {f}: {drop:.4f} ({drop_pct:.1f}%)")
