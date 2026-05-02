"use client";

import { useState } from "react";
import { api } from "../../lib/api";

const getFileName = (headers, workspaceId) => {
  const disposition = headers?.["content-disposition"] || "";
  const match = disposition.match(/filename=([^;]+)/i);
  if (match && match[1]) {
    return match[1].replace(/"/g, "").trim();
  }
  return `workspace-${workspaceId}-export.csv`;
};

export default function ExportButton({ workspaceId, canExport }) {
  const [loading, setLoading] = useState(false);

  if (!canExport) return null;
  if (!workspaceId) return null;

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${workspaceId}/analytics/export`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getFileName(response.headers, workspaceId);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      onClick={handleExport}
      disabled={loading}
    >
      {loading && (
        <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent dark:border-slate-300" />
      )}
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
