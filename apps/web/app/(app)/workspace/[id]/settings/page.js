"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Avatar from "../../../../../components/ui/Avatar";
import { api } from "../../../../../lib/api";
import { useAuthStore } from "../../../../../store/authStore";
import { useWorkspaceStore } from "../../../../../store/workspaceStore";
import { usePermission } from "../../../../../hooks/usePermission";
import { useUiStore } from "../../../../../store/uiStore";

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const showToast = useUiStore((state) => state.showToast);

  const [profileName, setProfileName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    setProfileName(user?.name || "");
  }, [user?.name]);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name || "");
    setDescription(workspace.description || "");
    setAccentColor(workspace.accentColor || "#6366f1");
    setCurrentWorkspace(workspace);
  }, [workspace, setCurrentWorkspace]);

  const membership = useMemo(() => {
    if (!workspace?.members || !user?.id) return null;
    return workspace.members.find((member) => member.userId === user.id) || null;
  }, [workspace?.members, user?.id]);

  const { hasPermission, role: permissionRole } = usePermission();
  const role = permissionRole || membership?.role || null;
  const canUpdate = hasPermission("update:workspace") || role === "ADMIN";
  const canInvite = hasPermission("invite:member") || role === "ADMIN";
  const canAssign = hasPermission("assign:role") || role === "ADMIN";
  const canRemove = hasPermission("remove:member") || role === "ADMIN";

  const updateWorkspace = useMutation({
    mutationFn: () =>
      api
        .put(`/workspaces/${workspaceId}`, {
          name,
          description,
          accentColor
        })
        .then((res) => res.data.workspace),
    onSuccess: (updated) => {
      queryClient.setQueryData(["workspace", workspaceId], (current) => {
        if (!current) return updated;
        return { ...current, ...updated };
      });
      const nextWorkspace = { ...(workspace || {}), ...(updated || {}) };
      if (nextWorkspace?.id) {
        setCurrentWorkspace(nextWorkspace);
      }
      showToast({ message: "Workspace updated", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to update workspace", variant: "error" }, 3000);
    }
  });

  const updatePersonalProfile = useMutation({
    mutationFn: async () => {
      const payload = {};
      if (profileName.trim() && profileName.trim() !== user?.name) {
        payload.name = profileName.trim();
      }
      if (Object.keys(payload).length) {
        await updateProfile(payload);
      }
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }
      return true;
    },
    onSuccess: async () => {
      setAvatarFile(null);
      await useAuthStore.getState().initialize();
      showToast({ message: "Profile updated", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to update profile", variant: "error" }, 3000);
    }
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: ["workspace-join-requests", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/join-requests`);
      return response.data.requests || [];
    },
    enabled: Boolean(workspaceId && canInvite)
  });

  const approveJoinRequest = useMutation({
    mutationFn: (requestId) =>
      api.post(`/workspaces/${workspaceId}/join-requests/${requestId}/approve`).then((res) => res.data),
    onSuccess: async (_, requestId) => {
      queryClient.setQueryData(["workspace-join-requests", workspaceId], (current = []) =>
        current.filter((request) => request.id !== requestId)
      );
      await queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showToast({ message: "Join request approved", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to approve request", variant: "error" }, 3000);
    }
  });

  const inviteMember = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail }).then((res) => res.data),
    onSuccess: () => {
      showToast({ message: "Invite sent", variant: "success" }, 2000);
      setInviteEmail("");
    },
    onError: () => {
      showToast({ message: "Failed to send invite", variant: "error" }, 3000);
    }
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, nextRole }) =>
      api.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role: nextRole }).then((res) => res.data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["workspace", workspaceId], (current) => {
        if (!current) return current;
        return {
          ...current,
          members: (current.members || []).map((member) =>
            member.userId === variables.memberId
              ? { ...member, role: data?.membership?.role || variables.nextRole }
              : member
          )
        };
      });
      showToast({ message: "Role updated", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to update role", variant: "error" }, 3000);
    }
  });

  const removeMember = useMutation({
    mutationFn: (memberId) =>
      api.delete(`/workspaces/${workspaceId}/members/${memberId}`).then((res) => res.data),
    onSuccess: (_, memberId) => {
      queryClient.setQueryData(["workspace", workspaceId], (current) => {
        if (!current) return current;
        return {
          ...current,
          members: (current.members || []).filter((member) => member.userId !== memberId)
        };
      });
      showToast({ message: "Member removed", variant: "success" }, 2000);
    },
    onError: () => {
      showToast({ message: "Failed to remove member", variant: "error" }, 3000);
    }
  });

  if (isLoading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;
  }

  if (!workspace) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Workspace Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Workspace not found.</p>
      </section>
    );
  }

  const members = workspace.members || [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Workspace Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage members, roles, and preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Profile</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Update your name and avatar image.</p>
          <div className="mt-4 space-y-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Avatar name={user?.name || user?.email || "User"} src={user?.avatarUrl} className="h-12 w-12" />
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Profile Name</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avatar Image</label>
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-xs file:text-slate-700 hover:file:bg-slate-100 dark:text-slate-300 dark:file:border-slate-700 dark:file:bg-slate-900 dark:file:text-slate-200 dark:hover:file:bg-slate-800"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              />
              {avatarFile && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Selected: {avatarFile.name}</p>
              )}
            </div>
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => updatePersonalProfile.mutate()}
              disabled={updatePersonalProfile.isPending || (!avatarFile && profileName.trim() === (user?.name || ""))}
            >
              {updatePersonalProfile.isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Workspace Profile</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Update name, description, and accent color.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canUpdate}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!canUpdate}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accent Color</label>
            <div className="mt-2 flex items-center gap-3">
                <input
                  className="h-10 w-14 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  disabled={!canUpdate}
                />
                <input
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  disabled={!canUpdate}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => updateWorkspace.mutate()}
                disabled={!canUpdate || updateWorkspace.isPending}
              >
                {updateWorkspace.isPending ? "Saving..." : "Save changes"}
              </button>
              {!canUpdate && (
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  You do not have permission to update this workspace.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Invite Member</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Send an invite by email.</p>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              disabled={!canInvite}
            />
            <button
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canInvite || !inviteEmail || inviteMember.isPending}
              onClick={() => inviteMember.mutate()}
            >
              {inviteMember.isPending ? "Sending..." : "Send invite"}
            </button>
            {!canInvite && (
              <p className="text-xs text-slate-500 dark:text-slate-500">
                You do not have permission to invite members.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Members</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Manage roles and access.</p>
        <div className="mt-4 space-y-3">
          {members.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500">No members found.</p>
          )}
          {members.map((member) => {
            const isSelf = member.userId === user?.id;
            const displayName = member.user?.name || member.user?.email || "Member";
            return (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} src={member.user?.avatarUrl} className="h-8 w-8" />
                  <div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">{displayName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">{member.user?.email}</div>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  {canAssign ? (
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      value={member.role}
                      onChange={(event) =>
                        updateRole.mutate({
                          memberId: member.userId,
                          nextRole: event.target.value
                        })
                      }
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {member.role}
                    </span>
                  )}
                  {canRemove && !isSelf && (
                    <button
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      onClick={() => removeMember.mutate(member.userId)}
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

      {canInvite && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Join Requests</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            Approve pending requests to add members to this workspace.
          </p>
          <div className="mt-4 space-y-3">
            {joinRequests.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-500">No pending join requests.</p>
            )}
            {joinRequests.map((request) => {
              const displayName = request.requester?.name || request.requester?.email || "User";
              return (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={displayName}
                      src={request.requester?.avatarUrl}
                      className="h-8 w-8"
                    />
                    <div>
                      <div className="text-sm text-slate-900 dark:text-slate-100">{displayName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {request.requester?.email}
                      </div>
                    </div>
                  </div>
                  <button
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    onClick={() => approveJoinRequest.mutate(request.id)}
                    disabled={approveJoinRequest.isPending}
                  >
                    {approveJoinRequest.isPending ? "Approving..." : "Approve"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
