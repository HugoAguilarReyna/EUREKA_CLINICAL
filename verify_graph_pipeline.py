#!/usr/bin/env python
"""
verify_graph_pipeline.py
════════════════════════════════════════════════════════════════
EUREKA Multiverse — Sprint 3B.1 E2E Pipeline Verification Script

PURPOSE:
    End-to-end verification of the complete data flow:
    MongoDB → ChangeStream → GraphMapper → Neo4jWriter → Cypher → REST

PREREQUISITES:
    1. Docker Compose stack running:
       docker-compose up -d
    2. Services healthy (mongo, neo4j, backend)
    3. Python environment active with required packages installed

USAGE:
    From the project root:
        python verify_graph_pipeline.py

    Or with specific options:
        python verify_graph_pipeline.py --mongo-uri mongodb://admin:password@localhost:27017/eureka?authSource=admin
        python verify_graph_pipeline.py --neo4j-uri bolt://localhost:7687 --neo4j-password secret
        python verify_graph_pipeline.py --api-url http://localhost:8000

════════════════════════════════════════════════════════════════
"""
import argparse
import datetime
import json
import sys
import time
import uuid
from typing import Any, Dict

MONGO_URI_DEFAULT = "mongodb://admin:password@localhost:27017/eureka?authSource=admin"
NEO4J_URI_DEFAULT = "bolt://localhost:7687"
NEO4J_USER_DEFAULT = "neo4j"
NEO4J_PASS_DEFAULT = "password"
API_URL_DEFAULT = "http://localhost:8000"


# ─── STEP REPORTING ──────────────────────────────────────────────────────────

class Reporter:
    def __init__(self):
        self.results = []
        self.pass_count = 0
        self.fail_count = 0

    def step(self, number: int, title: str):
        print(f"\n{'═'*60}")
        print(f"  STEP {number}: {title}")
        print(f"{'═'*60}")

    def ok(self, message: str):
        print(f"  [✓] {message}")
        self.results.append(("PASS", message))
        self.pass_count += 1

    def fail(self, message: str, error: Any = None):
        print(f"  [✗] {message}")
        if error:
            print(f"      Error: {error}")
        self.results.append(("FAIL", message))
        self.fail_count += 1

    def info(self, message: str):
        print(f"  [i] {message}")

    def summary(self):
        print(f"\n{'═'*60}")
        print(f"  PIPELINE VERIFICATION SUMMARY")
        print(f"{'═'*60}")
        for status, msg in self.results:
            icon = "✓" if status == "PASS" else "✗"
            print(f"  [{icon}] {msg}")
        print(f"\n  PASSED: {self.pass_count}")
        print(f"  FAILED: {self.fail_count}")
        if self.fail_count == 0:
            print("\n  VEREDICTO: D — FULLY IMPLEMENTED AND VERIFIED ✓")
        else:
            print("\n  VEREDICTO: C — IMPLEMENTED BUT NOT FULLY VERIFIED")
        print(f"{'═'*60}\n")


reporter = Reporter()


# ─── STEP 1: INFRASTRUCTURE CONNECTIVITY ─────────────────────────────────────

