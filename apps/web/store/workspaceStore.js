import { create } from "zustand";

export const useWorkspaceStore = create((set) => ({
  currentWorkspace: null,
  workspaces: [],
  onlineMembers: {},
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setOnlineMembers: (workspaceId, members) =>
    set((state) => ({
      onlineMembers: {
        ...state.onlineMembers,
        [workspaceId]: members
      }
    }))
}));
