import requests
import json
import sys

def get_data(url):
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def run_audit():
    print("Fetching summary...")
    summary = get_data("http://localhost:8001/graph/analytics/summary")
    print("Fetching rules...")
    rules = get_data("http://localhost:8001/knowledge/intelligence/rules")
    print("Fetching insights...")
    insights = get_data("http://localhost:8001/knowledge/intelligence/insights")

    with open("d:/antigravity/Eureka/Actividad1/artifacts/audit/reality_audit.json", "w", encoding="utf-8") as f:
        json.dump({
            "summary": summary,
            "rules_count": len(rules) if rules else 0,
            "rules_sample": rules[:2] if rules else [],
            "insights_count": len(insights) if insights else 0,
            "insights_sample": insights[:2] if insights else []
        }, f, indent=2, ensure_ascii=False)
    print("Reality audit data saved.")

if __name__ == "__main__":
    run_audit()
