import os
import sys
import json
import traceback

sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.graph.client import Neo4jClient
    
    neo4j = Neo4jClient()
    
    results = {}
    with neo4j.session() as session:
        # Total nodes
        res = session.run("MATCH (n) RETURN count(n) AS nodes").single()
        results["total_nodes"] = res["nodes"]
        
        # Total relationships
        res = session.run("MATCH ()-[r]->() RETURN count(r) AS rels").single()
        results["total_rels"] = res["rels"]
        
        # Labels
        res = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(*) as count ORDER BY count DESC")
        results["labels"] = [{"label": r["label"], "count": r["count"]} for r in res]
        
        # Relationships
        res = session.run("MATCH ()-[r]->() RETURN type(r) AS type, count(*) as count ORDER BY count DESC")
        results["relationships"] = [{"type": r["type"], "count": r["count"]} for r in res]
        
    print(json.dumps(results, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}, indent=2))
