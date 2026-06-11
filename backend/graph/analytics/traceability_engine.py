import networkx as nx
from typing import Optional, List, Dict
from backend.graph.analytics.graph_snapshot_builder import GraphSnapshotBuilder
from backend.graph.models.intelligence_dtos import TraceabilityDTO
from backend.graph.models.dtos import GraphNodeDTO, GraphEdgeDTO, GraphPathDTO
from backend.graph.logger import logger

class TraceabilityEngine:
    def __init__(self, snapshot_builder: Optional[GraphSnapshotBuilder] = None):
        self.snapshot_builder = snapshot_builder or GraphSnapshotBuilder()

    def _convert_nx_path(self, G: nx.DiGraph, path_nodes: List[str]) -> GraphPathDTO:
        nodes_dto = []
        edges_dto = []
        
        for i, node_id in enumerate(path_nodes):
            node_data = G.nodes[node_id]
            props = dict(node_data)
            label = props.pop("label", "Unknown")
            
            nodes_dto.append(GraphNodeDTO(
                id=node_id,
                label=label,
                node_type=props.pop("node_type", None),
                confidence=props.pop("confidence", None),
                created_at=props.pop("created_at", None),
                updated_at=props.pop("updated_at", None),
                properties=props,
                metadata=props.get("metadata", {})
            ))
            
            if i < len(path_nodes) - 1:
                next_node = path_nodes[i+1]
                if G.has_edge(node_id, next_node):
                    edge_data = G.edges[node_id, next_node]
                    src = node_id
                    dst = next_node
                elif G.has_edge(next_node, node_id):
                    edge_data = G.edges[next_node, node_id]
                    src = next_node
                    dst = node_id
                else:
                    continue
                    
                edges_dto.append(GraphEdgeDTO(
                    src_id=src,
                    dst_id=dst,
                    relationship_type=edge_data.get("type", "UNKNOWN"),
                    weight=edge_data.get("weight"),
                    confidence=edge_data.get("confidence"),
                    properties=dict(edge_data)
                ))
                    
        return GraphPathDTO(nodes=nodes_dto, edges=edges_dto)

    def trace_asset(self, asset_id: str) -> TraceabilityDTO:
        """Trace both origins (ancestors) and usage (descendants) of an asset."""
        G = self.snapshot_builder.build_full_graph()
        
        if not G.has_node(asset_id):
            return TraceabilityDTO(origin_paths=[], usage_paths=[], governance_paths=[])
            
        origin_paths = []
        usage_paths = []
        governance_paths = []
        
        # 1. Trace origins (Ancestors)
        ancestors = nx.ancestors(G, asset_id)
        MAX_PATHS = 50
        MAX_DEPTH = 5
        
        for a in ancestors:
            if len(origin_paths) >= MAX_PATHS:
                break
            try:
                for path in nx.all_simple_paths(G, source=a, target=asset_id, cutoff=MAX_DEPTH):
                    origin_paths.append(self._convert_nx_path(G, path))
                    if len(origin_paths) >= MAX_PATHS:
                        break
            except nx.NetworkXNoPath:
                pass
                    
        # 2. Trace usage (Descendants)
        descendants = nx.descendants(G, asset_id)
        for d in descendants:
            if len(usage_paths) >= MAX_PATHS:
                break
            try:
                for path in nx.all_simple_paths(G, source=asset_id, target=d, cutoff=MAX_DEPTH):
                    usage_paths.append(self._convert_nx_path(G, path))
                    if len(usage_paths) >= MAX_PATHS:
                        break
            except nx.NetworkXNoPath:
                pass
                    
        # 3. Governance events
        for neighbor in G.predecessors(asset_id):
            if G.nodes[neighbor].get("label") == "GovernanceEvent":
                path = [neighbor, asset_id]
                governance_paths.append(self._convert_nx_path(G, path))
                
        logger.info("trace_asset", extra={"asset_id": asset_id, "origins": len(origin_paths), "usages": len(usage_paths)})
        return TraceabilityDTO(
            origin_paths=origin_paths,
            usage_paths=usage_paths,
            governance_paths=governance_paths
        )

    def trace_case(self, case_id: str) -> TraceabilityDTO:
        return self.trace_asset(case_id)
        
    def trace_governance(self, event_id: str) -> TraceabilityDTO:
        return self.trace_asset(event_id)
