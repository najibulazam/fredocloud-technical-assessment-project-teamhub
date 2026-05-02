const badgeStyles = {
  green: "bg-emerald-500/15 text-emerald-300",
  red: "bg-rose-500/15 text-rose-300",
  slate: "bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300"
};

export default function StatsCard({ label, value, icon, trend, badge }) {
  const trendUp = typeof trend?.value === "number" && trend.value >= 0;
  const trendValue = typeof trend?.value === "number" ? Math.abs(trend.value) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        {icon && (
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {trendValue !== null && (
          <span className={`flex items-center gap-1 ${trendUp ? "text-emerald-300" : "text-rose-300"}`}>
            <span>{trendUp ? "▲" : "▼"}</span>
            <span>{trendUp ? "+" : "-"}{trendValue}</span>
            <span className="text-slate-500 dark:text-slate-500">vs last week</span>
          </span>
        )}
        {badge && (
          <span className={`rounded-full px-2 py-0.5 ${badgeStyles[badge.tone] || badgeStyles.slate}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}
