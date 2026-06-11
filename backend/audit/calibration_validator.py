import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.calibration import calibration_curve

def expected_calibration_error(y_true, y_prob, n_bins=10):
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins)
    # Approximation of ECE
    ece = np.mean(np.abs(prob_true - prob_pred))
    return float(ece)

def run_calibration_audit():
    # Use the diabetes dataset for calibration test
    df = pd.read_csv("transfer_tests/diabetes.csv")
    df["target"] = df["Selector"].apply(lambda x: 1 if int(x) == 1 else 0)
    
    features = ["Glucose", "BMI", "Age"]
    X = df[features]
    y = df["target"]
    
    # Train Logistic Regression representing Eureka's underlying continuous score mechanics
    clf = LogisticRegression()
    clf.fit(X, y)
    probs = clf.predict_proba(X)[:, 1]
    
    roc_auc = roc_auc_score(y, probs)
    brier = brier_score_loss(y, probs)
    ece = expected_calibration_error(y, probs)
    
    return {
        "ROC-AUC": float(roc_auc),
        "Brier Score": float(brier),
        "Expected Calibration Error (ECE)": float(ece)
    }

if __name__ == '__main__':
    res = run_calibration_audit()
    print("Calibration Results:")
    for k, v in res.items():
        print(f"{k}: {v:.4f}")
