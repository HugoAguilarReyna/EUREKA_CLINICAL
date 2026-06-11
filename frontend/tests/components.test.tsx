import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../src/App';
import { Sidebar } from '../src/components/layout/Sidebar';
import { AnalyticsSummary } from '../src/components/analytics/AnalyticsSummary';
import { TopAssetsTable } from '../src/components/analytics/TopAssetsTable';
import * as hooks from '../src/hooks';

// Mock all hooks
vi.mock('../src/hooks', () => ({
  useAnalyticsSummary: vi.fn(),
  useTopAssets: vi.fn(),
  useCentrality: vi.fn(),
  useInfluence: vi.fn(),
  useExplainability: vi.fn(),
  useTraceability: vi.fn(),
  useKnowledgeAsset: vi.fn(),
}));

const queryClient = new QueryClient();

describe('Frontend Components', () => {
  it('should render Sidebar correctly', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('EUREKA Multiverse')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Intelligence Console')).toBeInTheDocument();
  });

  it('should render AnalyticsSummary loading state', () => {
    vi.mocked(hooks.useAnalyticsSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<AnalyticsSummary />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('should render TopAssetsTable loading state', () => {
    vi.mocked(hooks.useTopAssets).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<TopAssetsTable />);
    expect(screen.getByText('Loading top assets...')).toBeInTheDocument();
  });
  
  it('should render TopAssetsTable with data', () => {
    vi.mocked(hooks.useTopAssets).mockReturnValue({
      data: [
        { asset_id: 'intel_asset_A', global_score: 95.5, pagerank: 0.8, degree: 0.9, betweenness: 0.5 }
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<TopAssetsTable />);
    expect(screen.getByText('intel_asset_A')).toBeInTheDocument();
    expect(screen.getByText('95.5')).toBeInTheDocument();
  });
});
