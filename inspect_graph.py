from backend.graph.client import Neo4jClient
c = Neo4jClient()
s = c.session()

print("=== PATIENT NODE SAMPLE ===")
r = s.run('MATCH (n:KnowledgeAsset:Patient) RETURN n LIMIT 1')
for rec in r:
    print(dict(rec["n"]))

print("\n=== LAB METRIC NODE SAMPLE ===")
r = s.run('MATCH (n:KnowledgeAsset:LaboratoryMetric) RETURN n LIMIT 1')
for rec in r:
    print(dict(rec["n"]))

print("\n=== EDGE TYPES ===")
r = s.run('MATCH (a)-[r]->(b) RETURN type(r) as rtype, count(r) as cnt ORDER BY cnt DESC LIMIT 10')
for rec in r:
    print(dict(rec))

print("\n=== DATASET METADATA ===")
r = s.run('MATCH (n:DatasetMetadata) RETURN n LIMIT 1')
for rec in r:
    print(dict(rec["n"]))

s.close()
