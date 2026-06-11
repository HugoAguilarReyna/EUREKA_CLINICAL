import networkx as nx
from typing import Optional, List, Dict, Any
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder
from backend.graph.models.intelligence_dtos import ExplainabilityDTO
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO
from backend.graph.logger import logger

class ExplainabilityEngine:
    def __init__(self, snapshot_builder: Optional[GraphSnapshotBuilder] = None):
        self.snapshot_builder = snapshot_builder or GraphSnapshotBuilder()

    def _build_explainability_dto(self, G: nx.DiGraph, path_nodes: List[str]) -> ExplainabilityDTO:
        nodes_dto = []
        edges_dto = []
        decision_points = []
        
        narrative_parts = []
        
        for i, node_id in enumerate(path_nodes):
            node_data = G.nodes[node_id]
            label = node_data.get("label", "Unknown")
            
            # Reconstruct Node DTO
            props = dict(node_data)
            props.pop("label", None)
            
            n_dto = GraphNodeDTO(
                id=node_id,
                label=label,
                node_type=props.pop("node_type", None),
                confidence=props.pop("confidence", None),
                created_at=props.pop("created_at", None),
                updated_at=props.pop("updated_at", None),
                properties=props,
                metadata=props.get("metadata", {})
            )
            nodes_dto.append(n_dto)
            
            if label == "GovernanceEvent":
                decision_points.append(f"Governance applied: {props.get('action', 'Unknown action')}")
                
            # Add edges and build narrative
            if i < len(path_nodes) - 1:
                next_node = path_nodes[i+1]
                next_node_data = G.nodes[next_node]
                next_label = next_node_data.get("label", "Unknown")
                
                # Determine edge direction
                edge_data = None
                edge_type = "UNKNOWN"
                if G.has_edge(node_id, next_node):
                    edge_data = G.edges[node_id, next_node]
                    edge_type = edge_data.get("type", "UNKNOWN")
                    src = node_id
                    dst = next_node
                elif G.has_edge(next_node, node_id):
                    edge_data = G.edges[next_node, node_id]
                    edge_type = edge_data.get("type", "UNKNOWN")
                    src = next_node
                    dst = node_id
                
                if edge_data is not None:
                    edge_dto = GraphEdgeDTO(
                        src_id=src,
                        dst_id=dst,
                        relationship_type=edge_type,
                        weight=edge_data.get("weight"),
                        confidence=edge_data.get("confidence"),
                        properties=dict(edge_data)
                    )
                    edges_dto.append(edge_dto)
                    
                    # Generate natural language narrative step - Smart Explainability
                    if src == node_id:
                        if label == "Patient" and next_label in ["LaboratoryMetric", "ClinicalAttribute"]:
                            semantic_name = next_node_data.get("properties", {}).get("semantic_name", next_node)
                            narrative_parts.append(f"El paciente ({node_id}) presenta la variable clínica '{semantic_name}'.")
                        elif label == "Patient" and next_label == "Patient":
                            narrative_parts.append(f"El paciente ({node_id}) comparte similitudes clínicas con ({next_node}).")
                        elif label == "GovernanceEvent" and next_label in ["Patient", "LaboratoryMetric"]:
                            narrative_parts.append(f"La métrica o paciente fue evaluado por reglas de gobernanza ({node_id}).")
                        else:
                            narrative_parts.append(f"La entidad {label} ({node_id}) se relaciona con {next_label} ({next_node}).")
                    else:
                        if next_label == "Patient" and label in ["LaboratoryMetric", "ClinicalAttribute"]:
                            semantic_name = node_data.get("properties", {}).get("semantic_name", node_id)
                            narrative_parts.append(f"La métrica '{semantic_name}' es determinante en el estado del paciente ({next_node}).")
                        else:
                            narrative_parts.append(f"La métrica o entidad {label} ({node_id}) está conectada a {next_label} ({next_node}).")
                            
        if not narrative_parts:
            if len(path_nodes) > 1:
                narrative = "El análisis topológico indica que estas variables son recurrentes y muestran fuerte asociación."
            else:
                node_label = G.nodes[path_nodes[0]].get("label", "Entidad")
                narrative = f"Este análisis detalla el nodo aislado de tipo {node_label}."
        else:
            # Prepend a general business conclusion based on the items
            metrics_mentioned = [G.nodes[n].get("properties", {}).get("semantic_name", n) for n in path_nodes if G.nodes[n].get("label") in ["LaboratoryMetric", "ClinicalAttribute"]]
            if metrics_mentioned:
                metrics_text = ", ".join(list(set(metrics_mentioned))[:3])
                narrative = f"La clasificación está influenciada principalmente por {metrics_text}. Estas variables aparecen recurrentemente en pacientes analizados. " + " ".join(narrative_parts)
            else:
                narrative = " ".join(narrative_parts)
        
        return ExplainabilityDTO(
            nodes=nodes_dto,
            edges=edges_dto,
            narrative=narrative,
            decision_points=decision_points
        )

    def explain_case(self, case_id: str) -> ExplainabilityDTO:
        """Explain a case by finding the shortest path to a governance event or related critical assets."""
        G = self.snapshot_builder.build_full_graph()
        
        if not G.has_node(case_id):
            logger.warning(f"explain_case: Case {case_id} not found.")
            return ExplainabilityDTO(nodes=[], edges=[], narrative="Case not found.", decision_points=[])
            
        # Find path to GovernanceEvent using undirected graph for explainability trace
        G_undirected = G.to_undirected()
        
        target_nodes = [n for n, d in G.nodes(data=True) if d.get("label") == "GovernanceEvent"]
        best_path = []
        
        for target in target_nodes:
            try:
                path = nx.shortest_path(G_undirected, source=case_id, target=target)
                if not best_path or len(path) < len(best_path):
                    best_path = path
            except nx.NetworkXNoPath:
                continue
                
        if not best_path:
            # Fallback: just return the case's immediate neighbors
            best_path = [case_id] + list(G_undirected.neighbors(case_id))[:3]
            
        return self._build_explainability_dto(G, best_path)

    def explain_asset(self, asset_id: str) -> ExplainabilityDTO:
        G = self.snapshot_builder.build_full_graph()
        if not G.has_node(asset_id):
            return ExplainabilityDTO(nodes=[], edges=[], narrative="Asset not found.", decision_points=[])
            
        G_undirected = G.to_undirected()
        target_nodes = [n for n, d in G.nodes(data=True) if d.get("label") in ["Case", "Patient"]]
        
        for target in target_nodes:
            try:
                path = nx.shortest_path(G_undirected, source=asset_id, target=target)
                return self._build_explainability_dto(G, path)
            except nx.NetworkXNoPath:
                continue
                
        return self._build_explainability_dto(G, [asset_id])

    def explain_decision(self, decision_id: str) -> ExplainabilityDTO:
        return self.explain_asset(decision_id)
