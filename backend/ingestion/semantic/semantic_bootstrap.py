"""
Sprint 3D.5 — Semantic Intelligence Bootstrap
Recalculates correlations from the real CSV file and persists them in Neo4j DatasetMetadata node.
Also extracts per-variable statistics for the Copilot to use.
"""
import os
import glob
import json
import pandas as pd
import numpy as np
from backend.graph.client import Neo4jClient

def find_latest_csv():
    """Find the most recently uploaded CSV file."""
    upload_dir = "/app/data/uploads"
    if not os.path.exists(upload_dir):
        return None
    csvs = glob.glob(os.path.join(upload_dir, "*.csv"))
    if not csvs:
        return None
    return max(csvs, key=os.path.getmtime)

def compute_column_stats(df: pd.DataFrame, target_col: str):
    """Compute per-column statistics."""
    stats = {}
    for col in df.columns:
        if col == target_col:
            continue
        col_data = df[col].dropna()
        if pd.api.types.is_numeric_dtype(df[col]):
            q1 = float(col_data.quantile(0.25))
            q3 = float(col_data.quantile(0.75))
            iqr = q3 - q1
            outliers = int(((col_data < (q1 - 1.5 * iqr)) | (col_data > (q3 + 1.5 * iqr))).sum())
            stats[col] = {
                "mean": float(col_data.mean()),
                "std": float(col_data.std()),
                "min": float(col_data.min()),
                "max": float(col_data.max()),
                "q25": q1,
                "q75": q3,
                "outliers": outliers,
                "missing": int(df[col].isnull().sum()),
                "type": "numeric"
            }
        else:
            stats[col] = {
                "unique_values": int(df[col].nunique()),
                "top_value": str(df[col].mode().iloc[0]) if not df[col].mode().empty else "",
                "missing": int(df[col].isnull().sum()),
                "type": "categorical"
            }
    return stats

