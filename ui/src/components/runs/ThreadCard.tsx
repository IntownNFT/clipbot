"use client";

import { timeAgo } from "@/lib/utils";
import { Clock, MoreHorizontal, Film } from "lucide-react";
import type { ThreadSummary } from "@/hooks/useThreadList";

interface ThreadCardProps {
  thread: ThreadSummary;
  onClick: () => void;
}

export function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const subtitle = [
    `${thread.runCount} ${thread.runCount === 1 ? "run" : "runs"}`,
    thread.hasActiveRun ? "Currently processing" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="w-full text-left px-1 py-4 border-b border-border/50 hover:bg-surface-1/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-3.5">
        {/* Thumbnail */}
        <div className="w-16 h-10 rounded-lg bg-surface-2/50 overflow-hidden flex-shrink-0 flex items-center justify-center mt-0.5">
          {thread.thumbnailUrl ? (
            <img
              src={thread.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Film className="h-4 w-4 text-muted" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug line-clamp-1">
            {thread.title}
          </h3>
          <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">
            {subtitle}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
            <Clock className="h-3 w-3" />
            <span>{timeAgo(thread.lastRunAt)}</span>
          </div>
        </div>

        {/* Menu */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-foreground transition-all cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
