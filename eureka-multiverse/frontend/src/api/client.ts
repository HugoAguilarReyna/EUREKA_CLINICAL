import axios from 'axios';
import { FeatureMapDTO, CaseResponseDTO, MemoryTimelineDTO } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

export const analyzeCase = async (features: FeatureMapDTO) => {
  const { data } = await api.post('/cases/analyze', { features });
  return data;
};

export const getCase = async (caseId: string): Promise<CaseResponseDTO> => {
  const { data } = await api.get(`/cases/${caseId}`);
  return data;
};

export const getMemory = async (caseId: string): Promise<MemoryTimelineDTO> => {
  const { data } = await api.get(`/memory/${caseId}`);
  return data;
};
