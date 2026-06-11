import asyncio
import os
import sys
import random
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.database import init_db
from backend.explainability.clinical_explainability import ClinicalExplainabilityEngine
from backend.intelligence.risk_engine import get_neo4j_df

async def main():
    await init_db()
    df = get_neo4j_df()
    if df.empty:
        print("Empty dataset.")
        return
        
    pids = df["patient_id"].tolist()
    random.seed(42)  # For reproducibility
    selected_pids = random.sample(pids, min(20, len(pids)))
    
    explainer = ClinicalExplainabilityEngine()
    
    print("--- 20 PATIENT EXPLANATIONS AUDIT ---")
    for pid in selected_pids:
        exp = explainer.explain(pid)
        if "error" in exp:
            print(f"Error for {pid}: {exp['error']}")
            continue
            
        print(f"Patient ID: {exp['patient_id']}")
        print(f"Age/Gender: {exp['age']} / {exp['gender']}")
        print(f"Classification: {exp['classification']}")
        print(f"Confidence: {exp['confidence']}")
        print(f"Factors Count: {exp['factor_count']}")
        print(f"Narrative: {exp['clinical_narrative']}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
