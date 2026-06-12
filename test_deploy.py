import urllib.request
import json
import time

url = 'https://eureka-backend-vedn.onrender.com/knowledge/semantic/graph?level=2'
print(f"Waiting for Render to deploy the new Tactical Graph Aggregation Engine...")
print(f"Polling {url} every 20 seconds...")

for i in range(15):
    try:
        req = urllib.request.Request(url)
        start_time = time.time()
        with urllib.request.urlopen(req) as response:
            data = response.read().decode('utf-8')
            latency = (time.time() - start_time) * 1000
            
            payload = json.loads(data)
            meta = payload.get('metadata', {})
            
            # Check if our new metadata structure is present
            if 'payload_size_mb' in meta:
                nodes = len(payload.get('nodes', []))
                edges = len(payload.get('edges', []))
                print("\n✅ DEPLOYMENT DETECTED! NEW RESULTS:")
                print("==================================================")
                print(f"Latency:             {latency:.2f} ms")
                print(f"Nodes:               {nodes}")
                print(f"Edges:               {edges}")
                print(f"Payload Size (MB):   {meta.get('payload_size_mb')}")
                print(f"Truncated:           {meta.get('truncated')}")
                print(f"Aggregation Enabled: {meta.get('aggregation_enabled')}")
                print(f"Community Count:     {meta.get('community_count')}")
                print(f"Density:             {meta.get('density')}")
                print("==================================================")
                exit(0)
            else:
                print(f"[{i+1}/15] Still old version (No payload_size_mb). Latency: {latency:.2f} ms")
    except Exception as e:
        print(f"[{i+1}/15] Error or warmup: {e}")
        
    time.sleep(20)

print("\nTimeout waiting for deployment.")
