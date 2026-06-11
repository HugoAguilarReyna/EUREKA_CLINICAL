import pandas as pd
import json

def verify_claims():
    df = pd.read_csv('/app/act_liver_disease.csv')
    with open('/app/claims_inventory.json', 'r') as f:
        claims = json.load(f)
        
    results = []
    
    for c in claims:
        raw = c['raw']
        variables = raw['supporting_variables']
        evidence = raw['evidence']
        
        # Determine variable and condition
        # Example: "DB > P75" or "ALB < P25"
        cond = evidence[0]
        var_name = variables[0]
        
        if ">" in cond:
            threshold_type = "P75"
            threshold_val = df[var_name].quantile(0.75)
            mask_var = df[var_name] > threshold_val
        elif "<" in cond:
            threshold_type = "P25"
            threshold_val = df[var_name].quantile(0.25)
            mask_var = df[var_name] < threshold_val
        else:
            continue
            
        # target condition: Selector = Enfermo -> Selector == 1
        mask_target = df['Selector'] == 1
        
        # Ground Truth Recalculation
        gt_affected_population = mask_var.sum()
        gt_evidence_count = (mask_var & mask_target).sum()
        
        # Claim Values
        claim_affected = raw['affected_population']
        claim_evidence = raw['evidence_count']
        
        # Validation
        affected_diff = abs(gt_affected_population - claim_affected)
        evidence_diff = abs(gt_evidence_count - claim_evidence)
        
        status = "VERIFIED"
        if affected_diff > 0 or evidence_diff > 0:
            status = "FAILED"
            
        results.append({
            "claim_id": raw['id'],
            "variable": var_name,
            "threshold": float(threshold_val),
            "claim_affected": claim_affected,
            "gt_affected": int(gt_affected_population),
            "claim_evidence": claim_evidence,
            "gt_evidence": int(gt_evidence_count),
            "status": status
        })
        
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    verify_claims()
