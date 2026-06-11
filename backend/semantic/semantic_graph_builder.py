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
        graph_data = self.enrichment.build_enriched_graph(function_type)
        nodes = graph_data["nodes"]
        edges = graph_data["edges"]

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
                
                # Write nodes
                for n in nodes:
                    # Map properties safely, removing nested dicts to prevent cypher errors
                    flat_props = {}
                    for k, v in n["properties"].items():
                        if isinstance(v, dict):
                            flat_props[k] = str(v)
                        elif isinstance(v, list):
                            flat_props[k] = ", ".join(map(str, v))
                        else:
                            flat_props[k] = v
                            
                    session.run("""
                        MERGE (node:KnowledgeAsset {id: $id})
                        SET node.label = $label,
                            node.properties = $props
                    """, id=n["id"], label=n["label"], props=flat_props)
                    neo4j_nodes_written += 1
                
                # Write edges
                for e in edges:
                    session.run(f"""
                        MATCH (a:KnowledgeAsset {{id: $src_id}})
                        MATCH (b:KnowledgeAsset {{id: $dst_id}})
                        MERGE (a)-[r:{e['relationship_type']}]->(b)
                        SET r = $props
                    """, src_id=e["src_id"], dst_id=e["dst_id"], props=e["properties"])
                    neo4j_edges_written += 1
                    
            logger.info("Persisted semantic graph to Neo4j successfully.")
        except Exception as ex:
            logger.warning(f"Neo4j offline or write failed: {ex}. Graph successfully saved in MongoDB fallback.")

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

