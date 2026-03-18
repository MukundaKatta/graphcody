import { create } from "zustand";
import type { Repository, ChatSession, SearchFilters, GraphData } from "@/types";

interface AppState {
  // Repositories
  repositories: Repository[];
  activeRepo: Repository | null;
  setRepositories: (repos: Repository[]) => void;
  setActiveRepo: (repo: Repository | null) => void;
  updateRepo: (id: string, update: Partial<Repository>) => void;

  // Graph
  graphData: GraphData | null;
  selectedNodeId: string | null;
  graphLayout: "force" | "tree" | "radial";
  setGraphData: (data: GraphData | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setGraphLayout: (layout: "force" | "tree" | "radial") => void;

  // Search
  searchFilters: SearchFilters;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;

  // Chat
  activeChatSession: ChatSession | null;
  setActiveChatSession: (session: ChatSession | null) => void;

  // UI
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  repositories: [],
  activeRepo: null,
  setRepositories: (repositories) => set({ repositories }),
  setActiveRepo: (activeRepo) => set({ activeRepo }),
  updateRepo: (id, update) =>
    set((state) => ({
      repositories: state.repositories.map((r) =>
        r.id === id ? { ...r, ...update } : r
      ),
      activeRepo:
        state.activeRepo?.id === id
          ? { ...state.activeRepo, ...update }
          : state.activeRepo,
    })),

  graphData: null,
  selectedNodeId: null,
  graphLayout: "force",
  setGraphData: (graphData) => set({ graphData }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setGraphLayout: (graphLayout) => set({ graphLayout }),

  searchFilters: { query: "" },
  setSearchFilters: (filters) =>
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...filters },
    })),

  activeChatSession: null,
  setActiveChatSession: (activeChatSession) => set({ activeChatSession }),

  sidebarOpen: true,
  commandPaletteOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
