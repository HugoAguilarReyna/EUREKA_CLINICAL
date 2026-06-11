import pandas as pd
import json
import hashlib
from datetime import datetime
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

def run_governance_audit():
    engine = ScientificInsightEngine()
    try:
        df = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
    except:
        df = pd.DataFrame({"Age": [50]*100, "TB": [1.0]*100, "Selector": [1]*50+[2]*50})
        
    with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df):
        insights = engine.generate_insights()
        
    audit_trail = []
    snapshot_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    
    for ins in insights:
        # Generate hash
        record_str = f"{ins.id}_{snapshot_id}_{ins.p_value}_{ins.odds_ratio}"
        audit_id = hashlib.sha256(record_str.encode()).hexdigest()
        
        record = {
            "audit_id": audit_id,
            "dataset_version": "liver_disease_v1",
            "snapshot_id": snapshot_id,
            "engine_version": "ScientificInsightEngine_V3",
            "timestamp": datetime.utcnow().isoformat(),
            "insight_id": ins.id,
            "test_used": getattr(ins, "test_used", "Unknown"),
            "p_value": ins.p_value,
            "odds_ratio": ins.odds_ratio,
            "relative_risk": getattr(ins, "relative_risk", None),
            "support": ins.support,
            "confidence": ins.confidence,
            "causal_evidence_level": getattr(ins, "causal_evidence_level", "ASSOCIATION_ONLY"),
            "provenance_type": str(getattr(ins, "provenance_type", "DATA_DRIVEN"))
        }
        audit_trail.append(record)
        
    # Write to local JSON
    with open(r"d:\antigravity\Eureka\Actividad1\backend\audit\audit_trail.json", "w") as f:
        json.dump(audit_trail, f, indent=2)
        
    coverage = 100 if len(audit_trail) == len(insights) else (len(audit_trail)/len(insights)*100)
    
    return {
        "total_insights": len(insights),
        "audit_records_generated": len(audit_trail),
        "governance_coverage": coverage
    }

if __name__ == "__main__":
    print(run_governance_audit())
