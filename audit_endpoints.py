import urllib.request
import urllib.error
import json
import time

endpoints = [
    ("/knowledge/intelligence/insights", "GET"),
    ("/knowledge/intelligence/rules", "GET"),
    ("/knowledge/cohorts/communities", "GET"),
    ("/knowledge/patterns/timeline", "GET"),
    ("/knowledge/sankey/propagation", "GET"),
    ("/knowledge/semantic/graph?level=1", "GET"),
    ("/knowledge/semantic/graph?level=2", "GET"),
    ("/knowledge/semantic/graph?level=3", "GET")
]

BASE_URL = "https://eureka-backend-vedn.onrender.com"

results = {}

for path, method in endpoints:
    url = BASE_URL + path
    req = urllib.request.Request(url, method=method)
    
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read().decode('utf-8')
            latency = (time.time() - start_time) * 1000
            
            try:
                payload = json.loads(data)
                
                # Try to count records if it's a list or has common array keys
                records = 0
                sample = None
                if isinstance(payload, list):
                    records = len(payload)
                    sample = payload[:1] if records > 0 else []
                elif isinstance(payload, dict):
                    if "nodes" in payload:
                        records = len(payload.get("nodes", [])) + len(payload.get("edges", []))
                        sample = {k: v[:1] if isinstance(v, list) else v for k, v in payload.items()}
                    elif "data" in payload and isinstance(payload["data"], list):
                        records = len(payload["data"])
                        sample = payload["data"][:1]
                    elif "insights" in payload:
                        records = len(payload["insights"])
                        sample = payload["insights"][:1]
                    else:
                        records = len(payload)
                        sample = payload
                        
                results[path] = {
                    "status": 200,
                    "latency_ms": round(latency, 2),
                    "records": records,
                    "empty": records == 0,
                    "sample": sample
                }
            except json.JSONDecodeError:
                results[path] = {
                    "status": 200,
                    "latency_ms": round(latency, 2),
                    "error": "Invalid JSON"
                }
                
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        data = e.read().decode('utf-8')
        results[path] = {
            "status": e.code,
            "latency_ms": round(latency, 2),
            "error": data
        }
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        results[path] = {
            "status": "ERROR",
            "latency_ms": round(latency, 2),
            "error": str(e)
        }

print(json.dumps(results, indent=2))
