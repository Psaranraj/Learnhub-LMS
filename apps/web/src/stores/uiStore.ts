import { create } from 'zustand';

type UiState = {
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}));
