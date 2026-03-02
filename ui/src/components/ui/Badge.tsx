import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "green" | "gold" | "red" | "blue";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-surface-2 text-muted",
        variant === "green" && "bg-accent/15 text-accent",
        variant === "gold" && "bg-brand-gold/15 text-brand-gold",
        variant === "red" && "bg-red-500/15 text-red-400",
        variant === "blue" && "bg-blue-500/15 text-blue-400",
        className
      )}
    >
      {children}
    </span>
  );
}