def main():
    csv_path = find_latest_csv()
    if not csv_path:
        print("No CSV found in /app/data/uploads")
        return
    
    print(f"Processing: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {list(df.columns)}")
    
    # Detect target
    target_col = None
    target_keywords = ['target', 'label', 'class', 'selector', 'outcome']
    for col in df.columns:
        if col.lower() in target_keywords:
            target_col = col
            break
    if not target_col:
        for col in reversed(list(df.columns)):
            if df[col].nunique() == 2:
                target_col = col
                break
    
    print(f"Target detected: {target_col}")
    
    # Compute correlations with target
    correlations = []
    if target_col and pd.api.types.is_numeric_dtype(df[target_col]):
        numeric_df = df.select_dtypes(include=[np.number])
        if target_col in numeric_df.columns:
            corr_series = numeric_df.corr(method='pearson')[target_col].drop(target_col, errors='ignore')
            for feat, val in corr_series.items():
                if pd.notnull(val):
                    correlations.append({
                        "feature": feat,
                        "correlation": round(float(val), 4)
                    })
            correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    
    print(f"Correlations computed: {len(correlations)}")
    for c in correlations[:5]:
        print(f"  {c['feature']}: {c['correlation']}")
    
    # Compute per-column stats
    col_stats = compute_column_stats(df, target_col)
    
    # Target distribution
    target_dist = {}
    if target_col:
        counts = df[target_col].value_counts()
        total = len(df)
        for val, cnt in counts.items():
            target_dist[str(val)] = {
                "count": int(cnt),
                "percentage": round(float(cnt/total*100), 1)
            }
    
    # Missing values per column
    missing_counts = df.isnull().sum().to_dict()
    
    # Persist to Neo4j
    client = Neo4jClient()
    with client.session() as session:
        # Update DatasetMetadata
        query = """
        MERGE (n:DatasetMetadata {id: 'Dataset_Metadata_Global'})
        SET n.highly_correlated_features = $correlations,
            n.column_statistics = $col_stats,
            n.target_candidate = $target_col,
            n.target_distribution = $target_dist,
            n.rows = $rows,
            n.columns = $cols,
            n.missing_per_column = $missing_per_col,
            n.file_name = $file_name,
            n.semantic_enriched = true,
            n.enriched_at = datetime()
        """
        session.run(query,
            correlations=json.dumps(correlations),
            col_stats=json.dumps(col_stats),
            target_col=target_col or "Unknown",
            target_dist=json.dumps(target_dist),
            rows=len(df),
            cols=len(df.columns),
            missing_per_col=json.dumps({k: int(v) for k, v in missing_counts.items()}),
            file_name=os.path.basename(csv_path)
        )
        print("DatasetMetadata persisted to Neo4j.")
        
        # Create clinical state nodes: High/Low per variable
        print("Creating clinical state nodes...")
        states_created = 0
        for feat, stats in col_stats.items():
            if stats["type"] == "numeric":
                q25 = stats["q25"]
                q75 = stats["q75"]
                
                # Create High state node
                q_high = f"""
                MERGE (s:ClinicalState {{id: 'ClinicalState_High_{feat}'}})
                SET s.name = 'High {feat}',
                    s.variable = $feat,
                    s.threshold = $q75,
                    s.direction = 'high',
                    s.created_at = datetime()
                """
                session.run(q_high, feat=feat, q75=q75)
                states_created += 1
                
                # Create Low state node
                q_low = f"""
                MERGE (s:ClinicalState {{id: 'ClinicalState_Low_{feat}'}})
                SET s.name = 'Low {feat}',
                    s.variable = $feat,
                    s.threshold = $q25,
                    s.direction = 'low',
                    s.created_at = datetime()
                """
                session.run(q_low, feat=feat, q25=q25)
                states_created += 1
        
        print(f"Clinical states created: {states_created}")
        
        # Compute disease association strength per variable
        print("Computing association strengths...")
        # Load target per patient
        if target_col:
            target_values = df[target_col].tolist()
            diseased_indices = set(i for i, v in enumerate(target_values) if v == 1 or v == '1' or v == 'yes' or v == 'Yes')
            total_diseased = len(diseased_indices)
            total_healthy = len(df) - total_diseased
            
            for feat in col_stats:
                if col_stats[feat]["type"] == "numeric" and feat in df.columns:
                    q75 = col_stats[feat]["q75"]
                    q25 = col_stats[feat]["q25"]
                    feat_col = df[feat]
                    
                    # Patients with HIGH value
                    high_idx = set(feat_col[feat_col > q75].index.tolist())
                    high_diseased = len(high_idx & diseased_indices)
                    high_total = len(high_idx)
                    high_rate = high_diseased / high_total if high_total > 0 else 0
                    
                    # Patients with LOW value
                    low_idx = set(feat_col[feat_col < q25].index.tolist())
                    low_diseased = len(low_idx & diseased_indices)
                    low_total = len(low_idx)
                    low_rate = low_diseased / low_total if low_total > 0 else 0
                    
                    # Get correlation for this feature
                    feat_corr = next((c["correlation"] for c in correlations if c["feature"] == feat), 0)
                    
                    # Update high state
                    session.run("""
                        MERGE (s:ClinicalState {id: $state_id})
                        SET s.disease_rate = $rate,
                            s.patient_count = $count,
                            s.correlation = $corr
                    """, state_id=f"ClinicalState_High_{feat}",
                         rate=round(high_rate, 3),
                         count=high_total,
                         corr=round(abs(feat_corr), 4))
                    
                    # Update low state
                    session.run("""
                        MERGE (s:ClinicalState {id: $state_id})
                        SET s.disease_rate = $rate,
                            s.patient_count = $count,
                            s.correlation = $corr
                    """, state_id=f"ClinicalState_Low_{feat}",
                         rate=round(low_rate, 3),
                         count=low_total,
                         corr=round(abs(feat_corr), 4))
        
        # Verify
        result = session.run("MATCH (n:DatasetMetadata {id: 'Dataset_Metadata_Global'}) RETURN n.rows as rows, n.highly_correlated_features as corr")
        rec = result.single()
        print(f"\nVerification:")
        print(f"  Rows stored: {rec['rows']}")
        corr_data = json.loads(rec['corr']) if rec['corr'] else []
        print(f"  Correlations stored: {len(corr_data)}")
        for c in corr_data[:3]:
            print(f"    {c['feature']}: {c['correlation']}")
            
        states_count = session.run("MATCH (n:ClinicalState) RETURN count(n) as cnt").single()["cnt"]
        print(f"  ClinicalState nodes: {states_count}")

    print("\nSprint 3D.5 Bootstrap complete!")

if __name__ == "__main__":
    main()
