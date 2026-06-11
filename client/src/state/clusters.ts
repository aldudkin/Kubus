import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClustersState {
  /** Context names the user has connected (multi-select). */
  selected: string[];
  /** Namespace filter — empty means all namespaces. */
  namespaces: string[];
  themeMode: 'light' | 'dark';
  setSelected: (selected: string[]) => void;
  toggleContext: (name: string) => void;
  setNamespaces: (namespaces: string[]) => void;
  toggleTheme: () => void;
}

export const useClustersStore = create<ClustersState>()(
  persist(
    (set) => ({
      selected: [],
      namespaces: [],
      themeMode: window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark',
      setSelected: (selected) => set({ selected }),
      toggleContext: (name) =>
        set((s) => ({
          selected: s.selected.includes(name) ? s.selected.filter((n) => n !== name) : [...s.selected, name],
        })),
      setNamespaces: (namespaces) => set({ namespaces }),
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'kubedeck-clusters' },
  ),
);
