import { GraphPath } from './graph';

export interface KnowledgeAssetScore {
  asset_id: string;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  degree: number;
  global_score: number;
}

export interface InfluenceDTO {
  asset_id: string;
  impacted_cases: string[];
  impacted_assets: string[];
  influence_score: number;
}

export interface ExplainabilityDTO extends GraphPath {
  narrative: string;
  decision_points: string[];
}

export interface TraceabilityDTO {
  origin_paths: GraphPath[];
  usage_paths: GraphPath[];
  governance_paths: GraphPath[];
}

export interface GraphAnalyticsSummary {
  total_nodes: number;
  total_edges: number;
  graph_density: number;
  top_assets: KnowledgeAssetScore[];
  computed_at: string;
}
