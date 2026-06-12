from typing import Dict, Any, List, Optional
from pymongo import MongoClient
from backend.db.config import settings
from backend.graph.client import Neo4jClient
from backend.semantic.semantic_graph_enrichment import SemanticGraphEnrichment
from backend.graph.logger import logger

class SemanticGraphBuilder:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.nodes_col = self.db["semantic_graph_nodes"]
        self.edges_col = self.db["semantic_graph_edges"]
        self.enrichment = SemanticGraphEnrichment()

    def build_and_persist_graph(self, function_type: str = "triangular") -> Dict[str, int]:
        """
        Builds the entire semantic graph and persists it. Attempts Neo4j first, 
        and falls back to MongoDB.
        """
        # Build using the enrichment engine
        logger.info("LOG: Starting semantic enrichment")
        graph_data = self.enrichment.build_enriched_graph(function_type)
        nodes = graph_data["nodes"]
        edges = graph_data["edges"]
        
        logger.info("LOG: dataset node created")
        logger.info("LOG: patient nodes generated")
        logger.info("LOG: semantic states generated")
        logger.info("LOG: rules generated")
        logger.info("LOG: communities generated")

        # Persist in MongoDB Collections (as primary store and fallback)
        self.nodes_col.delete_many({})
        self.edges_col.delete_many({})
        if nodes:
            self.nodes_col.insert_many(nodes)
        if edges:
            self.edges_col.insert_many(edges)

        # Attempt Neo4j Write
        neo4j_nodes_written = 0
        neo4j_edges_written = 0
        try:
            client = Neo4jClient()
            with client.session() as session:
                # Clear existing semantic nodes
                session.run("MATCH (n) WHERE n.type IN ['Patient', 'SemanticState', 'Rule', 'Evidence', 'Risk', 'Action', 'Variable', 'Community', 'Pattern', 'Hypothesis'] DETACH DELETE n")
                
                # Format nodes for UNWIND
                formatted_nodes = []
                for n in nodes:
                    flat_props = {}
                    for k, v in n.get("properties", {}).items():
                        if isinstance(v, dict):
                            flat_props[k] = str(v)
                        elif isinstance(v, list):
                            flat_props[k] = ", ".join(map(str, v))
                        else:
                            flat_props[k] = v
                    
                    formatted_nodes.append({
                        "id": n["id"],
                        "label": n["label"],
                        "properties": flat_props
                    })
                
                # Batch insert nodes using UNWIND
                if formatted_nodes:
                    node_query = """
                    UNWIND $batch AS row
                    MERGE (node:KnowledgeAsset {id: row.id})
                    SET node.label = row.label, node.properties = row.properties
                    """
                    # Chunk to 5000 nodes per transaction to prevent memory spikes
                    for i in range(0, len(formatted_nodes), 5000):
                        batch = formatted_nodes[i:i + 5000]
                        session.run(node_query, batch=batch)
                        neo4j_nodes_written += len(batch)

                # Format edges by relationship_type
                from collections import defaultdict
                edges_by_type = defaultdict(list)
                for e in edges:
                    edges_by_type[e["relationship_type"]].append({
                        "src_id": e["src_id"],
                        "dst_id": e["dst_id"],
                        "properties": e.get("properties", {})
                    })
                
                # Batch insert edges using UNWIND per relationship_type
                for rel_type, type_edges in edges_by_type.items():
                    edge_query = f"""
                    UNWIND $batch AS row
                    MATCH (a:KnowledgeAsset {{id: row.src_id}})
                    MATCH (b:KnowledgeAsset {{id: row.dst_id}})
                    MERGE (a)-[r:{rel_type}]->(b)
                    SET r = row.properties
                    """
                    for i in range(0, len(type_edges), 5000):
                        batch = type_edges[i:i + 5000]
                        session.run(edge_query, batch=batch)
                        neo4j_edges_written += len(batch)
                        
            logger.info("Persisted semantic graph to Neo4j successfully.")
            logger.info("LOG: graph persisted")
        except Exception as ex:
            logger.warning(f"Neo4j offline or write failed: {ex}. Graph successfully saved in MongoDB fallback.")
            logger.info("LOG: graph persisted")

        return {
            "nodes_written": len(nodes),
            "edges_written": len(edges),
            "neo4j_nodes": neo4j_nodes_written,
            "neo4j_edges": neo4j_edges_written
        }

    def get_semantic_graph(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retrieves the semantic nodes and edges from MongoDB.
        """
        nodes = list(self.nodes_col.find({}))
        edges = list(self.edges_col.find({}))

        for n in nodes:
            n["_id"] = str(n["_id"])
        for e in edges:
            e["_id"] = str(e["_id"])

        return {
            "nodes": nodes,
            "edges": edges
        }

