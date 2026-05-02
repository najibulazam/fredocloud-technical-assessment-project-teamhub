import { create } from "zustand";
import { api, setAuthLogoutHandler } from "../lib/api";
import { useWorkspaceStore } from "./workspaceStore";

const syncWorkspaceState = (user) => {
  const memberships = Array.isArray(user?.workspaceMemberships) ? user.workspaceMemberships : [];
  const workspaces = memberships
    .map((membership) => membership.workspace)
    .filter((workspace) => workspace && workspace.id);
  const workspaceStore = useWorkspaceStore.getState();
  workspaceStore.setWorkspaces(workspaces);

  const currentWorkspace = workspaceStore.currentWorkspace;
  if (!workspaces.length) {
    workspaceStore.setCurrentWorkspace(null);
    return;
  }

  if (!currentWorkspace || !workspaces.some((workspace) => workspace.id === currentWorkspace.id)) {
    workspaceStore.setCurrentWorkspace(workspaces[0]);
  }
};

export const useAuthStore = create((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  initialize: async () => {
    try {
      const response = await api.get("/auth/me", { skipAuthRefresh: true });
      const user = response.data.user;
      const permissions = user?.permissions || response.data.permissions || [];
      set({ user, permissions, isAuthenticated: true });
      syncWorkspaceState(user);
    } catch (error) {
      set({ user: null, permissions: [], isAuthenticated: false });
      const workspaceStore = useWorkspaceStore.getState();
      workspaceStore.setCurrentWorkspace(null);
      workspaceStore.setWorkspaces([]);
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (data) => {
    await api.post("/auth/login", data, { skipAuthRefresh: true });
    await get().initialize();
    return { ok: true };
  },
  register: async (data) => {
    await api.post("/auth/register", data, { skipAuthRefresh: true });
    await get().initialize();
    return { ok: true };
  },
  logout: async () => {
    try {
      await api.post("/auth/logout", null, { skipAuthRefresh: true });
    } catch (error) {
      // Ignore logout errors.
    }
    set({ user: null, permissions: [], isAuthenticated: false });
    const workspaceStore = useWorkspaceStore.getState();
    workspaceStore.setCurrentWorkspace(null);
    workspaceStore.setWorkspaces([]);
  },
  updateProfile: async (data) => {
    const response = await api.put("/users/profile", data);
    const user = response.data.user;
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : user
    }));
    syncWorkspaceState(useAuthStore.getState().user);
    return response.data;
  },
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.put("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    const user = response.data.user;
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : user
    }));
    return response.data;
  }
}));

setAuthLogoutHandler(async () => {
  const logout = useAuthStore.getState().logout;
  await logout();
});
