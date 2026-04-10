import { create } from 'zustand';

export type SelectionType = 'service' | 'gateway' | 'external' | 'datastore' | 'contract' | null;

interface SelectionState {
  selectedId: string | null;
  selectedType: SelectionType;
  setSelected: (id: string | null, type: SelectionType) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedId: null,
  selectedType: null,
  setSelected: (id, type) => set({ selectedId: id, selectedType: type }),
  clearSelection: () => set({ selectedId: null, selectedType: null }),
}));
