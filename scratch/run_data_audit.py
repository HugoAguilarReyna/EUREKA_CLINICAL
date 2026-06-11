import requests
import json
import time
import os

os.makedirs("d:/antigravity/Eureka/Actividad1/artifacts/audit", exist_ok=True)

endpoints = {
    "summary": "http://localhost:8001/graph/analytics/summary",
    "insights": "http://localhost:8001/knowledge/intelligence/insights",
    "rules": "http://localhost:8001/knowledge/intelligence/rules",
    "simulate": "http://localhost:8001/knowledge/intelligence/simulate",
    "explain": "http://localhost:8001/knowledge/explain/Patient_5",
    "trace": "http://localhost:8001/knowledge/trace/Patient_5",
    "influence": "http://localhost:8001/graph/analytics/influence/DB",
    "heatmap": "http://localhost:8001/graph/analytics/heatmap",
    "sankey": "http://localhost:8001/graph/analytics/sankey"
}

results = {}

for name, url in endpoints.items():
    print(f"Testing {name} at {url}...")
    t0 = time.time()
    try:
        r = requests.get(url, timeout=10)
        latency = (time.time() - t0) * 1000
        if r.status_code == 200:
            data = r.json()
            # Calculate record counts
            record_count = 0
            if isinstance(data, list):
                record_count = len(data)
            elif isinstance(data, dict):
                if "nodes" in data:
                    record_count = len(data["nodes"])
                elif "correlation_comparison" in data:
                    record_count = len(data["correlation_comparison"])
                elif "contributing_factors" in data:
                    record_count = len(data["contributing_factors"])
                else:
                    record_count = len(data)
            
            results[name] = {
                "url": url,
                "status_code": r.status_code,
                "latency_ms": round(latency, 2),
                "payload_size_bytes": len(r.text),
                "record_count": record_count,
                "preview": str(data)[:300] + "..."
            }
            # Save raw response
            with open(f"d:/antigravity/Eureka/Actividad1/artifacts/audit/{name}_response.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        else:
            results[name] = {
                "url": url,
                "status_code": r.status_code,
                "error": r.text
            }
    except Exception as e:
        results[name] = {
            "url": url,
            "error": str(e)
        }

# Copilot Audit
copilot_questions = [
    "¿Cuántos pacientes existen?",
    "¿Cuáles son las variables más importantes?",
    "¿Qué hallazgos encontraste?",
    "¿Qué riesgos detectaste?",
    "¿Qué evidencia respalda esos hallazgos?",
    "¿Qué acción recomendarías investigar?",
    "¿Por qué construiste este grafo?",
    "Resume el dataset."
]

copilot_url = "http://localhost:8001/knowledge/copilot/ask"
copilot_results = []

for q in copilot_questions:
    print(f"Asking Copilot: {q}...")
    t0 = time.time()
    try:
        r = requests.post(copilot_url, json={"question": q}, timeout=10)
        latency = (time.time() - t0) * 1000
        if r.status_code == 200:
            data = r.json()
            copilot_results.append({
                "question": q,
                "answer": data.get("answer", ""),
                "latency_ms": round(latency, 2),
                "data_preview": str(data.get("data"))[:200] + "..." if data.get("data") else None
            })
        else:
            copilot_results.append({
                "question": q,
                "error": r.text,
                "latency_ms": round(latency, 2)
            })
    except Exception as e:
        copilot_results.append({
            "question": q,
            "error": str(e)
        })

audit_summary = {
    "endpoints": results,
    "copilot": copilot_results
}

with open("d:/antigravity/Eureka/Actividad1/artifacts/audit/data_audit_summary.json", "w", encoding="utf-8") as f:
    json.dump(audit_summary, f, indent=2, ensure_ascii=False)

print("Data audit done. Saved to artifacts/audit/data_audit_summary.json")
