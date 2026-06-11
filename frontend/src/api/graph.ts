import axios from 'axios';
import { GraphPath } from '../types/graph';
import { ExplainabilityDTO, TraceabilityDTO } from '../types/analytics';

const API_BASE = `${import.meta.env.VITE_API_URL}/graph`;

export const getAsset = async (assetId: string) => {
  const { data } = await axios.get(`${API_BASE}/assets/${assetId}`);
  return data;
};

export const getExplainability = async (caseId: string): Promise<any> => {
  if (caseId.startsWith('Patient')) {
    const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/explain/${caseId}`);
    return data;
  }
  const { data } = await axios.get(`${API_BASE}/explain/${caseId}`);
  return data;
};

export const getTraceability = async (assetId: string): Promise<any> => {
  if (assetId.startsWith('Patient')) {
    const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/trace/${assetId}`);
    return data;
  }
  const { data } = await axios.get(`${API_BASE}/trace/${assetId}`);
  return data;
};

export const getStructuralTraceability = async (assetId: string): Promise<any> => {
  const { data } = await axios.get(`${API_BASE}/trace/${assetId}`);
  return data;
};

export const getNodeProvenance = async (nodeId: string): Promise<any> => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/provenance/${nodeId}`);
  return data;
};


