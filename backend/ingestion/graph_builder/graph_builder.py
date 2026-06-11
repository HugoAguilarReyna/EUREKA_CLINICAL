import datetime
from typing import List, Dict, Any
from backend.ingestion.models.upload_dtos import DetectedEntityDTO, DetectedRelationshipDTO
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO
from backend.graph.client import Neo4jClient

class KnowledgeGraphBuilder:
    def __init__(self):
        self.neo4j_client = Neo4jClient()

    def build_and_persist(
        self, 
        entities: List[DetectedEntityDTO], 
        relationships: List[DetectedRelationshipDTO]
    ) -> Dict[str, Any]:
        
        # Convert to GraphNodeDTO and GraphEdgeDTO
        nodes = []
        for e in entities:
            node = GraphNodeDTO(
                id=e.entity_id,
                label="KnowledgeAsset",
                node_type=e.entity_type,
                properties=e.properties,
                created_at=datetime.datetime.utcnow().isoformat(),
                updated_at=datetime.datetime.utcnow().isoformat()
            )
            nodes.append(node)
            
        edges = []
        for r in relationships:
            # Note: GraphEdgeDTO expects 'type' via alias 'relationship_type'
            edge = GraphEdgeDTO(
                src_id=r.source_id,
                dst_id=r.target_id,
                relationship_type=r.relationship_type,
                properties=r.properties
            )
            edges.append(edge)
            
        # 1. Try to persist using Neo4j
        written_nodes = self._write_nodes(nodes)
        written_edges = self._write_edges(edges)

        # 2. Persist to MongoDB (as active fallback/mirror)
        try:
            from pymongo import MongoClient
            from backend.db.config import settings
            mongo_client = MongoClient(settings.mongo_uri)
            db = mongo_client[settings.mongo_db_name]
            
            patients_data = {}
            for e in entities:
                if e.entity_type == "Patient":
                    patients_data[e.entity_id] = {
                        "patient_id": e.entity_id,
                        "Age": e.properties.get("Age"),
                        "Gender": e.properties.get("Gender"),
                    }
                elif e.entity_type == "DatasetMetadata":
                    db["dataset_metadata"].update_one(
                        {"id": e.entity_id},
                        {"$set": e.properties},
                        upsert=True
                    )
            
            for r in relationships:
                if r.relationship_type == "HAS_MEASUREMENT":
                    pat_id = r.source_id
                    met_id = r.target_id
                    metric_entity = next((ent for ent in entities if ent.entity_id == met_id), None)
                    if metric_entity and pat_id in patients_data:
                        metric_name = metric_entity.properties.get("metric_name")
                        metric_value = metric_entity.properties.get("value")
                        if metric_name is not None:
                            patients_data[pat_id][metric_name] = metric_value

            for pat_id, pdata in patients_data.items():
                db["patients"].update_one(
                    {"patient_id": pat_id},
                    {"$set": {
                        "patient_id": pat_id,
                        "name": f"Patient {pat_id.split('_')[-1]}",
                        "dob": datetime.datetime.utcnow(),
                        "gender": pdata.get("Gender", "UNKNOWN")
                    }},
                    upsert=True
                )
                
                raw_data = {
                    "Age": pdata.get("Age"),
                    "Gender": pdata.get("Gender"),
                    "TB": pdata.get("TB", 0.0),
                    "DB": pdata.get("DB", 0.0),
                    "Alkphos": pdata.get("Alkphos", 0.0),
                    "Sgpt": pdata.get("Sgpt", 0.0),
                    "Sgot": pdata.get("Sgot", 0.0),
                    "TP": pdata.get("TP", 0.0),
                    "ALB": pdata.get("ALB", 0.0),
                    "A_G_Ratio": pdata.get("A/G Ratio") or pdata.get("A_G_Ratio") or 0.0
                }
                
                selector_val = pdata.get("Selector")
                db["cases"].update_one(
                    {"case_id": f"Case_{pat_id.split('_')[-1]}"},
                    {"$set": {
                        "case_id": f"Case_{pat_id.split('_')[-1]}",
                        "patient_id": pat_id,
                        "status": "COMPLETED",
                        "raw_data": raw_data,
                        "fuzzy_interpretation": {"fuzzy_class": "Liver Disease" if selector_val == 1.0 else "Healthy"} if selector_val is not None else None,
                        "prediction_result": {"is_disease": int(float(selector_val)) == 1} if selector_val is not None else None
                    }},
                    upsert=True
                )
        except Exception as mongo_err:
            print(f"Failed to persist to MongoDB: {mongo_err}")
        
        return {
            "nodes_written": written_nodes,
            "edges_written": written_edges
        }
        
    def _write_nodes(self, nodes: List[GraphNodeDTO]) -> int:
        if not nodes:
            return 0
            
        written = 0
        try:
            with self.neo4j_client.session() as session:
                for node in nodes:
                    label_str = f":{node.label}"
                    if node.node_type:
                        clean_type = "".join(c for c in node.node_type if c.isalnum())
                        if clean_type:
                            label_str += f":{clean_type}"
                            
                    props = dict(node.properties)
                    if node.node_type:
                        props["node_type"] = node.node_type
                        
                    query = f"""
                    MERGE (n{label_str} {{id: $id}})
                    ON CREATE SET n += $props, n.created_at = $created_at, n.updated_at = $updated_at
                    ON MATCH SET n += $props, n.updated_at = $updated_at
                    """
                    
                    params = {
                        "id": node.id,
                        "props": props,
                        "created_at": node.created_at,
                        "updated_at": node.updated_at,
                    }
                    
                    session.execute_write(lambda tx: tx.run(query, **params))
                    written += 1
        except Exception as e:
            print(f"Neo4j node writing skipped/failed (using fallback): {e}")
                
        return written
        
    def _write_edges(self, edges: List[GraphEdgeDTO]) -> int:
        if not edges:
            return 0
            
        written = 0
        try:
            with self.neo4j_client.session() as session:
                for edge in edges:
                    query = f"""
                    MATCH (src {{id: $src_id}})
                    MATCH (dst {{id: $dst_id}})
                    MERGE (src)-[r:{edge.type}]->(dst)
                    ON CREATE SET r = $props
                    ON MATCH SET r += $props
                    """
                    
                    params = {
                        "src_id": edge.src_id,
                        "dst_id": edge.dst_id,
                        "props": edge.properties,
                    }
                    
                    session.execute_write(lambda tx: tx.run(query, **params))
                    written += 1
        except Exception as e:
            print(f"Neo4j edge writing skipped/failed (using fallback): {e}")
                
        return written
