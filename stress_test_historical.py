import asyncio
import json
import copy
from datetime import datetime, timedelta
import motor.motor_asyncio
from beanie import init_beanie
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.db.config import settings
from backend.models.domain import Patient, Case
from backend.models.memory import EpisodicMemoryRecord
from backend.models.intelligence import DecisionInsightRecord, MinedRuleRecord
from backend.intelligence.dataset_memory import DatasetHistoryRecord, DatasetMemoryEngine
from backend.intelligence.comparison_engine import ComparisonEngine
from backend.intelligence.validation_engine import ValidationEngine

# We will directly run comparisons inside this script and evaluate the confusion matrix
async def run_stress_test():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[
            Patient,
            Case,
            EpisodicMemoryRecord,
            DecisionInsightRecord,
            MinedRuleRecord,
            DatasetHistoryRecord
        ]
    )
    
    print("Clearing DatasetHistory...")
    await DatasetHistoryRecord.find_all().delete()
    
    # 1. Register baseline via API to get the real initial state
    import requests
    res = requests.post('http://localhost:8000/knowledge/datasets/register?name=Dataset%20Base')
    if res.status_code != 200:
        print("Failed to register base dataset")
        return
        
    docs = await DatasetHistoryRecord.find_all().sort("-created_at").to_list()
    base_doc = docs[0]
    
    # We will generate 20 snapshots
    # Scenarios:
    # A. Estable (<1%)
    # B. Ruido (1-2%)
    # C. Mejora leve (3-5%)
    # D. Mejora fuerte (10-20%)
    # E. Deterioro leve (3-5%)
    # F. Deterioro critico (10-30%)
    # G. Aparicion de riesgo
    # H. Desaparicion de riesgo
    
    scenarios = [
        {"name": "Estable 1", "type": "A", "mult": 1.005},
        {"name": "Ruido 1", "type": "B", "mult": 1.015},
        {"name": "Ruido 2", "type": "B", "mult": 0.985},
        {"name": "Mejora Leve", "type": "C", "mult": 0.96},
        {"name": "Deterioro Leve", "type": "E", "mult": 1.04},
        {"name": "Ruido 3", "type": "B", "mult": 1.01},
        {"name": "Mejora Fuerte", "type": "D", "mult": 0.85},
        {"name": "Ruido 4", "type": "B", "mult": 0.99},
        {"name": "Deterioro Critico 1", "type": "F", "mult": 1.25},
        {"name": "Estable 2", "type": "A", "mult": 1.002},
        {"name": "Aparicion Riesgo 1", "type": "G", "mult": 1.0, "new_risk": True},
        {"name": "Ruido 5", "type": "B", "mult": 1.012},
        {"name": "Deterioro Leve 2", "type": "E", "mult": 1.035},
        {"name": "Mejora Fuerte 2", "type": "D", "mult": 0.80},
        {"name": "Ruido 6", "type": "B", "mult": 1.018},
        {"name": "Estable 3", "type": "A", "mult": 0.995},
        {"name": "Desaparicion Riesgo", "type": "H", "mult": 1.0, "drop_risk": True},
        {"name": "Deterioro Critico 2", "type": "F", "mult": 1.30},
        {"name": "Mejora Leve 2", "type": "C", "mult": 0.95},
        {"name": "Ruido 7", "type": "B", "mult": 0.988}
    ]
    
    previous_doc = base_doc
    current_time = base_doc.created_at
    snapshots = [base_doc]
    
    print("Generating 20 snapshots...")
    for i, scen in enumerate(scenarios):
        new_doc = copy.deepcopy(previous_doc)
        new_doc.id = None
        new_doc.dataset_id = f"SNAP_TEST_{i}"
        new_doc.dataset_name = scen["name"]
        current_time += timedelta(days=7)
        new_doc.created_at = current_time
        
        # Mutate
        target_insight = next((ins for ins in new_doc.insights if "Bilirrubina Directa" in ins.get("title", "")), None)
        if target_insight:
            target_insight["affected_population"] = int(target_insight["affected_population"] * scen["mult"])
            
        if scen.get("new_risk"):
            new_doc.insights.append({
                "id": "risk_x",
                "title": "Nuevo Marcador Severo Detectado",
                "affected_population": int(new_doc.rows * 0.15),
                "severity": "HIGH",
                "next_analysis_suggested": "Atencion inmediata a nuevo marcador."
            })
            
        if scen.get("drop_risk"):
            new_doc.insights = [ins for ins in new_doc.insights if "Nuevo Marcador" not in ins.get("title", "")]
            
        await new_doc.insert()
        snapshots.append(new_doc)
        previous_doc = new_doc
        
    print("Running ComparisonEngine on all consecutive pairs...")
    comp_engine = ComparisonEngine()
    
    TP, TN, FP, FN = 0, 0, 0, 0
    comparison_results = []
    
    for i in range(1, len(snapshots)):
        snap_a = snapshots[i-1]
        snap_b = snapshots[i]
        scenario = scenarios[i-1]
        
        findings = comp_engine.compare_snapshots(snap_a, snap_b)
        
        # We know exactly what SHOULD have been alerted
        # Alertable changes: C, D, E, F, G, H
        # Non-alertable (Noise/Stable): A, B
        
        should_alert = scenario["type"] in ["C", "D", "E", "F", "G", "H"]
        did_alert = False
        
        # Check if the specific finding was alerted
        alerted_titles = [f.finding for f in findings]
        
        if scenario.get("new_risk") or scenario.get("drop_risk"):
            did_alert = any("Nuevo Marcador" in t for t in alerted_titles)
        else:
            did_alert = any("Bilirrubina Directa" in t for t in alerted_titles)
            
        if should_alert and did_alert: TP += 1
        elif should_alert and not did_alert: FN += 1
        elif not should_alert and did_alert: FP += 1
        elif not should_alert and not did_alert: TN += 1
        
        comparison_results.append({
            "older": snap_a.dataset_name,
            "newer": snap_b.dataset_name,
            "scenario": scenario["type"],
            "expected_alert": should_alert,
            "did_alert": did_alert,
            "findings": [f.model_dump() for f in findings]
        })
        
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0
    recall = TP / (TP + FN) if (TP + FN) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    fpr = FP / (FP + TN) if (FP + TN) > 0 else 0
    fnr = FN / (FN + TP) if (FN + TP) > 0 else 0
    
    metrics = {
        "TP": TP, "TN": TN, "FP": FP, "FN": FN,
        "Precision": round(precision, 4),
        "Recall": round(recall, 4),
        "F1": round(f1, 4),
        "FPR": round(fpr, 4),
        "FNR": round(fnr, 4)
    }
    
    os.makedirs("/app/artifacts/audit", exist_ok=True)
    with open("/app/artifacts/audit/comparison_matrix.json", "w") as f:
        json.dump(comparison_results, f, indent=2)
        
    with open("/app/artifacts/audit/validation_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    with open("/app/artifacts/audit/validation_metrics.log", "w") as f:
        f.write(f"Validation Engine Confusion Matrix:\\n")
        f.write(f"TP: {TP} | FP: {FP}\\n")
        f.write(f"FN: {FN} | TN: {TN}\\n\\n")
        f.write(f"Precision: {precision*100:.2f}%\\n")
        f.write(f"Recall: {recall*100:.2f}%\\n")
        f.write(f"FPR: {fpr*100:.2f}%\\n")
        
    print("Stress test completed.")
    print("Metrics:", metrics)

if __name__ == "__main__":
    asyncio.run(run_stress_test())
