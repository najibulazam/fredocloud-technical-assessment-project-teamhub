"use client";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMemo } from "react";
import { useOptimisticMutation } from "../../hooks/useOptimistic";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import KanbanCard from "./KanbanCard";

const columns = [
  { id: "TODO", title: "Todo", color: "bg-sky-400" },
  { id: "IN_PROGRESS", title: "In progress", color: "bg-indigo-400" },
  { id: "DONE", title: "Done", color: "bg-emerald-400" },
  { id: "CANCELLED", title: "Cancelled", color: "bg-slate-500", collapsed: true }
];

const updateItemsCache = (current, variables) => {
  if (!current) return current;
  const items = Array.isArray(current) ? current : current.actionItems;
  if (!items) return current;
  const next = items.map((item) =>
    item.id === variables.id ? { ...item, status: variables.status } : item
  );
  return Array.isArray(current) ? next : { ...current, actionItems: next };
};

export default function KanbanBoard({ items = [], members = [], workspaceId, queryKey, onDragEnd }) {
  const membersById = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.userId] = member.user;
      return acc;
    }, {});
  }, [members]);

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

  const grouped = columns.reduce((acc, column) => {
    acc[column.id] = items.filter((item) => item.status === column.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const status = result.destination.droppableId;
    const itemId = Number(result.draggableId);

    if (!workspaceId) return;

    optimistic.mutate(
      { id: itemId, status },
      {
        onSuccess: (data) => {
          const socket = getSocket();
          socket.emit("actionItem:updated", data?.actionItem || { id: itemId, status });
        }
      }
    );

    if (onDragEnd) {
      onDragEnd(result);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[920px] gap-4 md:grid-cols-4">
        {columns.map((column) => {
          const count = grouped[column.id]?.length || 0;

          if (column.collapsed) {
            return (
              <div
                key={column.id}
                className="rounded-xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.title}</h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{count}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Collapsed column</p>
              </div>
            );
          }

          return (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.title}</h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{count}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {grouped[column.id].map((item, index) => (
                      <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                        {(draggableProvided) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                          >
                            <KanbanCard
                              item={item}
                              assignee={membersById[item.assigneeId]}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
        </div>
      </div>
    </DragDropContext>
  );
}
