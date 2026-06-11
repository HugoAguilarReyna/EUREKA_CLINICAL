import { create } from 'zustand';

interface AppState {
  currentCaseId: string | null;
  setCurrentCaseId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentCaseId: null,
  setCurrentCaseId: (id) => set({ currentCaseId: id }),
}));
