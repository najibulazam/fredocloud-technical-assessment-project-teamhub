const priorityStyles = {
  LOW: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  MEDIUM: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
  HIGH: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  URGENT: "border-red-500/40 bg-red-500/15 text-red-300"
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function KanbanCard({ item, assignee, onEdit, onDelete }) {
  const assigneeName = assignee?.name || assignee?.email || "Unassigned";
  const priorityClass = priorityStyles[item.priority] || priorityStyles.MEDIUM;
  const dueDate = formatDate(item.dueDate);

  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityClass}`}>
              {item.priority || "MEDIUM"}
            </span>
            {dueDate && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Due {dueDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assignee?.avatarUrl ? (
            <img
              src={assignee.avatarUrl}
              alt={assigneeName}
              className="h-7 w-7 rounded-full border border-slate-700 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {getInitials(assigneeName) || "?"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          onClick={onEdit}
        >
          <span className="sr-only">Edit</span>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
            <path d="M13.586 2.586a2 2 0 0 1 2.828 2.828l-9.5 9.5-3.536.707.707-3.536 9.5-9.5zM11.086 5.086l3.828 3.828" />
          </svg>
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-rose-600 hover:border-rose-400 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300 dark:hover:border-red-500"
          onClick={onDelete}
        >
          <span className="sr-only">Delete</span>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
            <path d="M6 7h8l-.7 9.4A2 2 0 0 1 11.3 18H8.7a2 2 0 0 1-2-1.6L6 7zm2-3h4l1 1h3v2H4V5h3l1-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
