import networkx as nx
from typing import Optional
from backend.graph.client import Neo4jClient
from backend.graph.logger import logger

import time

_GLOBAL_GRAPH_CACHE = {}

class GraphSnapshotBuilder:
    """
    Extracts data from Neo4j into a NetworkX graph for in-memory advanced analytics.
    """
    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.client = neo4j_client or Neo4jClient()

    def build_full_graph(self) -> nx.DiGraph:
        """
        Builds a NetworkX directed graph from all active nodes and edges in Neo4j.
        """
        global _GLOBAL_GRAPH_CACHE
        if "full_graph" in _GLOBAL_GRAPH_CACHE:
            entry = _GLOBAL_GRAPH_CACHE["full_graph"]
            age = time.time() - entry["time"]
            if age < 60: # 60 seconds TTL
                return entry["graph"]

        G = nx.DiGraph()
        try:
            query = """
            MATCH (n)
            WHERE n.status IS NULL OR n.status <> 'DELETED'
            OPTIONAL MATCH (n)-[r]->(m)
            WHERE m.status IS NULL OR m.status <> 'DELETED'
            RETURN n, r, m
            """
            with self.client.session() as session:
                result = session.run(query)
                for record in result:
                    n = record["n"]
                    if n is not None:
                        n_id = n.get("id") or n.element_id
                        n_label = list(n.labels)[0] if n.labels else "Unknown"
                        if not G.has_node(n_id):
                            G.add_node(n_id, label=n_label, **self._sanitize_props(dict(n)))
                    
                    r = record["r"]
                    m = record["m"]
                    
                    if r is not None and m is not None:
                        m_id = m.get("id") or m.element_id
                        m_label = list(m.labels)[0] if m.labels else "Unknown"
                        if not G.has_node(m_id):
                            G.add_node(m_id, label=m_label, **self._sanitize_props(dict(m)))
                        
                        G.add_edge(n_id, m_id, type=r.type, **self._sanitize_props(dict(r)))
        except Exception as e:
            logger.warning(f"Error querying Neo4j for full graph: {e}. Reconstructing from MongoDB.")

        # MongoDB Fallback if graph is empty
        if G.number_of_nodes() == 0:
            try:
                from pymongo import MongoClient
                from backend.db.config import settings
                mongo_client = MongoClient(settings.mongo_uri)
                db = mongo_client[settings.mongo_db_name]
                
                # 1. Add DatasetMetadata
                meta = db["dataset_metadata"].find_one({"id": "Dataset_Metadata_Global"})
                if meta:
                    G.add_node("Dataset_Metadata_Global", label="DatasetMetadata", **self._sanitize_props(dict(meta)))
                else:
                    G.add_node("Dataset_Metadata_Global", label="DatasetMetadata", file_name="act_liver_disease.csv", rows=583, columns=10)

                # 2. Add Patients and Cases and Metrics
                cases_cursor = db["cases"].find({})
                for c in cases_cursor:
                    case_id = c.get("case_id")
                    patient_id = c.get("patient_id")
                    
                    # Add Patient
                    G.add_node(patient_id, label="Patient", patient_id=patient_id)
                    # Add Case
                    G.add_node(case_id, label="Case", case_id=case_id, status=c.get("status"))
                    # Link Patient -> Case
                    G.add_edge(patient_id, case_id, type="HAS_CASE")
                    
                    raw = c.get("raw_data", {})
                    for metric, val in raw.items():
                        if metric not in ["Age", "Gender"]:
                            metric_id = f"LabMetric_{patient_id.split('_')[-1]}_{metric}"
                            G.add_node(metric_id, label="LaboratoryMetric", metric_name=metric, value=val)
                            G.add_edge(patient_id, metric_id, type="HAS_MEASUREMENT")

                # 3. Add ClinicalStates
                # Generate states dynamically
                from backend.explainability.clinical_explainability import ClinicalExplainabilityEngine
                explainer = ClinicalExplainabilityEngine()
                states = explainer._get_clinical_states()
                for s in states:
                    G.add_node(s["sid"], label="ClinicalState", **self._sanitize_props(s))
            except Exception as e_mongo:
                logger.error(f"MongoDB fallback for graph builder failed: {e_mongo}")

        logger.info("build_full_graph", extra={"nodes": G.number_of_nodes(), "edges": G.number_of_edges()})
        _GLOBAL_GRAPH_CACHE["full_graph"] = {"time": time.time(), "graph": G}
        return G

    def _sanitize_props(self, props: dict) -> dict:
        import datetime
        clean = {}
        for k, v in props.items():
            if hasattr(v, "isoformat"):
                clean[k] = v.isoformat()
            elif isinstance(v, datetime.datetime):
                clean[k] = v.isoformat()
            else:
                clean[k] = v
        return clean

    def build_asset_subgraph(self, asset_id: str) -> nx.DiGraph:
        """
        Builds a NetworkX graph centered around a specific KnowledgeAsset.
        """
        # Fetch asset and relationships up to depth 3
        query = """
        MATCH (start:KnowledgeAsset {id: $asset_id})-[r*0..3]-(m)
        WHERE (start.status IS NULL OR start.status <> 'DELETED')
          AND (m.status IS NULL OR m.status <> 'DELETED')
        RETURN start, r, m
        """
        G = nx.DiGraph()
        with self.client.session() as session:
            result = session.run(query, asset_id=asset_id)
            for record in result:
                start = record["start"]
                if start is not None:
                    s_id = start.get("id")
                    if not G.has_node(s_id):
                        G.add_node(s_id, label="KnowledgeAsset", **self._sanitize_props(dict(start)))
                
                rels = record["r"]
                m = record["m"]
                
                if m is not None:
                    m_id = m.get("id") or m.element_id
                    m_label = list(m.labels)[0] if m.labels else "Unknown"
                    if not G.has_node(m_id):
                        G.add_node(m_id, label=m_label, **self._sanitize_props(dict(m)))
                
                if rels:
                    for rel in rels:
                        src_id = rel.start_node.get("id") or rel.start_node.element_id
                        dst_id = rel.end_node.get("id") or rel.end_node.element_id
                        G.add_edge(src_id, dst_id, type=rel.type, **self._sanitize_props(dict(rel)))
                        
        logger.info("build_asset_subgraph", extra={"asset_id": asset_id, "nodes": G.number_of_nodes()})
        return G

    def build_case_subgraph(self, case_id: str) -> nx.DiGraph:
        """
        Builds a NetworkX graph centered around a specific Case.
        """
        query = """
        MATCH (start:Case {id: $case_id})-[r*0..3]-(m)
        WHERE (start.status IS NULL OR start.status <> 'DELETED')
          AND (m.status IS NULL OR m.status <> 'DELETED')
        RETURN start, r, m
        """
        G = nx.DiGraph()
        with self.client.session() as session:
            result = session.run(query, case_id=case_id)
            for record in result:
                start = record["start"]
                if start is not None:
                    s_id = start.get("id")
                    if not G.has_node(s_id):
                        G.add_node(s_id, label="Case", **self._sanitize_props(dict(start)))
                
                rels = record["r"]
                m = record["m"]
                
                if m is not None:
                    m_id = m.get("id") or m.element_id
                    m_label = list(m.labels)[0] if m.labels else "Unknown"
                    if not G.has_node(m_id):
                        G.add_node(m_id, label=m_label, **self._sanitize_props(dict(m)))
                
                if rels:
                    for rel in rels:
                        src_id = rel.start_node.get("id") or rel.start_node.element_id
                        dst_id = rel.end_node.get("id") or rel.end_node.element_id
                        G.add_edge(src_id, dst_id, type=rel.type, **self._sanitize_props(dict(rel)))
                        
        logger.info("build_case_subgraph", extra={"case_id": case_id, "nodes": G.number_of_nodes()})
        return G
