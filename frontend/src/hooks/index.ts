import { useQuery } from '@tanstack/react-query';
import { getCentrality, getInfluence, getAnalyticsSummary, getTopAssets, getDecisionInsights, getMinedRules, runSimulation, getCorrelationHeatmap, getSankeyFlow } from '../api/analytics';
import { getExplainability, getTraceability, getAsset } from '../api/graph';

export const useCentrality = () => {
  return useQuery({
    queryKey: ['centrality'],
    queryFn: getCentrality,
  });
};

export const useInfluence = (assetId: string | null) => {
  return useQuery({
    queryKey: ['influence', assetId],
    queryFn: () => getInfluence(assetId!),
    enabled: !!assetId,
  });
};

export const useExplainability = (caseId: string | null) => {
  return useQuery({
    queryKey: ['explainability', caseId],
    queryFn: () => getExplainability(caseId!),
    enabled: !!caseId,
  });
};

export const useTraceability = (assetId: string | null) => {
  return useQuery({
    queryKey: ['traceability', assetId],
    queryFn: () => getTraceability(assetId!),
    enabled: !!assetId,
  });
};

export const useAnalyticsSummary = () => {
  return useQuery({
    queryKey: ['summary'],
    queryFn: getAnalyticsSummary,
  });
};

export const useTopAssets = () => {
  return useQuery({
    queryKey: ['top-assets'],
    queryFn: getTopAssets,
  });
};

export const useKnowledgeAsset = (assetId: string | null) => {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => getAsset(assetId!),
    enabled: !!assetId,
  });
};

export const useDecisionInsights = () => {
  return useQuery({
    queryKey: ['decision-insights'],
    queryFn: getDecisionInsights,
  });
};

export const useMinedRules = () => {
  return useQuery({
    queryKey: ['mined-rules'],
    queryFn: getMinedRules,
  });
};

export const useSimulation = (iqrMultiplier: number, scenario: string = 'outlier_trim') => {
  return useQuery({
    queryKey: ['simulation', iqrMultiplier, scenario],
    queryFn: () => runSimulation(iqrMultiplier, scenario),
  });
};

export const useCorrelationHeatmap = () => {
  return useQuery({
    queryKey: ['heatmap'],
    queryFn: getCorrelationHeatmap,
  });
};

export const useSankeyFlow = () => {
  return useQuery({
    queryKey: ['sankey'],
    queryFn: getSankeyFlow,
  });
};


