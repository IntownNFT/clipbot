"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { formatDuration, toMediaUrl, timeAgo } from "@/lib/utils";
import { Film } from "lucide-react";
import type { PublishedClip } from "@/app/api/clips/published/route";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-black text-white",
  youtube: "bg-red-600 text-white",
  instagram: "bg-pink-500 text-white",
  facebook: "bg-blue-600 text-white",
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TT",
  youtube: "YT",
  instagram: "IG",
  facebook: "FB",
};

export function PublishedGrid() {
  const [clips, setClips] = useState<PublishedClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clips/published")
      .then((r) => r.json())
      .then((data) => setClips(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-[9/16] rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <p className="text-muted text-sm py-12 text-center">
        No published clips yet. Publish clips through the chat to see them here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {clips.map((clip, i) => (
        <motion.div
          key={`${clip.runId}-${clip.clipIndex}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.03 * i }}
        >
          <PublishedCard clip={clip} />
        </motion.div>
      ))}
    </div>
  );
}

function PublishedCard({ clip }: { clip: PublishedClip }) {
  const thumbSrc = toMediaUrl(clip.thumbnailPath);

  return (
    <div className="group rounded-xl overflow-hidden border border-border/50 hover:border-accent/30 transition-all cursor-pointer bg-surface-1">
      {/* Thumbnail */}
      <div className="aspect-[9/16] bg-surface-2 relative overflow-hidden">
        <img
          src={thumbSrc}
          alt={clip.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Fallback icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-6 w-6 text-muted" />
        </div>

        {/* Duration */}
        <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono z-10">
          {formatDuration(clip.durationSeconds)}
        </div>

        {/* Platform badges */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
          {clip.platforms.map((p) => (
            <span
              key={p.platform}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PLATFORM_COLORS[p.platform] ?? "bg-surface-2 text-foreground"}`}
            >
              {PLATFORM_LABELS[p.platform] ?? p.platform}
            </span>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium line-clamp-2 leading-snug">{clip.title}</p>
        <p className="text-[10px] text-muted mt-1">{timeAgo(clip.publishedAt)}</p>
      </div>
    </div>
  );
}
