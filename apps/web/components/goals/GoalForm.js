export default function GoalForm() {
  return (
    <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        placeholder="Goal title"
      />
      <textarea
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        placeholder="Describe the goal"
        rows={3}
      />
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
        Save goal
      </button>
    </form>
  );
}
