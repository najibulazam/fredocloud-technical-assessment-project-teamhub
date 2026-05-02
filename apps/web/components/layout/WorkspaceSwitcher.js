"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { api } from "../../lib/api";

export default function WorkspaceSwitcher() {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createAccentColor, setCreateAccentColor] = useState("#6366f1");
  const [createError, setCreateError] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverWorkspaces, setDiscoverWorkspaces] = useState([]);
  const [requestingId, setRequestingId] = useState(null);
  const router = useRouter();

  const handleSelect = (workspace) => {
    setCurrentWorkspace(workspace);
    setOpen(false);
    if (workspace?.id) {
      router.push(`/workspace/${workspace.id}`);
    }
  };

  const handleCreate = () => {
    setCreateMode(true);
    setCreateError("");
  };

  const handleToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    setDiscoverLoading(true);
    setDiscoverError("");
    try {
      const response = await api.get("/workspaces/discover");
      setDiscoverWorkspaces(response.data.workspaces || []);
    } catch (error) {
      setDiscoverError("Failed to load available workspaces");
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleRequestJoin = async (workspaceId) => {
    if (!workspaceId || requestingId) return;
    setRequestingId(workspaceId);
    try {
      await api.post(`/workspaces/${workspaceId}/join-requests`);
      setDiscoverWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, joinRequestStatus: "PENDING" }
            : workspace
        )
      );
    } catch (error) {
      setDiscoverError("Failed to submit join request");
    } finally {
      setRequestingId(null);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createName.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const response = await api.post("/workspaces", {
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        accentColor: createAccentColor
      });
      const workspace = response.data.workspace;
      if (!workspace?.id) {
        throw new Error("Workspace creation failed");
      }

      const nextWorkspaces = [workspace, ...workspaces.filter((item) => item.id !== workspace.id)];
      setWorkspaces(nextWorkspaces);
      setCurrentWorkspace(workspace);
      setOpen(false);
      setCreateMode(false);
      setCreateName("");
      setCreateDescription("");
      setCreateAccentColor("#6366f1");
      router.push(`/workspace/${workspace.id}`);
    } catch (error) {
      setCreateError("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        onClick={handleToggleOpen}
      >
        <span className="truncate">
          {currentWorkspace?.name || workspaces[0]?.name || "Select workspace"}
        </span>
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="max-h-56 overflow-y-auto">
            {discoverLoading && (
              <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500">Loading workspaces...</p>
            )}
            {!discoverLoading && discoverWorkspaces.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500">No workspaces yet</p>
            )}
            {!discoverLoading &&
              discoverWorkspaces.map((workspace) => {
                const isMember =
                  workspace.isMember || workspaces.some((item) => item.id === workspace.id);
                const pending = workspace.joinRequestStatus === "PENDING";
                return (
                  <div
                    key={workspace.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: workspace.accentColor || "#6366f1" }}
                    />
                    <span className="flex-1 truncate">{workspace.name}</span>
                    {isMember ? (
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        onClick={() => handleSelect(workspace)}
                      >
                        Open
                      </button>
                    ) : pending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                        Requested
                      </span>
                    ) : (
                      <button
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        onClick={() => handleRequestJoin(workspace.id)}
                        disabled={requestingId === workspace.id}
                      >
                        {requestingId === workspace.id ? "Sending..." : "Request access"}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
          {discoverError && <p className="mt-2 px-2 text-[11px] text-rose-500">{discoverError}</p>}
          {createMode ? (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Workspace name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Description (optional)"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-10 rounded border border-slate-300 dark:border-slate-700"
                  value={createAccentColor}
                  onChange={(event) => setCreateAccentColor(event.target.value)}
                />
                <input
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={createAccentColor}
                  onChange={(event) => setCreateAccentColor(event.target.value)}
                />
              </div>
              {createError && <p className="text-[11px] text-rose-500">{createError}</p>}
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={handleCreateSubmit}
                  disabled={creating || !createName.trim()}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setCreateMode(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              onClick={handleCreate}
            >
              + Create Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
