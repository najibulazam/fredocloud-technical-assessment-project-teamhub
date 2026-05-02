import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useWorkspaceStore } from "../store/workspaceStore";

export function usePermission() {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["permissions", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/permissions`);
      return response.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000
  });

  const hasPermission = (action) => Boolean(data?.matrix?.[action]);

  return {
    hasPermission,
    permissions: data?.permissions || [],
    role: data?.role || null,
    isLoading
  };
}
