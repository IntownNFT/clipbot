"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.97]",
        variant === "primary" &&
          "bg-accent text-white shadow-sm hover:brightness-90",
        variant === "secondary" &&
          "bg-surface-2 text-foreground hover:bg-surface-3 border border-border shadow-sm",
        variant === "ghost" &&
          "text-muted hover:text-foreground hover:bg-surface-2",
        variant === "danger" &&
          "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    />
  );
}
