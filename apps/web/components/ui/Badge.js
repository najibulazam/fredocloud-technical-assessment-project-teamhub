export default function Badge({ children, color = "slate", className = "" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    indigo: "bg-indigo-600 text-white",
    green: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-slate-900"
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
