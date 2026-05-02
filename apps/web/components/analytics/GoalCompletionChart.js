"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const formatWeekLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function GoalCompletionChart({ data = [], accentColor = "#6366f1" }) {
  return (
    <div className="h-64 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="weekStart"
            stroke="var(--color-muted)"
            tickFormatter={formatWeekLabel}
            tickLine={false}
          />
          <YAxis stroke="var(--color-muted)" tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={formatWeekLabel}
            formatter={(value, name) => [value, name === "completed" ? "Completed" : "Created"]}
          />
          <Area
            type="monotone"
            dataKey="created"
            stroke="var(--color-muted)"
            fill="var(--color-border)"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke={accentColor}
            fill={accentColor}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
