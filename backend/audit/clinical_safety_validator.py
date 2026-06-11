import pandas as pd
from unittest.mock import patch
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

def run_clinical_safety_audit():
    engine = ScientificInsightEngine()
    try:
        df = pd.read_csv(r"d:\antigravity\Eureka\Actividad1\act_liver_disease.csv")
    except:
        df = pd.DataFrame({"Age": [50]*100, "TB": [1.0]*100, "Selector": [1]*50+[2]*50})
        
    with patch('backend.intelligence.scientific_insight_engine.get_neo4j_df', return_value=df):
        insights = engine.generate_insights()
        
    results = {
        "STATISTICALLY_VALID": 0,
        "CLINICALLY_PLAUSIBLE": 0,
        "CLINICALLY_ACTIONABLE": 0,
        "UNSUPPORTED": 0,
        "causal_claims_found": 0
    }
    
    known_biomarkers = ["TB", "DB", "Alkphos", "Sgpt", "Sgot", "ALB", "TP", "A/G Ratio"]
    prohibited_words = ["cause", "causes", "caused by", "cure", "cures", "cured", "guarantee", "guarantees", "predicts with certainty", "will certainly", "prescribe"]
    
    for ins in insights:
        valid = ins.p_value <= 0.05 and ins.odds_ratio >= 1.5
        plausible = valid and any(b in ins.variable for b in known_biomarkers)
        actionable = plausible and len(ins.recommendation) > 5
        
        if actionable:
            results["CLINICALLY_ACTIONABLE"] += 1
        elif plausible:
            results["CLINICALLY_PLAUSIBLE"] += 1
        elif valid:
            results["STATISTICALLY_VALID"] += 1
        else:
            results["UNSUPPORTED"] += 1
            
        text = f"{ins.finding} {ins.explanation} {ins.recommendation} {ins.why_care}".lower()
        for w in prohibited_words:
            if f" {w} " in text:
                results["causal_claims_found"] += 1
                
        if getattr(ins, "causal_evidence_level", "") == "CAUSALLY_SUPPORTED":
            # Engine currently hardcodes "ASSOCIATION_ONLY" or "HYPOTHESIS_GENERATING"
            results["causal_claims_found"] += 1
            
    return results

if __name__ == "__main__":
    print(run_clinical_safety_audit())
