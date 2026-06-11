import requests
import json
import time

BASE_URL = "http://localhost:8001"

def run_validation():
    print("=== CASE 1: UPLOAD ===")
    file_path = "act_liver_disease.csv"
    with open(file_path, "rb") as f:
        files = {"file": ("act_liver_disease.csv", f, "text/csv")}
        res = requests.post(f"{BASE_URL}/knowledge/upload", files=files)
    upload_data = res.json()
    print("Upload Preview:", upload_data)
    
    job_id = upload_data.get("job_id")
    if not job_id:
        print("Failed to get job_id")
        return
        
    print("\n=== CASE 2: ONTOLOGY BUILD ===")
    res = requests.post(f"{BASE_URL}/knowledge/jobs/{job_id}/build")
    build_data = res.json()
    print("Build Result:", build_data)
    
    time.sleep(2) # let it persist
    
    print("\n=== CASE 3: NEO4J POPULATION ===")
    from neo4j import GraphDatabase
    driver = GraphDatabase.driver('bolt://localhost:7688', auth=('neo4j', 'eureka_secret'))
    with driver.session() as session:
        result = session.run("MATCH (n) RETURN count(n) as c")
        for record in result:
            print("Total Nodes in Neo4j:", record["c"])
            
    print("\n=== CASE 4: ANALYTICS ===")
    res = requests.get(f"{BASE_URL}/graph/analytics/top-assets")
    print("Top Assets (Centrality):")
    if res.status_code == 200:
        for a in res.json()[:5]:
            print(f"- {a['asset_id']}: {a['global_score']:.2f} (PR: {a['pagerank']:.4f})")
    else:
        print("Failed:", res.text)
        
    print("\n=== CASE 8: COPILOT ===")
    res = requests.post(f"{BASE_URL}/knowledge/copilot", json={"question": "How many patients exist in the dataset?"})
    print("Copilot Response:", res.json())

if __name__ == "__main__":
    run_validation()
