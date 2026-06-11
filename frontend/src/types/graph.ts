export interface GraphNode {
  id: string;
  label: string;
  node_type?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
  properties: Record<string, any>;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  src_id: string;
  dst_id: string;
  relationship_type: string;
  weight?: number;
  confidence?: number;
  properties: Record<string, any>;
  metadata: Record<string, any>;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
