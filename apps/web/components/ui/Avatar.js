export default function Avatar({ name, src, className = "" }) {
  if (src) {
    return <img className={`h-10 w-10 rounded-full object-cover ${className}`} src={src} alt={name} />;
  }

  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200 ${className}`}
    >
      {initials}
    </div>
  );
}
