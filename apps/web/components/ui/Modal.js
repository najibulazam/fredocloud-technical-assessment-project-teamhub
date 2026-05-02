export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4">
      <div className="my-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button className="text-sm text-slate-500 dark:text-slate-400" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
}
