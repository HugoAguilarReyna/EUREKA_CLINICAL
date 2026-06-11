import { create } from 'zustand';

interface GraphState {
  selectedNode: any | null;
  selectedAsset: string | null;
  selectedCase: string | null;
  darkMode: boolean;
  graphFilters: Record<string, boolean>;
  
  setSelectedNode: (node: any | null) => void;
  setSelectedAsset: (id: string | null) => void;
  setSelectedCase: (id: string | null) => void;
  toggleDarkMode: () => void;
  setGraphFilter: (key: string, value: boolean) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  selectedNode: null,
  selectedAsset: null,
  selectedCase: null,
  darkMode: true,
  graphFilters: {
    showAssets: true,
    showCases: true,
    showGovernance: true,
  },
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedAsset: (id) => set({ selectedAsset: id }),
  setSelectedCase: (id) => set({ selectedCase: id }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setGraphFilter: (key, value) => 
    set((state) => ({ 
      graphFilters: { ...state.graphFilters, [key]: value } 
    })),
}));
