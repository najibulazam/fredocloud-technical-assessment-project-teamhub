"use client";

import { useMemo, useState } from "react";
import { useOptimisticMutation } from "../../hooks/useOptimistic";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";

const statusOptions = ["TODO", "IN_PROGRESS", "DONE"];

const sorters = {
  title: (a, b) => a.title.localeCompare(b.title),
  assignee: (a, b) => (a.assigneeName || "").localeCompare(b.assigneeName || ""),
  priority: (a, b) => (a.priority || "").localeCompare(b.priority || ""),
  status: (a, b) => (a.status || "").localeCompare(b.status || ""),
  dueDate: (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
};

const updateItemsCache = (current, variables) => {
  if (!current) return current;
  const items = Array.isArray(current) ? current : current.actionItems;
  if (!items) return current;
  const next = items.map((item) =>
    item.id === variables.id ? { ...item, status: variables.status } : item
  );
  return Array.isArray(current) ? next : { ...current, actionItems: next };
};

export default function ListView({ items = [], workspaceId, queryKey }) {
  const [sortKey, setSortKey] = useState("title");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);

  const optimistic = useOptimisticMutation({
    queryKey: queryKey || ["actionItems", workspaceId],
    mutationFn: ({ id, status }) =>
      api
        .put(`/workspaces/${workspaceId}/action-items/${id}`, { status })
        .then((res) => res.data),
    updateFn: (current, variables, data) => {
      if (data?.actionItem) {
        return updateItemsCache(current, {
          id: data.actionItem.id,
          status: data.actionItem.status
        });
      }
      return updateItemsCache(current, variables);
    }
  });

  const decorated = useMemo(() => {
    return items.map((item) => ({
      ...item,
      assigneeName: item.assignee?.name || item.assignee?.email || ""
    }));
  }, [items]);

  const sorted = useMemo(() => {
    const list = [...decorated].sort(sorters[sortKey]);
    return direction === "asc" ? list : list.reverse();
  }, [decorated, sortKey, direction]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-[760px] w-full text-left text-sm text-slate-700 dark:text-slate-200">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-500">
            <tr>
              <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("title")}>Title</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("assignee")}>Assignee</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("priority")}>Priority</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("status")}>Status</th>
              <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort("dueDate")}>Due date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.assigneeName || "Unassigned"}</td>
                <td className="px-4 py-3">{item.priority}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    value={item.status}
                    onChange={(event) =>
                      optimistic.mutate(
                        { id: item.id, status: event.target.value },
                        {
                          onSuccess: (data) => {
                            const socket = getSocket();
                            socket.emit(
                              "actionItem:updated",
                              data?.actionItem || { id: item.id, status: event.target.value }
                            );
                          }
                        }
                      )
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          <button
            className="rounded border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
