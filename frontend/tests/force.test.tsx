import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ForceDirectedGraph } from '../src/components/graph/ForceDirectedGraph';
import * as d3 from 'd3';

vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({ on: vi.fn() })),
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  })),
  forceLink: vi.fn(() => ({ id: vi.fn().mockReturnThis(), distance: vi.fn() })),
  forceManyBody: vi.fn(() => ({ strength: vi.fn() })),
  forceCenter: vi.fn(),
  forceCollide: vi.fn(() => ({ radius: vi.fn() })),
  drag: vi.fn(() => ({ on: vi.fn().mockReturnThis() }))
}));

describe('ForceDirectedGraph', () => {
  it('renders without crashing', () => {
    const nodes = [{ id: '1', label: 'KnowledgeAsset', properties: {}, metadata: {} }];
    const edges = [{ src_id: '1', dst_id: '2', relationship_type: 'USES', properties: {}, metadata: {} }];
    render(<ForceDirectedGraph nodes={nodes} edges={edges} />);
    expect(d3.select).toHaveBeenCalled();
    expect(d3.forceSimulation).toHaveBeenCalled();
  });
});
