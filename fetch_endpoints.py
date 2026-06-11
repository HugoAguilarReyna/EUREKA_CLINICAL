import requests
import json
import os

ENDPOINTS = {
    "influence_db.json": "http://localhost:8001/graph/analytics/influence/DB",
    "heatmap.json": "http://localhost:8001/graph/analytics/heatmap",
    "sankey.json": "http://localhost:8001/graph/analytics/sankey"
}

OUT_DIR = "d:/antigravity/Eureka/Actividad1/artifacts/audit"

def fetch_endpoints():
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, url in ENDPOINTS.items():
        print(f"Fetching {url}...")
        try:
            res = requests.get(url, timeout=120)
            res.raise_for_status()
            out_path = os.path.join(OUT_DIR, filename)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2, ensure_ascii=False)
            print(f"Saved to {out_path}")
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")

if __name__ == "__main__":
    fetch_endpoints()
