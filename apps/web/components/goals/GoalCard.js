"use client";

import { useRouter } from "next/navigation";
import Avatar from "../ui/Avatar";

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const statusStyles = {
  NOT_STARTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "text-white",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-rose-500/20 text-rose-300"
};

const getProgress = (goal) => {
  if (Array.isArray(goal?.milestones) && goal.milestones.length > 0) {
    const sum = goal.milestones.reduce((total, milestone) => total + (milestone.progress || 0), 0);
    return Math.round(sum / goal.milestones.length);
  }
  return goal?.progress || 0;
};

export default function GoalCard({ goal, workspaceId, accentColor }) {
  const router = useRouter();
  const dueDate = goal?.dueDate ? new Date(goal.dueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() && goal?.status !== "COMPLETED" : false;
  const progress = getProgress(goal);
  const owner = goal?.owner || { name: "Owner", avatarUrl: null };
  const description = stripHtml(goal?.description || "");

  return (
    <article
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
      onClick={() => router.push(`/workspace/${workspaceId}/goals/${goal?.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{goal?.title || "Untitled goal"}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {description || "No description"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${statusStyles[goal?.status] || statusStyles.NOT_STARTED}`}
          style={goal?.status === "IN_PROGRESS" ? { backgroundColor: accentColor } : undefined}
        >
          {goal?.status?.replace("_", " ") || "NOT STARTED"}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Avatar name={owner?.name} src={owner?.avatarUrl} className="h-7 w-7" />
          <span>{owner?.name || "Owner"}</span>
        </div>
        <span className={`text-xs ${isOverdue ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>
          {dueDate ? dueDate.toLocaleDateString() : "No due date"}
        </span>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-2 rounded-full bg-indigo-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Progress {progress}%</p>
      </div>
    </article>
  );
}
