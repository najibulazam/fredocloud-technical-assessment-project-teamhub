export default function Toast({ message, description, variant = "info" }) {
  const variants = {
    info:
      "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
    success:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-100"
  };

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-xl ${variants[variant] || variants.info}`}>
      <p className="text-sm font-semibold">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}
