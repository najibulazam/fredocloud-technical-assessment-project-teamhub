import { cn } from "@team-hub/utils";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ src, name, size = "md", className }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };

  if (src) {
    return (
      <img
        className={cn("rounded-full object-cover", sizes[size] || sizes.md, className)}
        src={src}
        alt={name || "avatar"}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gray-200 text-gray-700",
        sizes[size] || sizes.md,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
