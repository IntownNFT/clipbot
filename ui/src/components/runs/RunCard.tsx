"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RunStatusBadge } from "./RunStatusBadge";
import { timeAgo, extractVideoId, youtubeThumbUrl } from "@/lib/utils";
import { Film } from "lucide-react";

interface Run {
  runId: string;
  sourceUrl: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

export function RunCard({ run }: { run: Run }) {
  const videoId = extractVideoId(run.sourceUrl);
  const thumbUrl = videoId ? youtubeThumbUrl(videoId) : null;

  return (
    <Link href="/" title={`Run ${run.runId}`}>
      <Card hover className="flex gap-4 items-center group/card">
        <div className="w-24 h-14 rounded-xl bg-surface-2/50 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md transition-all duration-300 group-hover/card:shadow-lg group-hover/card:shadow-accent/5">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <Film className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{run.sourceUrl}</p>
          <p className="text-xs text-muted mt-1">{timeAgo(run.startedAt)}</p>
        </div>
        <RunStatusBadge status={run.status} />
      </Card>
    </Link>
  );
}
