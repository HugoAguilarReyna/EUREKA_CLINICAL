from backend.graph.client import Neo4jClient
import json

c = Neo4jClient()
with c.session() as s:
    # Get a full patient node
    r = s.run("MATCH (p:KnowledgeAsset:Patient {id:'Patient_5'}) RETURN p LIMIT 1")
    rec = r.single()
    if rec:
        print("PATIENT NODE:")
        d = dict(rec["p"])
        for k, v in d.items():
            print(f"  {k}: {v} ({type(v).__name__})")
    
    # Get measurements for this patient
    r2 = s.run("""
        MATCH (p:KnowledgeAsset:Patient {id:'Patient_5'})
        -[:HAS_MEASUREMENT]->(m:KnowledgeAsset:LaboratoryMetric)
        RETURN m.metric_name as name, m.value as val, m.semantic_name as sem
        LIMIT 15
    """)
    print("\nMEASUREMENTS:")
    for rec2 in r2:
        print(f"  {rec2['name']} ({rec2['sem']}): {rec2['val']}")
    
    # Check ClinicalState relationships
    r3 = s.run("MATCH (s:ClinicalState) RETURN s LIMIT 3")
    print("\nCLINICAL STATE NODES:")
    for rec3 in r3:
        d3 = dict(rec3["s"])
        print(f"  {d3}")
    
    # Check if DatasetMetadata has target_distribution parsed
    r4 = s.run("MATCH (n:DatasetMetadata {id:'Dataset_Metadata_Global'}) RETURN n.target_distribution as td, n.column_statistics as cs")
    rec4 = r4.single()
    if rec4:
        td = rec4["td"]
        print(f"\nTARGET_DISTRIBUTION raw type: {type(td).__name__}")
        print(f"First 100 chars: {str(td)[:100]}")
