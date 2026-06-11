import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.graph.client import Neo4jClient
import pandas as pd

client = Neo4jClient()
with client.session() as session:
    result = session.run("""
        MATCH (p:KnowledgeAsset:Patient)-[:HAS_MEASUREMENT]->(m:KnowledgeAsset:LaboratoryMetric)
        RETURN p.id as patient_id, p.Age as Age, p.Gender as Gender, m.metric_name as metric_name, m.value as value
    """)
    records = []
    for rec in result:
        records.append({
            "patient_id": rec["patient_id"],
            "Age": rec["Age"],
            "Gender": rec["Gender"],
            "metric_name": rec["metric_name"],
            "value": rec["value"]
        })

print(f"Total raw records fetched: {len(records)}")
if records:
    df = pd.DataFrame(records)
    # Convert value to numeric
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df_pivot = df.pivot_table(index=["patient_id", "Age", "Gender"], columns="metric_name", values="value").reset_index()
    print("DataFrame columns:", df_pivot.columns.tolist())
    print("DataFrame shape:", df_pivot.shape)
    print(df_pivot.head(5))
else:
    print("No records found.")
