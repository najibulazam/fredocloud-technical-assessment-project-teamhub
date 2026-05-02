import { Button } from "./Button.js";
import { cn } from "@team-hub/utils";

export function Modal({ open, title, children, onClose, actions, className }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={cn("w-full max-w-lg rounded-xl bg-white p-6 shadow-soft", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>{title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}</div>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <div className="mt-4 text-sm text-gray-700">{children}</div>
        {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
