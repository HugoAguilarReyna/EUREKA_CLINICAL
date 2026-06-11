import axios from 'axios';
import { KnowledgeAssetScore, InfluenceDTO, GraphAnalyticsSummary } from '../types/analytics';

const API_BASE = `${import.meta.env.VITE_API_URL}/graph/analytics`;

export const getCentrality = async (): Promise<KnowledgeAssetScore[]> => {
  const { data } = await axios.get(`${API_BASE}/centrality`);
  return data;
};

export const getInfluence = async (assetId: string): Promise<InfluenceDTO> => {
  const { data } = await axios.get(`${API_BASE}/influence/${encodeURIComponent(assetId)}`);
  return data;
};

export const getAnalyticsSummary = async (): Promise<GraphAnalyticsSummary> => {
  const { data } = await axios.get(`${API_BASE}/summary`);
  return data;
};

export const getTopAssets = async (): Promise<KnowledgeAssetScore[]> => {
  const { data } = await axios.get(`${API_BASE}/top-assets`);
  return data;
};

export const getDecisionInsights = async (): Promise<any[]> => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/intelligence/insights`);
  return data;
};

export const getMinedRules = async (): Promise<any[]> => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/intelligence/rules`);
  return data;
};

export const runSimulation = async (iqrMultiplier: number, scenario: string = 'outlier_trim'): Promise<any> => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/intelligence/simulate?scenario=${scenario}&iqr_multiplier=${iqrMultiplier}`);
  return data;
};

export const getCorrelationHeatmap = async (): Promise<any[]> => {
  const { data } = await axios.get(`${API_BASE}/heatmap`);
  return data;
};

export const getSankeyFlow = async (): Promise<any> => {
  const { data } = await axios.get(`${API_BASE}/sankey`);
  return data;
};


