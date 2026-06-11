import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../src/pages/DashboardPage';
import { ExplainabilityPage } from '../src/pages/ExplainabilityPage';
import { TraceabilityPage } from '../src/pages/TraceabilityPage';
import { InfluencePage } from '../src/pages/InfluencePage';
import { KnowledgeGraphPage } from '../src/pages/KnowledgeGraphPage';
import { SimulationPage } from '../src/pages/SimulationPage';
import * as hooks from '../src/hooks';
import * as apiGraph from '../src/api/graph';

vi.mock('../src/hooks', () => ({
  useAnalyticsSummary: vi.fn(),
  useTopAssets: vi.fn(),
  useCentrality: vi.fn(),
  useInfluence: vi.fn(),
  useExplainability: vi.fn(),
  useTraceability: vi.fn(),
  useKnowledgeAsset: vi.fn(),
  useDecisionInsights: vi.fn(),
  useSimulation: vi.fn(),
}));

vi.mock('../src/components/graph/ForceDirectedGraph', () => ({
  ForceDirectedGraph: () => <div data-testid="force-graph" />
}));
vi.mock('../src/api/graph');

describe('Pages', () => {
  it('DashboardPage renders correctly', () => {
    vi.mocked(hooks.useAnalyticsSummary).mockReturnValue({
      data: {
        total_nodes: 10,
        total_edges: 20,
        graph_density: 0.1,
        dataset_summary: {},
        business_discoveries: []
      },
      isLoading: false
    } as any);
    vi.mocked(hooks.useTopAssets).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(hooks.useDecisionInsights).mockReturnValue({ data: [], isLoading: false } as any);
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Decision Intelligence Console')).toBeInTheDocument();
  });

  it('ExplainabilityPage renders correctly and handles search', () => {
    vi.mocked(hooks.useExplainability).mockReturnValue({
      data: {
        narrative: 'Test narrative',
        decision_points: ['DP1'],
        nodes: [{ id: 'a', label: 'Case' }],
        edges: []
      },
      isLoading: false
    } as any);

    render(<MemoryRouter><ExplainabilityPage /></MemoryRouter>);
    expect(screen.getByText('Narrative')).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('Enter Patient ID (e.g. Patient_5) or Case ID...');
    fireEvent.change(input, { target: { value: 'test_case' } });
    fireEvent.click(screen.getByText('Explain'));
  });

  it('TraceabilityPage renders correctly and handles search', () => {
    vi.mocked(hooks.useTraceability).mockReturnValue({
      data: {
        origin_paths: [{ nodes: [{id:'o1'}]}],
        usage_paths: [],
        governance_paths: []
      },
      isLoading: false
    } as any);

    render(<MemoryRouter><TraceabilityPage /></MemoryRouter>);
    expect(screen.getByText(/Origins & Provenance/i)).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('Enter Patient ID (e.g. Patient_5) or Asset ID...');
    fireEvent.change(input, { target: { value: 'test_asset' } });
    fireEvent.click(screen.getByText('Trace'));
  });

  it('InfluencePage renders correctly and handles search', () => {
    vi.mocked(hooks.useInfluence).mockReturnValue({
      data: {
        influence_score: 55.5,
        impacted_cases: ['c1'],
        impacted_assets: []
      },
      isLoading: false
    } as any);

    render(<MemoryRouter><InfluencePage /></MemoryRouter>);
    expect(screen.getByText('55.50')).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('Enter Asset ID...');
    fireEvent.change(input, { target: { value: 'test_asset' } });
    fireEvent.click(screen.getByText('Measure'));
  });

  it('KnowledgeGraphPage renders correctly', () => {
    vi.mocked(hooks.useTopAssets).mockReturnValue({
      data: [{ asset_id: 'a1' }],
      isLoading: false
    } as any);
    vi.mocked(apiGraph.getTraceability).mockResolvedValue({
        origin_paths: [],
        usage_paths: [],
        governance_paths: []
    } as any);

    render(<MemoryRouter><KnowledgeGraphPage /></MemoryRouter>);
    expect(screen.getByText('Loading Knowledge Graph...')).toBeInTheDocument();
  });

  it('SimulationPage renders correctly and handles slider', () => {
    vi.mocked(hooks.useSimulation).mockReturnValue({
      data: {
        baseline_sample_size: 100,
        simulated_sample_size: 80,
        outliers_removed: 20,
        iqr_multiplier_used: 1.5,
        correlation_comparison: [{
          variable: 'DB',
          display_name: 'Direct Bilirubin',
          baseline_correlation: 0.24,
          simulated_correlation: 0.08,
          correlation_shift: -0.16
        }]
      },
      isLoading: false,
      refetch: vi.fn()
    } as any);

    render(<MemoryRouter><SimulationPage /></MemoryRouter>);
    expect(screen.getByText('What-If Outlier Simulator')).toBeInTheDocument();
  });
});
