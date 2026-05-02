"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Avatar from "../../../../../components/ui/Avatar";
import { api } from "../../../../../lib/api";
import { useAuthStore } from "../../../../../store/authStore";
import { useUiStore } from "../../../../../store/uiStore";

export default function WorkspaceMembersPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace-members-page", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, nextRole }) =>
      api.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role: nextRole }).then((res) => res.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-members-page", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      showToast({ message: "Member role updated", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to update role", variant: "error" }, 3000);
    }
  });

  const removeMember = useMutation({
    mutationFn: (memberId) =>
      api.delete(`/workspaces/${workspaceId}/members/${memberId}`).then((res) => res.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-members-page", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      showToast({ message: "Member removed", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to remove member", variant: "error" }, 3000);
    }
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading members...</p>;
  }

  if (!workspace) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Workspace not found.</p>;
  }

  const members = workspace.members || [];
  const myMembership = members.find((member) => member.userId === user?.id) || null;
  const canManageMembers = myMembership?.role === "ADMIN";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Workspace Members</h1>
        <p className="text-slate-600 dark:text-slate-400">
          All members in {workspace.name || "this workspace"}.
        </p>
        {!canManageMembers && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Only admins can change roles or remove members.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-3">
          {members.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500">No members yet.</p>
          )}
          {members.map((member) => {
            const displayName = member.user?.name || member.user?.email || "Member";
            return (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={displayName} src={member.user?.avatarUrl} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-900 dark:text-slate-100">{displayName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageMembers ? (
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      value={member.role}
                      onChange={(event) =>
                        updateRole.mutate({
                          memberId: member.userId,
                          nextRole: event.target.value
                        })
                      }
                      disabled={updateRole.isPending}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {member.role}
                    </span>
                  )}

                  {canManageMembers && member.userId !== user?.id && (
                    <button
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      onClick={() => removeMember.mutate(member.userId)}
                      disabled={removeMember.isPending}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
