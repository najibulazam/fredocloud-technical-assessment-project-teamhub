"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import StatsCard from "../../../components/analytics/StatsCard";
import Avatar from "../../../components/ui/Avatar";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);

  const workspaceFromUser =
    user?.workspaceMemberships?.[0]?.workspace || user?.workspace || null;
  const workspace = currentWorkspace || workspaceFromUser;
  const workspaceId = workspace?.id;

  useEffect(() => {
    if (workspace && (!currentWorkspace || currentWorkspace.id !== workspace.id)) {
      setCurrentWorkspace(workspace);
    }
  }, [workspace, currentWorkspace, setCurrentWorkspace]);

  const { data: goalsData } = useQuery({
    queryKey: ["dashboard", "goals", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/goals`);
      return response.data.goals || [];
    },
    enabled: Boolean(workspaceId)
  });

  const { data: actionItemsData } = useQuery({
    queryKey: ["dashboard", "action-items", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/action-items`);
      return response.data.actionItems || [];
    },
    enabled: Boolean(workspaceId)
  });

  const { data: announcementsData } = useQuery({
    queryKey: ["dashboard", "announcements", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/announcements`);
      return response.data.announcements || [];
    },
    enabled: Boolean(workspaceId)
  });

  const { data: workspaceData } = useQuery({
    queryKey: ["dashboard", "workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  const goals = useMemo(() => goalsData || [], [goalsData]);
  const actionItems = useMemo(() => actionItemsData || [], [actionItemsData]);
  const announcements = useMemo(() => announcementsData || [], [announcementsData]);
  const members = useMemo(() => workspaceData?.members || [], [workspaceData?.members]);
  const topMembers = useMemo(() => members.slice(0, 5), [members]);

  const recentGoals = useMemo(() => goals.slice(0, 3), [goals]);
  const recentActionItems = useMemo(() => actionItems.slice(0, 3), [actionItems]);
  const recentAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);

  if (!workspaceId) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">Select or create a workspace to see activity.</p>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p>Use the workspace switcher in the sidebar to pick a workspace.</p>
          <p className="mt-2">If you have no workspace yet, create one from the switcher menu.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Overview for {workspace?.name || "your workspace"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard label="Goals" value={goals.length} />
        <StatsCard label="Action Items" value={actionItems.length} />
        <StatsCard label="Announcements" value={announcements.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Goals</h2>
            <Link
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
              href={`/workspace/${workspaceId}/goals`}
            >
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentGoals.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500">No goals yet.</p>
            )}
            {recentGoals.map((goal) => (
              <Link
                key={goal.id}
                href={`/workspace/${workspaceId}/goals/${goal.id}`}
                className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{goal.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {goal.status?.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Action Items</h2>
            <Link
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
              href={`/workspace/${workspaceId}/action-items`}
            >
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentActionItems.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500">No action items yet.</p>
            )}
            {recentActionItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Announcements</h2>
            <Link
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
              href={`/workspace/${workspaceId}/announcements`}
            >
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentAnnouncements.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500">No announcements yet.</p>
            )}
            {recentAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <div className="truncate">Announcement #{announcement.id}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace Members</h2>
          <Link
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
            href={`/workspace/${workspaceId}/members`}
          >
            See more
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Top 5 members in this workspace.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {topMembers.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-500">No members yet.</p>
          )}
          {topMembers.map((member) => {
            const displayName = member.user?.name || member.user?.email || "Member";
            return (
              <div
                key={member.userId}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <Avatar name={displayName} src={member.user?.avatarUrl} className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">{member.role}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
