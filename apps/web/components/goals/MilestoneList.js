export default function MilestoneList({ milestones = [] }) {
  return (
    <ul className="space-y-2">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">{milestone.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500">Progress: {milestone.progress}%</p>
        </li>
      ))}
    </ul>
  );
}
