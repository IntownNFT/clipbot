"use client";

import { extractVideoId, youtubeThumbUrl, timeAgo } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface UserMessageProps {
  sourceUrl: string;
  startedAt: string;
}

export function UserMessage({ sourceUrl, startedAt }: UserMessageProps) {
  const videoId = extractVideoId(sourceUrl);
  const thumbUrl = videoId ? youtubeThumbUrl(videoId) : null;

  return (
    <div className="flex justify-end">
      <div className="max-w-md bg-accent/10 border border-accent/15 rounded-2xl rounded-br-md px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          {thumbUrl && (
            <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2">
              <img
                src={thumbUrl}
                alt="Video"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline truncate block"
            >
              <ExternalLink className="h-3 w-3 inline mr-1" />
              {sourceUrl}
            </a>
            <p className="text-[10px] text-muted mt-0.5">{timeAgo(startedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
