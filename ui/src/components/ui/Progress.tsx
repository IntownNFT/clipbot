"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  animated?: boolean;
}

export function Progress({ value, className, animated = true }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-surface-2 overflow-hidden",
        className
      )}
    >
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={animated ? { width: 0 } : undefined}
        animate={{ width: `${clampedValue}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