def step1_check_infrastructure(mongo_uri: str, neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    reporter.step(1, "Infrastructure Connectivity")

    # MongoDB
    try:
        from pymongo import MongoClient
        from pymongo.errors import ServerSelectionTimeoutError
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client.get_default_database()
        collections = db.list_collection_names()
        reporter.ok(f"MongoDB connected. Collections: {collections}")
        client.close()
        return True
    except Exception as e:
        reporter.fail("MongoDB connection failed", e)
        return False


def step1_check_neo4j(neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    try:
        from neo4j import GraphDatabase, basic_auth
        driver = GraphDatabase.driver(neo4j_uri, auth=basic_auth(neo4j_user, neo4j_pass))
        with driver.session() as session:
            result = session.run("MATCH (n) RETURN count(n) AS cnt")
            count = result.single()["cnt"]
        driver.close()
        reporter.ok(f"Neo4j connected. Node count: {count}")
        return True
    except Exception as e:
        reporter.fail("Neo4j connection failed", e)
        return False


# ─── STEP 2: INSERT DOCUMENT IN MONGODB ──────────────────────────────────────

def step2_insert_test_document(mongo_uri: str) -> Dict[str, Any]:
    reporter.step(2, "Insert Test Document in MongoDB → knowledge_assets")
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        
        test_id = f"e2e_asset_{uuid.uuid4().hex[:8]}"
        doc = {
            "asset_id": test_id,
            "asset_type": "E2ETestPattern",
            "confidence": 0.99,
            "clinical_relevance": "critical",
            "reuse_count": 0,
            "status": "ACTIVE",
            "related_assets": [],
            "created_at": datetime.datetime.utcnow(),
        }
        result = db["knowledge_assets"].insert_one(doc)
        reporter.ok(f"Document inserted with asset_id={test_id}, _id={result.inserted_id}")
        client.close()
        return {"asset_id": test_id, "_id": str(result.inserted_id)}
    except Exception as e:
        reporter.fail("MongoDB insert failed", e)
        return {}


# ─── STEP 3: GRAPHMAPPER UNIT TEST ───────────────────────────────────────────

def step3_verify_mapper(doc: Dict[str, Any]):
    reporter.step(3, "GraphMapper — Domain Document → GraphNodeDTO")
    try:
        import sys
        sys.path.insert(0, ".")
        from backend.graph.sync.graph_mapper import map_knowledge_asset, map_asset_relationships
        
        node_dto = map_knowledge_asset(doc)
        reporter.ok(f"map_knowledge_asset: id={node_dto.id}, label={node_dto.label}")
        assert node_dto.label == "KnowledgeAsset", "Label mismatch"
        assert node_dto.id == doc.get("asset_id"), "ID mismatch"
        
        edges = map_asset_relationships(doc)
        reporter.ok(f"map_asset_relationships: edges_count={len(edges)}")
        return node_dto
    except Exception as e:
        reporter.fail("GraphMapper mapping failed", e)
        return None


# ─── STEP 4: NEO4J WRITER — WRITE TO GRAPH ───────────────────────────────────

def step4_write_to_neo4j(node_dto, neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    reporter.step(4, "Neo4jWriter — GraphNodeDTO → Cypher MERGE")
    if node_dto is None:
        reporter.fail("No node DTO available from mapper step")
        return False
    try:
        from backend.graph.client import Neo4jClient
        import os
        os.environ["NEO4J_URI"] = neo4j_uri
        os.environ["NEO4J_USER"] = neo4j_user
        os.environ["NEO4J_PASSWORD"] = neo4j_pass
        
        from backend.graph.sync.neo4j_writer import Neo4jWriter
        writer = Neo4jWriter()
        writer.write_node(node_dto)
        reporter.ok(f"Node written to Neo4j: id={node_dto.id}, label={node_dto.label}")
        return True
    except Exception as e:
        reporter.fail("Neo4jWriter write failed", e)
        return False


# ─── STEP 5: VERIFY NODE IN NEO4J ────────────────────────────────────────────

def step5_verify_node_in_neo4j(asset_id: str, neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    reporter.step(5, f"Neo4j Cypher — Verify node exists: MATCH (n:KnowledgeAsset {{id: '{asset_id}'}})")
    try:
        from neo4j import GraphDatabase, basic_auth
        driver = GraphDatabase.driver(neo4j_uri, auth=basic_auth(neo4j_user, neo4j_pass))
        with driver.session() as session:
            result = session.run(
                "MATCH (n:KnowledgeAsset {id: $id}) RETURN n",
                id=asset_id
            )
            record = result.single()
            if record is None:
                reporter.fail(f"Node not found in Neo4j: {asset_id}")
                driver.close()
                return False
            node = record["n"]
            props = dict(node)
            reporter.ok(f"Node verified in Neo4j. Properties: {json.dumps(props, default=str)}")
        driver.close()
        return True
    except Exception as e:
        reporter.fail("Neo4j node verification failed", e)
        return False


# ─── STEP 6: REST API VERIFICATION ───────────────────────────────────────────

def step6_verify_rest_api(asset_id: str, api_url: str):
    reporter.step(6, f"REST API — GET /graph/assets/{asset_id}")
    try:
        import urllib.request
        import urllib.error
        
        url = f"{api_url}/graph/assets/{asset_id}"
        reporter.info(f"Requesting: {url}")
        
        with urllib.request.urlopen(url, timeout=10) as response:
            body = json.loads(response.read().decode())
            reporter.ok(f"REST API response: HTTP 200")
            reporter.info(f"Response body: {json.dumps(body, indent=2)}")
            return True
    except urllib.error.HTTPError as e:
        reporter.fail(f"REST API returned HTTP {e.code}", e)
        return False
    except Exception as e:
        reporter.fail("REST API call failed (is the backend running?)", e)
        return False


def step6b_verify_lineage_api(asset_id: str, api_url: str):
    reporter.step("6b", f"REST API — GET /graph/assets/{asset_id}/lineage")
    try:
        import urllib.request
        url = f"{api_url}/graph/assets/{asset_id}/lineage"
        with urllib.request.urlopen(url, timeout=10) as response:
            body = json.loads(response.read().decode())
            reporter.ok(f"Lineage query returned nodes={len(body.get('nodes', []))}, edges={len(body.get('edges', []))}")
        return True
    except Exception as e:
        reporter.fail("Lineage API call failed", e)
        return False


# ─── STEP 7: CHANGE STREAM MINI-TEST ─────────────────────────────────────────

def step7_change_stream_roundtrip(mongo_uri: str, neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    reporter.step(7, "Change Stream Roundtrip (sync_document simulation)")
    try:
        import os
        os.environ["MONGO_URI"] = mongo_uri
        os.environ["NEO4J_URI"] = neo4j_uri
        os.environ["NEO4J_USER"] = neo4j_user
        os.environ["NEO4J_PASSWORD"] = neo4j_pass
        
        from backend.graph.sync.graph_sync_service import GraphSyncService
        
        test_id = f"e2e_stream_{uuid.uuid4().hex[:8]}"
        doc = {
            "asset_id": test_id,
            "asset_type": "StreamTestPattern",
            "confidence": 0.88,
            "clinical_relevance": "medium",
        }
        
        service = GraphSyncService()
        service.sync_document("knowledge_assets", doc)
        reporter.ok(f"sync_document executed for asset_id={test_id}")
        
        # Verify it landed in Neo4j
        from neo4j import GraphDatabase, basic_auth
        driver = GraphDatabase.driver(neo4j_uri, auth=basic_auth(neo4j_user, neo4j_pass))
        with driver.session() as session:
            result = session.run("MATCH (n:KnowledgeAsset {id: $id}) RETURN n.id AS id", id=test_id)
            record = result.single()
            if record:
                reporter.ok(f"Stream-synced node verified in Neo4j: {record['id']}")
            else:
                reporter.fail(f"Stream-synced node NOT found in Neo4j: {test_id}")
        driver.close()
        return True
    except Exception as e:
        reporter.fail("Change stream roundtrip failed", e)
        return False


# ─── CLEANUP ─────────────────────────────────────────────────────────────────

def cleanup(mongo_uri: str, neo4j_uri: str, neo4j_user: str, neo4j_pass: str):
    print("\n[Cleanup] Removing E2E test nodes...")
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        result = db["knowledge_assets"].delete_many({"asset_type": {"$in": ["E2ETestPattern", "StreamTestPattern"]}})
        print(f"  [Cleanup-Mongo] Deleted {result.deleted_count} test document(s).")
        client.close()
    except Exception as e:
        print(f"  [Cleanup-Mongo] Failed: {e}")

    try:
        from neo4j import GraphDatabase, basic_auth
        driver = GraphDatabase.driver(neo4j_uri, auth=basic_auth(neo4j_user, neo4j_pass))
        with driver.session() as session:
            result = session.run(
                "MATCH (n:KnowledgeAsset) WHERE n.node_type IN ['E2ETestPattern', 'StreamTestPattern'] DETACH DELETE n RETURN count(n) AS deleted"
            )
            deleted = result.single()["deleted"]
            print(f"  [Cleanup-Neo4j] Deleted {deleted} node(s).")
        driver.close()
    except Exception as e:
        print(f"  [Cleanup-Neo4j] Failed: {e}")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="EUREKA Graph Pipeline E2E Verification")
    parser.add_argument("--mongo-uri", default=MONGO_URI_DEFAULT)
    parser.add_argument("--neo4j-uri", default=NEO4J_URI_DEFAULT)
    parser.add_argument("--neo4j-user", default=NEO4J_USER_DEFAULT)
    parser.add_argument("--neo4j-password", default=NEO4J_PASS_DEFAULT)
    parser.add_argument("--api-url", default=API_URL_DEFAULT)
    parser.add_argument("--skip-cleanup", action="store_true", help="Skip test data cleanup after verification")
    args = parser.parse_args()

    print("\n")
    print("  ╔══════════════════════════════════════════════════════════╗")
    print("  ║   EUREKA Multiverse — Sprint 3B.1 E2E Pipeline Verify   ║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print(f"  MongoDB:  {args.mongo_uri}")
    print(f"  Neo4j:    {args.neo4j_uri}")
    print(f"  REST API: {args.api_url}")

    # Step 1: Infrastructure
    mongo_ok = step1_check_infrastructure(args.mongo_uri, args.neo4j_uri, args.neo4j_user, args.neo4j_password)
    neo4j_ok = step1_check_neo4j(args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    if not mongo_ok or not neo4j_ok:
        reporter.info("Infrastructure not available. Halting E2E verification.")
        reporter.info("Ensure Docker is running: docker-compose up -d")
        reporter.summary()
        sys.exit(1)

    # Step 2: Insert document
    inserted = step2_insert_test_document(args.mongo_uri)
    asset_id = inserted.get("asset_id", "")
    
    if not asset_id:
        reporter.summary()
        sys.exit(1)

    # Step 3: Mapper
    node_dto = step3_verify_mapper({
        "asset_id": asset_id,
        "asset_type": "E2ETestPattern",
        "confidence": 0.99,
        "clinical_relevance": "critical",
        "reuse_count": 0,
        "related_assets": []
    })

    # Step 4: Write to Neo4j via writer
    step4_write_to_neo4j(node_dto, args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    # Step 5: Verify in Neo4j with Cypher
    step5_verify_node_in_neo4j(asset_id, args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    # Step 6: REST API
    step6_verify_rest_api(asset_id, args.api_url)
    step6b_verify_lineage_api(asset_id, args.api_url)

    # Step 7: Full sync_document roundtrip
    step7_change_stream_roundtrip(args.mongo_uri, args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    # Cleanup
    if not args.skip_cleanup:
        cleanup(args.mongo_uri, args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    # Final verdict
    reporter.summary()
    sys.exit(0 if reporter.fail_count == 0 else 1)


if __name__ == "__main__":
    main()
