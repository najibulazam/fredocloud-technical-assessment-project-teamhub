"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import KanbanBoard from "../../../../../components/action-items/KanbanBoard";
import ListView from "../../../../../components/action-items/ListView";
import ActionItemForm from "../../../../../components/action-items/ActionItemForm";
import Modal from "../../../../../components/ui/Modal";
import Skeleton from "../../../../../components/ui/Skeleton";
import { api } from "../../../../../lib/api";
import { getSocket } from "../../../../../lib/socket";

const statusFilters = ["ALL", "TODO", "IN_PROGRESS", "DONE"];
const priorityFilters = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

const ensureArray = (value) => (Array.isArray(value) ? value : value?.actionItems || []);

const updateCacheList = (current, updater) => {
  if (!current) return current;
  const items = ensureArray(current);
  const next = updater(items);
  return Array.isArray(current) ? next : { ...current, actionItems: next };
};

export default function ActionItemsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const queryClient = useQueryClient();

  const [view, setView] = useState("kanban");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [goalFilter, setGoalFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("actionItemsView");
    if (stored === "kanban" || stored === "list") {
      setView(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("actionItemsView", view);
  }, [view]);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", workspaceId, "actionItems"],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/goals`);
      return response.data.goals || [];
    },
    enabled: Boolean(workspaceId)
  });

  const { data: actionItems, isLoading } = useQuery({
    queryKey: ["actionItems", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/action-items`);
      return response.data.actionItems || [];
    },
    enabled: Boolean(workspaceId)
  });

  const createActionItem = useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/action-items`, payload).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(["actionItems", workspaceId], (current) =>
        updateCacheList(current, (items) => {
          if (items.some((item) => item.id === data.actionItem?.id)) return items;
          return data.actionItem ? [data.actionItem, ...items] : items;
        })
      );
      setOpen(false);
    }
  });

  useEffect(() => {
    if (!workspaceId) return;
    const socket = getSocket();

    const handleUpdated = (payload) => {
      if (payload?.entity && payload.entity !== "actionItem") return;
      const id = payload?.id || payload?.actionItem?.id;
      if (!id) return;

      queryClient.setQueryData(["actionItems", workspaceId], (current) =>
        updateCacheList(current, (items) =>
          items.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              ...payload.actionItem,
              status: payload.status || payload.actionItem?.status || item.status
            };
          })
        )
      );
    };

    const handleCreated = (payload) => {
      const actionItem = payload?.actionItem;
      if (!actionItem) return;
      queryClient.setQueryData(["actionItems", workspaceId], (current) =>
        updateCacheList(current, (items) => {
          if (items.some((item) => item.id === actionItem.id)) return items;
          return [actionItem, ...items];
        })
      );
    };

    const handleDeleted = (payload) => {
      const id = payload?.actionItemId;
      if (!id) return;
      queryClient.setQueryData(["actionItems", workspaceId], (current) =>
        updateCacheList(current, (items) => items.filter((item) => item.id !== id))
      );
    };

    socket.on("actionItem:updated", handleUpdated);
    socket.on("actionItem:created", handleCreated);
    socket.on("actionItem:deleted", handleDeleted);

    return () => {
      socket.off("actionItem:updated", handleUpdated);
      socket.off("actionItem:created", handleCreated);
      socket.off("actionItem:deleted", handleDeleted);
    };
  }, [workspaceId, queryClient]);

  const members = useMemo(() => workspace?.members || [], [workspace?.members]);
  const goalsList = useMemo(() => goals || [], [goals]);

  const membersById = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.userId] = member.user;
      return acc;
    }, {});
  }, [members]);

  const goalsById = useMemo(() => {
    return goalsList.reduce((acc, goal) => {
      acc[goal.id] = goal;
      return acc;
    }, {});
  }, [goalsList]);

  const decoratedItems = useMemo(() => {
    return (actionItems || []).map((item) => ({
      ...item,
      assignee: item.assigneeId ? membersById[item.assigneeId] : null,
      goal: item.goalId ? goalsById[item.goalId] : null
    }));
  }, [actionItems, membersById, goalsById]);

  const filteredItems = useMemo(() => {
    return decoratedItems.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === "ALL" ||
        (assigneeFilter === "UNASSIGNED"
          ? !item.assigneeId
          : String(item.assigneeId) === assigneeFilter);
      const matchesGoal = goalFilter === "ALL" || String(item.goalId || "") === goalFilter;
      const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesPriority && matchesAssignee && matchesGoal && matchesSearch;
    });
  }, [decoratedItems, statusFilter, priorityFilter, assigneeFilter, goalFilter, search]);

  const handleCreate = (values) => {
    createActionItem.mutate({
      title: values.title,
      assigneeId: values.assigneeId ? Number(values.assigneeId) : undefined,
      goalId: values.goalId ? Number(values.goalId) : undefined,
      priority: values.priority || "MEDIUM",
      dueDate: values.dueDate || undefined
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Action Items</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage tasks across the workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
            <button
              className={`rounded-md px-3 py-1 ${
                view === "kanban"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
              onClick={() => setView("kanban")}
            >
              Kanban
            </button>
            <button
              className={`rounded-md px-3 py-1 ${
                view === "list"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            New Action Item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          {priorityFilters.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
        >
          <option value="ALL">All assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={String(member.userId)}>
              {member.user?.name || member.user?.email || "Member"}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={goalFilter}
          onChange={(event) => setGoalFilter(event.target.value)}
        >
          <option value="ALL">All goals</option>
          {goalsList.map((goal) => (
            <option key={goal.id} value={String(goal.id)}>
              {goal.title}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 sm:flex-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder="Search action items"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-36" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
          No action items match your filters.
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          items={filteredItems}
          members={members}
          workspaceId={workspaceId}
          queryKey={["actionItems", workspaceId]}
        />
      ) : (
        <ListView
          items={filteredItems}
          workspaceId={workspaceId}
          queryKey={["actionItems", workspaceId]}
        />
      )}

      <Modal open={open} title="New Action Item" onClose={() => setOpen(false)}>
        <ActionItemForm
          members={members}
          goals={goalsList}
          onSubmit={handleCreate}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </section>
  );
}
