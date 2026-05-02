import { cn } from "@team-hub/utils";

export function Badge({ color = "gray", className, children }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-800"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        colors[color] || colors.gray,
        className
      )}
    >
      {children}
    </span>
  );
}
