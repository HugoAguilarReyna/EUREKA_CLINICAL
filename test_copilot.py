import requests
import json

questions = [
    "How many records exist?",
    "How many columns exist?",
    "What target variable was detected?",
    "What variables are most relevant?",
    "What anomalies exist?",
    "Summarize the dataset",
    "Why was this graph built?",
    "What discovery is most important?"
]

print("Testing Copilot on Port 8001...")
for q in questions:
    res = requests.post("http://localhost:8001/knowledge/copilot/ask", json={"question": q})
    print(f"\nQ: {q}")
    if res.status_code == 200:
        print(f"A: {res.json().get('answer', '')}")
    else:
        print(f"Error: {res.status_code} - {res.text}")

print("\nFetching Analytics Summary...")
res = requests.get("http://localhost:8001/graph/analytics/summary")
if res.status_code == 200:
    print("Dataset Summary:")
    print(json.dumps(res.json().get("dataset_summary", {}), indent=2))
    print("\nBusiness Discoveries:")
    print(json.dumps(res.json().get("business_discoveries", []), indent=2))
else:
    print(f"Error: {res.status_code} - {res.text}")
