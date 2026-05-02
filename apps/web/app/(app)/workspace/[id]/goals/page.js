"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GoalCard from "../../../../../components/goals/GoalCard";
import Modal from "../../../../../components/ui/Modal";
import Skeleton from "../../../../../components/ui/Skeleton";
import RichTextEditor from "../../../../../components/announcements/RichTextEditor";
import { api } from "../../../../../lib/api";
import { usePermission } from "../../../../../hooks/usePermission";
import { useWorkspaceStore } from "../../../../../store/workspaceStore";

const statusOptions = ["ALL", "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function WorkspaceGoalsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const accentColor = currentWorkspace?.accentColor || "#6366f1";

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const { data: workspaceData } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals", workspaceId, statusFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response = await api.get(`/workspaces/${workspaceId}/goals`, { params });
      return response.data.goals || [];
    },
    enabled: Boolean(workspaceId)
  });

  const createGoal = useMutation({
    mutationFn: (payload) => api.post(`/workspaces/${workspaceId}/goals`, payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", workspaceId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setOwnerId("");
    }
  });

  const members = workspaceData?.members || [];

  const filteredGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter((goal) => {
      const matchesOwner = ownerFilter === "ALL" || String(goal.ownerId) === ownerFilter;
      const matchesSearch =
        goal.title?.toLowerCase().includes(search.toLowerCase()) ||
        goal.description?.toLowerCase().includes(search.toLowerCase());
      return matchesOwner && matchesSearch;
    });
  }, [goals, ownerFilter, search]);

  const handleSubmit = (event) => {
    event.preventDefault();
    createGoal.mutate({
      title,
      description,
      dueDate: dueDate || null,
      ownerId: ownerId || null
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Goals</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Track and update workspace goals.</p>
        </div>
        {hasPermission("create:goal") && (
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            New Goal
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
        >
          <option value="ALL">All owners</option>
          {members.map((member) => (
            <option key={member.userId} value={String(member.userId)}>
              {member.user?.name || member.user?.email || "Member"}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 sm:flex-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder="Search goals"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              workspaceId={workspaceId}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}

      <Modal open={open} title="New Goal" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Goal title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <RichTextEditor content={description} onChange={setDescription} />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              <option value="">Assign owner</option>
              {members.map((member) => (
                <option key={member.userId} value={String(member.userId)}>
                  {member.user?.name || member.user?.email || "Member"}
                </option>
              ))}
            </select>
          </div>
          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            type="submit"
            disabled={createGoal.isPending}
          >
            {createGoal.isPending ? "Saving..." : "Create Goal"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
