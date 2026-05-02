import { cn } from "@team-hub/utils";

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-700",
  secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
  ghost: "bg-transparent text-gray-900 hover:bg-gray-100"
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

export function Button({ variant = "primary", size = "md", className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}
