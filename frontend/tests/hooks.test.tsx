import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCentrality, useInfluence, useExplainability, useTraceability, useAnalyticsSummary, useTopAssets, useKnowledgeAsset } from '../src/hooks';
import * as apiAnalytics from '../src/api/analytics';
import * as apiGraph from '../src/api/graph';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../src/api/analytics');
vi.mock('../src/api/graph');

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('React Query Hooks', () => {
  it('useCentrality calls getCentrality', async () => {
    vi.mocked(apiAnalytics.getCentrality).mockResolvedValue([]);
    const { result } = renderHook(() => useCentrality(), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useInfluence calls getInfluence', async () => {
    vi.mocked(apiAnalytics.getInfluence).mockResolvedValue({} as any);
    const { result } = renderHook(() => useInfluence('a'), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useExplainability calls getExplainability', async () => {
    vi.mocked(apiGraph.getExplainability).mockResolvedValue({} as any);
    const { result } = renderHook(() => useExplainability('c'), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useTraceability calls getTraceability', async () => {
    vi.mocked(apiGraph.getTraceability).mockResolvedValue({} as any);
    const { result } = renderHook(() => useTraceability('a'), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useAnalyticsSummary calls getAnalyticsSummary', async () => {
    vi.mocked(apiAnalytics.getAnalyticsSummary).mockResolvedValue({} as any);
    const { result } = renderHook(() => useAnalyticsSummary(), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useTopAssets calls getTopAssets', async () => {
    vi.mocked(apiAnalytics.getTopAssets).mockResolvedValue([]);
    const { result } = renderHook(() => useTopAssets(), { wrapper });
    expect(result.current.isPending).toBe(true);
  });

  it('useKnowledgeAsset calls getAsset', async () => {
    vi.mocked(apiGraph.getAsset).mockResolvedValue({});
    const { result } = renderHook(() => useKnowledgeAsset('a'), { wrapper });
    expect(result.current.isPending).toBe(true);
  });
});
