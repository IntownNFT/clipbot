"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("shimmer rounded-md bg-surface-2", className)} />
  );
}

export function SkeletonText({ className, lines = 3 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ className, size = "h-10 w-10" }: SkeletonProps & { size?: string }) {
  return <Skeleton className={cn("rounded-full", size, className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface-1 p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size="h-8 w-8" />
        <Skeleton className="h-4 w-32" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonThumbnail({ className }: SkeletonProps) {
  return <Skeleton className={cn("aspect-video rounded-lg", className)} />;
}
