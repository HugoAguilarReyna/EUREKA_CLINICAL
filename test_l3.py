import urllib.request
import json

url = 'https://eureka-backend-vedn.onrender.com/knowledge/semantic/graph?level=3&entity_type=Patient&entity_id=Patient_3'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        payload = json.loads(response.read().decode('utf-8'))
        nodes = payload.get('nodes', [])
        edges = payload.get('edges', [])
        print('Nodes:', len(nodes))
        print('Edges:', len(edges))
        if len(edges) > 0:
            edge_counts = {}
            for e in edges:
                pair = f"{e.get('src_id')}-{e.get('dst_id')}-{e.get('relationship_type')}"
                edge_counts[pair] = edge_counts.get(pair, 0) + 1
            print('Unique edges:', len(edge_counts))
            dups = {k:v for k,v in edge_counts.items() if v > 1}
            print('Duplicate examples (first 5):', list(dups.items())[:5])
except Exception as e:
    print(e)
