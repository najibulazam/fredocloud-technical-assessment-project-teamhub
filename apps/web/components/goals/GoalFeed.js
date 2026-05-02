export default function GoalFeed({ updates = [] }) {
  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <div key={update.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">{update.content}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">{update.createdAt}</p>
        </div>
      ))}
    </div>
  );
}
