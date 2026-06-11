import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../src/store/useGraphStore';

describe('useGraphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({
      selectedNode: null,
      selectedAsset: null,
      selectedCase: null,
      darkMode: true,
      graphFilters: { showAssets: true, showCases: true, showGovernance: true },
    });
  });

  it('should select node, asset, and case', () => {
    const { setSelectedNode, setSelectedAsset, setSelectedCase } = useGraphStore.getState();
    
    setSelectedNode('node_1');
    setSelectedAsset('asset_1');
    setSelectedCase('case_1');

    const state = useGraphStore.getState();
    expect(state.selectedNode).toBe('node_1');
    expect(state.selectedAsset).toBe('asset_1');
    expect(state.selectedCase).toBe('case_1');
  });

  it('should toggle dark mode', () => {
    const { toggleDarkMode } = useGraphStore.getState();
    
    expect(useGraphStore.getState().darkMode).toBe(true);
    toggleDarkMode();
    expect(useGraphStore.getState().darkMode).toBe(false);
  });

  it('should update graph filters', () => {
    const { setGraphFilter } = useGraphStore.getState();
    
    setGraphFilter('showAssets', false);
    expect(useGraphStore.getState().graphFilters.showAssets).toBe(false);
  });
});
