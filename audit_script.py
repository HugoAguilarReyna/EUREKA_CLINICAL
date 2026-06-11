import os
import sys
import datetime
import subprocess

base_dir = r"d:\antigravity\Eureka\Actividad1"
venv_python = os.path.join(base_dir, "eureka-multiverse", ".venv", "Scripts", "python.exe")

print("# PASO 1 - Árbol completo de backend/graph")
for root, dirs, files in os.walk(os.path.join(base_dir, "backend", "graph")):
    level = root.replace(os.path.join(base_dir, "backend", "graph"), "").count(os.sep)
    indent = " " * 4 * level
    print(f"{indent}{os.path.basename(root)}/")
    subindent = " " * 4 * (level + 1)
    for f in files:
        if not f.endswith(".pyc"):
            print(f"{subindent}{f}")

expected_files = [
    r"backend\graph\repositories\governance_repository.py",
    r"backend\graph\services\graph_service.py",
    r"backend\graph\sync\graph_mapper.py",
    r"backend\graph\sync\neo4j_writer.py",
    r"backend\graph\sync\sync_state_manager.py",
    r"backend\graph\sync\change_stream_listener.py",
    r"backend\graph\sync\graph_sync_service.py",
    r"backend\api\graph_routes.py",
    r"backend\app.py"
]

print("\n# PASO 2 & 3 - Existencia física, tamaño, fecha, primeras 30 líneas")
for rel_path in expected_files:
    full_path = os.path.join(base_dir, rel_path)
    exists = os.path.exists(full_path)
    print(f"\n--- Archivo: {rel_path} ---")
    print(f"¿Existe?: {'SÍ' if exists else 'NO'}")
    if exists:
        stat = os.stat(full_path)
        print(f"Tamaño: {stat.st_size} bytes")
        print(f"Modificado: {datetime.datetime.fromtimestamp(stat.st_mtime)}")
        print("Primeras 30 líneas:")
        with open(full_path, "r", encoding="utf-8") as f:
            lines = []
            for _ in range(30):
                line = f.readline()
                if not line:
                    break
                lines.append(line)
            print("".join(lines).strip())

            
print("\n# PASO 4 - Validar imports")
import_script = """
import sys
sys.path.insert(0, r'd:\\antigravity\\Eureka\\Actividad1')
try:
    import backend.graph
    import backend.graph.services.graph_service
    import backend.graph.sync.graph_mapper
    import backend.graph.sync.neo4j_writer
    import backend.graph.sync.change_stream_listener
    import backend.api.graph_routes
    print("Todos los imports fueron exitosos.")
except Exception as e:
    print(f"Error importando: {e}")
"""
res = subprocess.run([venv_python, "-c", import_script], capture_output=True, text=True)
print(res.stdout + res.stderr)

print("\n# PASO 5 - Verificar FastAPI")
main_path = os.path.join(base_dir, "backend", "api", "main.py")
print("Entrypoint real: backend/api/main.py")
print("Verificando app.include_router:")
with open(main_path, "r", encoding="utf-8") as f:
    for line in f:
        if "app.include_router" in line:
            print(line.strip())

print("\n# PASO 6 - Verificar pruebas (tests/graph/)")
for root, dirs, files in os.walk(os.path.join(base_dir, "tests", "graph")):
    level = root.replace(os.path.join(base_dir, "tests", "graph"), "").count(os.sep)
    indent = " " * 4 * level
    print(f"{indent}{os.path.basename(root)}/")
    subindent = " " * 4 * (level + 1)
    for f in files:
        if not f.endswith(".pyc"):
            print(f"{subindent}{f}")

env = os.environ.copy()
env["PYTHONPATH"] = base_dir
env["MONGO_URI"] = "mongodb://admin:password@localhost:27017/eureka?authSource=admin"
env["NEO4J_URI"] = "bolt://localhost:7687"
env["NEO4J_USER"] = "neo4j"
env["NEO4J_PASSWORD"] = "secret"

print("\n# PASO 7 - Ejecutar pruebas reales (pytest tests/graph -q)")
res = subprocess.run([venv_python, "-m", "pytest", os.path.join(base_dir, "tests", "graph"), "-q"], env=env, capture_output=True, text=True)
print(res.stdout + res.stderr)

print("\n# PASO 8 - Ejecutar cobertura real")
res = subprocess.run([venv_python, "-m", "pytest", "--cov=backend.graph", os.path.join(base_dir, "tests", "graph")], env=env, capture_output=True, text=True)
print(res.stdout + res.stderr)

print("\n# PASO 9 - Verificar Neo4j")
neo4j_script = """
import sys
sys.path.insert(0, r'd:\\antigravity\\Eureka\\Actividad1')
from backend.graph.client import Neo4jClient
try:
    client = Neo4jClient()
    with client.session() as session:
        res = session.run("MATCH (n) RETURN count(n) as cnt")
        print(f"Neo4j Connection: SUCCESS, nodes count: {res.single()[0]}")
except Exception as e:
    print(f"Neo4j Connection: FAILED - {e}")
"""
res = subprocess.run([venv_python, "-c", neo4j_script], env=env, capture_output=True, text=True)
print(res.stdout + res.stderr)

print("\n# PASO 10 - Verificar MongoDB")
mongo_script = """
import sys
sys.path.insert(0, r'd:\\antigravity\\Eureka\\Actividad1')
from backend.graph.mongo_client import MongoDBClient
try:
    mongo = MongoDBClient()
    mongo.client.admin.command('ping')
    print("MongoDB Connection: SUCCESS")
    print(f"Collections: {mongo.db.list_collection_names()}")
except Exception as e:
    print(f"MongoDB Connection: FAILED - {e}")
"""
res = subprocess.run([venv_python, "-c", mongo_script], env=env, capture_output=True, text=True)
print(res.stdout + res.stderr)

print("\n# PASO 11 & 12 - Evidencias REST y JSON")
print(f"mongo_change_stream_log.json: {'SÍ' if os.path.exists(os.path.join(base_dir, 'mongo_change_stream_log.json')) else 'NO'}")
print(f"rest_endpoint_response.json: {'SÍ' if os.path.exists(os.path.join(base_dir, 'rest_endpoint_response.json')) else 'NO'}")
print(f"neo4j_browser_snapshot.png: {'SÍ' if os.path.exists(os.path.join(base_dir, 'neo4j_browser_snapshot.png')) else 'NO'}")
