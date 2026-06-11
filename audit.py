import requests
import time
import json
import os

BASE_URL = "http://localhost:8001"

def format_bytes(size):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:3.1f} {unit}"
        size /= 1024.0

endpoints = [
    {"name": "Summary", "url": "/graph/analytics/summary", "method": "GET"},
    {"name": "Top Assets", "url": "/graph/analytics/top-assets", "method": "GET"},
    {"name": "Centrality", "url": "/graph/analytics/centrality", "method": "GET"},
    {"name": "Copilot Query 1", "url": "/knowledge/copilot/ask", "method": "POST", "body": {"question": "How many records exist?"}},
    {"name": "Copilot Query 2", "url": "/knowledge/copilot/ask", "method": "POST", "body": {"question": "What target variable was detected?"}},
    {"name": "Copilot Query 3", "url": "/knowledge/copilot/ask", "method": "POST", "body": {"question": "What variables are most relevant?"}},
    {"name": "Copilot Query 4", "url": "/knowledge/copilot/ask", "method": "POST", "body": {"question": "Summarize the dataset."}}
]

results = []

print("Starting API Audit...")

# Warmup to trigger caching
print("Running warmups...")
try:
    requests.get(BASE_URL + "/graph/analytics/summary")
except:
    pass

for endpoint in endpoints:
    url = BASE_URL + endpoint["url"]
    print(f"Testing {endpoint['name']} ({url})...")
    
    try:
        t0 = time.time()
        if endpoint["method"] == "GET":
            response = requests.get(url)
        else:
            response = requests.post(url, json=endpoint["body"])
        t1 = time.time()
        
        duration_ms = (t1 - t0) * 1000
        status_code = response.status_code
        payload_size = len(response.content)
        
        is_json = False
        data = None
        try:
            data = response.json()
            is_json = True
        except:
            pass
            
        nodes = 0
        edges = 0
        answer = ""
        
        if is_json and data:
            if "total_nodes" in data:
                nodes = data.get("total_nodes", 0)
                edges = data.get("total_edges", 0)
            elif isinstance(data, list):
                nodes = len(data)
            elif "answer" in data:
                answer = data["answer"]
                
        results.append({
            "name": endpoint["name"],
            "status": status_code,
            "duration_ms": duration_ms,
            "payload_size": format_bytes(payload_size),
            "nodes": nodes,
            "edges": edges,
            "answer": answer
        })
    except Exception as e:
        results.append({
            "name": endpoint["name"],
            "status": "ERROR",
            "duration_ms": 0,
            "payload_size": "0 B",
            "nodes": 0,
            "edges": 0,
            "answer": str(e)
        })

print("\n--- AUDIT RESULTS ---")
print(f"{'Endpoint':<20} | {'Status':<6} | {'Duration':<12} | {'Size':<10} | {'Nodes':<6} | {'Answer Preview'}")
print("-" * 80)
for r in results:
    ans = r['answer'][:40] + "..." if len(r['answer']) > 40 else r['answer']
    dur = f"{r['duration_ms']:.1f}ms"
    print(f"{r['name']:<20} | {r['status']:<6} | {dur:<12} | {r['payload_size']:<10} | {r['nodes']:<6} | {ans}")

with open("audit_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nDone.")
