"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import StatsCard from "../../../../../components/analytics/StatsCard";
import GoalCompletionChart from "../../../../../components/analytics/GoalCompletionChart";
import ExportButton from "../../../../../components/analytics/ExportButton";
import Skeleton from "../../../../../components/ui/Skeleton";
import { api } from "../../../../../lib/api";
import { usePermission } from "../../../../../hooks/usePermission";

const STALE_TIME = 2 * 60 * 1000;

const icons = {
  goals: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12h8M5 6h8M5 18h8" />
      <circle cx="18" cy="6" r="3" />
    </svg>
  ),
  completed: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12l4 4L19 6" />
    </svg>
  ),
  overdue: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 8v5m0 4h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4 20a6 6 0 0 1 16 0" />
    </svg>
  )
};

export default function AnalyticsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { hasPermission } = usePermission();

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId),
    staleTime: STALE_TIME
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics", workspaceId, "stats"],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/analytics/stats`);
      return response.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: STALE_TIME
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["analytics", workspaceId, "chart"],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/analytics/chart`);
      return response.data.data || [];
    },
    enabled: Boolean(workspaceId),
    staleTime: STALE_TIME
  });

  const goalTrend = useMemo(() => {
    if (!stats) return null;
    const lastWeek = stats.totalGoalsLastWeek ?? stats.totalGoals ?? 0;
    return stats.totalGoals - lastWeek;
  }, [stats]);

  const accentColor = workspace?.accentColor || "#6366f1";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Charts and progress metrics.</p>
        </div>
        <ExportButton workspaceId={workspaceId} canExport={hasPermission("export:data")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          [0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-28" />)
        ) : (
          <>
            <StatsCard
              label="Total Goals"
              value={stats?.totalGoals ?? 0}
              icon={icons.goals}
              trend={{ value: goalTrend }}
            />
            <StatsCard
              label="Completed This Week"
              value={stats?.completedThisWeek ?? 0}
              icon={icons.completed}
              badge={{ text: "This week", tone: "green" }}
            />
            <StatsCard
              label="Overdue Items"
              value={stats?.overdue ?? 0}
              icon={icons.overdue}
              badge={
                stats?.overdue > 0
                  ? { text: "Needs attention", tone: "red" }
                  : { text: "On track", tone: "slate" }
              }
            />
            <StatsCard
              label="Active Members"
              value={stats?.activeMembers ?? 0}
              icon={icons.members}
              badge={{ text: "Last 7 days", tone: "slate" }}
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Goal completion trends</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Created
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              Completed
            </span>
          </div>
        </div>
        {chartLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <GoalCompletionChart data={chartData || []} accentColor={accentColor} />
        )}
      </div>
    </section>
  );
}
