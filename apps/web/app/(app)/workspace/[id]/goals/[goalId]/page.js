"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Avatar from "../../../../../../components/ui/Avatar";
import { api } from "../../../../../../lib/api";
import { getSocket } from "../../../../../../lib/socket";
import { useOptimisticMutation } from "../../../../../../hooks/useOptimistic";

const statuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function GoalDetailPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const goalId = Number(params.goalId);
  const queryClient = useQueryClient();
  const [newMilestone, setNewMilestone] = useState("");
  const [updateText, setUpdateText] = useState("");

  const { data: goal, isLoading } = useQuery({
    queryKey: ["goal", workspaceId, goalId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/goals/${goalId}`);
      return response.data.goal;
    },
    enabled: Boolean(workspaceId && goalId)
  });

  const descriptionEditor = useEditor({
    extensions: [StarterKit],
    content: goal?.description || "",
    editable: false
  });

  useEffect(() => {
    if (descriptionEditor && goal?.description !== undefined) {
      descriptionEditor.commands.setContent(goal.description || "", false);
    }
  }, [descriptionEditor, goal?.description]);

  const statusMutation = useOptimisticMutation({
    queryKey: ["goal", workspaceId, goalId],
    mutationFn: ({ status }) =>
      api.put(`/workspaces/${workspaceId}/goals/${goalId}`, { status }).then((res) => res.data),
    updateFn: (current, variables, data) => {
      if (!current) return current;
      const nextStatus = data?.goal?.status || variables.status;
      return { ...current, status: nextStatus };
    }
  });

  const milestoneMutation = useOptimisticMutation({
    queryKey: ["goal", workspaceId, goalId],
    mutationFn: ({ milestoneId, progress }) =>
      api
        .put(`/goals/${goalId}/milestones/${milestoneId}`, { progress })
        .then((res) => res.data),
    updateFn: (current, variables, data) => {
      if (!current) return current;
      const next = (current.milestones || []).map((milestone) =>
        milestone.id === variables.milestoneId
          ? { ...milestone, progress: variables.progress }
          : milestone
      );
      return { ...current, milestones: data?.milestone ? next : next };
    }
  });

  const addMilestone = useMutation({
    mutationFn: () =>
      api
        .post(`/goals/${goalId}/milestones`, { title: newMilestone, progress: 0 })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(["goal", workspaceId, goalId], (current) => {
        if (!current) return current;
        return { ...current, milestones: [...(current.milestones || []), data.milestone] };
      });
      setNewMilestone("");
    }
  });

  const postUpdate = useMutation({
    mutationFn: () =>
      api
        .post(`/workspaces/${workspaceId}/goals/${goalId}/updates`, { content: updateText })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(["goal", workspaceId, goalId], (current) => {
        if (!current) return current;
        return { ...current, updates: [data.update, ...(current.updates || [])] };
      });
      const socket = getSocket();
      socket.emit("goal:update:new", data.update);
      setUpdateText("");
    }
  });

  useEffect(() => {
    const socket = getSocket();

    const handleGoalUpdated = (payload) => {
      if (payload?.id !== goalId) return;
      queryClient.setQueryData(["goal", workspaceId, goalId], (current) => {
        if (!current) return current;
        return { ...current, status: payload.status || current.status };
      });
      queryClient.setQueriesData({ queryKey: ["goals", workspaceId] }, (current) => {
        if (!current) return current;
        const list = Array.isArray(current) ? current : current.goals || [];
        const updated = list.map((item) =>
          item.id === payload.id ? { ...item, status: payload.status || item.status } : item
        );
        return Array.isArray(current) ? updated : { ...current, goals: updated };
      });
    };

    const handleGoalUpdate = (payload) => {
      if (!payload?.goalId || payload.goalId !== goalId) return;
      queryClient.setQueryData(["goal", workspaceId, goalId], (current) => {
        if (!current) return current;
        return { ...current, updates: [payload, ...(current.updates || [])] };
      });
    };

    socket.on("goal:updated", handleGoalUpdated);
    socket.on("goal:update:new", handleGoalUpdate);

    return () => {
      socket.off("goal:updated", handleGoalUpdated);
      socket.off("goal:update:new", handleGoalUpdate);
    };
  }, [goalId, workspaceId, queryClient]);

  const milestones = useMemo(() => goal?.milestones || [], [goal?.milestones]);
  const updates = useMemo(() => goal?.updates || [], [goal?.updates]);
  const actionItems = useMemo(() => goal?.actionItems || [], [goal?.actionItems]);

  const averageProgress = useMemo(() => {
    if (!milestones.length) return 0;
    const total = milestones.reduce((sum, milestone) => sum + (milestone.progress || 0), 0);
    return Math.round(total / milestones.length);
  }, [milestones]);

  if (isLoading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{goal?.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Progress {averageProgress}%</p>
            </div>
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={goal?.status}
              onChange={(event) => {
                const status = event.target.value;
                statusMutation.mutate(
                  { status },
                  {
                    onSuccess: () => {
                      queryClient.setQueriesData({ queryKey: ["goals", workspaceId] }, (current) => {
                        if (!current) return current;
                        const list = Array.isArray(current) ? current : current.goals || [];
                        const updated = list.map((item) =>
                          item.id === goalId ? { ...item, status } : item
                        );
                        return Array.isArray(current) ? updated : { ...current, goals: updated };
                      });
                    }
                  }
                );
              }}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <EditorContent editor={descriptionEditor} />
          </div>
          <div className="mt-4 text-xs text-slate-500 dark:text-slate-500">
            Due {goal?.dueDate ? new Date(goal.dueDate).toLocaleDateString() : "No due date"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Milestones</h2>
          <div className="mt-4 space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{milestone.title}</p>
                  <span className="text-xs text-slate-500 dark:text-slate-500">{milestone.progress}%</span>
                </div>
                <input
                  className="mt-3 w-full accent-indigo-500"
                  type="range"
                  min="0"
                  max="100"
                  value={milestone.progress || 0}
                  onChange={(event) =>
                    milestoneMutation.mutate(
                      {
                        milestoneId: milestone.id,
                        progress: Number(event.target.value)
                      },
                      {
                        onSuccess: (data) => {
                          const socket = getSocket();
                          socket.emit("milestone:updated", data?.milestone || {
                            id: milestone.id,
                            progress: Number(event.target.value)
                          });
                        }
                      }
                    )
                  }
                />
              </div>
            ))}
          </div>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (newMilestone.trim()) {
                addMilestone.mutate();
              }
            }}
          >
            <input
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="Add milestone"
              value={newMilestone}
              onChange={(event) => setNewMilestone(event.target.value)}
            />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white sm:w-auto" type="submit">
              Add
            </button>
          </form>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Feed</h2>
          <div className="mt-4 space-y-3">
            {updates.map((update) => (
              <div key={update.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <Avatar name={update.author?.name} src={update.author?.avatarUrl} className="h-8 w-8" />
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{update.content}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {new Date(update.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (updateText.trim()) {
                postUpdate.mutate();
              }
            }}
          >
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              rows={3}
              placeholder="Share an update"
              value={updateText}
              onChange={(event) => setUpdateText(event.target.value)}
            />
            <button className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
              Post update
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Linked Action Items</h2>
          <div className="mt-4 space-y-2">
            {actionItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-sm text-slate-700 dark:text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{item.status}</p>
              </div>
            ))}
            {actionItems.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-500">No action items linked yet.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
