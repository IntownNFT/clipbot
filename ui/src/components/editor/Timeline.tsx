"use client";

import React, { useRef, useCallback } from "react";
import { cn, formatDuration } from "@/lib/utils";
import { Layers, Video, MessageSquare, Captions, Music } from "lucide-react";
import type { Track, Item } from "./remotion/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRACK_COLORS: Record<string, string> = {
  Background: "bg-purple-500/70 border-purple-400/50 hover:bg-purple-500/80",
  Video: "bg-blue-500/70 border-blue-400/50 hover:bg-blue-500/80",
  Hook: "bg-brand-gold/70 border-brand-gold/50 hover:bg-brand-gold/80",
  Captions: "bg-accent/70 border-accent/50 hover:bg-accent/80",
};

const TRACK_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Background: Layers,
  Video: Video,
  Hook: MessageSquare,
  Captions: Captions,
};

/* ------------------------------------------------------------------ */
/*  Resizable item block                                               */
/* ------------------------------------------------------------------ */

function ResizableItemBlock({
  item,
  trackName,
  totalFrames,
  selected,
  onSelect,
  onResize,
}: {
  item: Item;
  trackName: string;
  totalFrames: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onResize: (itemId: string, newFrom: number, newDuration: number) => void;
}) {
  const leftPercent = (item.from / totalFrames) * 100;
  const widthPercent = (item.durationInFrames / totalFrames) * 100;
  const colorClass =
    TRACK_COLORS[trackName] ?? "bg-surface-3 border-border hover:bg-surface-3";

  const label = (() => {
    switch (item.type) {
      case "background":
        return item.fillStyle;
      case "video":
        return "Video";
      case "hook":
        return item.text.length > 25 ? item.text.slice(0, 25) + "..." : item.text;
      case "caption": {
        const text = item.words.map((w) => w.word).join(" ");
        return text.length > 30 ? text.slice(0, 30) + "..." : text;
      }
      default:
        return "";
    }
  })();

  const handleEdgeMouseDown = (
    e: React.MouseEvent,
    edge: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // Find the lane container
    const lane = (e.currentTarget as HTMLElement).closest(
      "[data-lane]"
    ) as HTMLElement | null;
    if (!lane) return;

    const laneWidth = lane.clientWidth;
    const startX = e.clientX;
    const startFrom = item.from;
    const startDuration = item.durationInFrames;
    const minFrames = 5; // minimum item size: ~0.17s at 30fps

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dFrames = Math.round((dx / laneWidth) * totalFrames);

      if (edge === "left") {
        const newFrom = Math.max(0, Math.min(startFrom + dFrames, startFrom + startDuration - minFrames));
        const newDur = startDuration - (newFrom - startFrom);
        onResize(item.id, newFrom, newDur);
      } else {
        const newDur = Math.max(minFrames, startDuration + dFrames);
        const clampedDur = Math.min(newDur, totalFrames - item.from);
        onResize(item.id, item.from, clampedDur);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(item.id);
      }}
      className={cn(
        "absolute top-0.5 bottom-0.5 rounded-md border flex items-center overflow-hidden cursor-pointer select-none transition-all group/item",
        colorClass,
        selected && "ring-2 ring-white shadow-lg"
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`,
      }}
      title={label}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 opacity-0 group-hover/item:opacity-100 bg-white/30 rounded-l-md transition-opacity"
        onMouseDown={(e) => handleEdgeMouseDown(e, "left")}
      />

      {/* Content */}
      <span className="text-[10px] font-medium text-white truncate drop-shadow-sm px-2 pointer-events-none">
        {label}
      </span>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 opacity-0 group-hover/item:opacity-100 bg-white/30 rounded-r-md transition-opacity"
        onMouseDown={(e) => handleEdgeMouseDown(e, "right")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main timeline                                                      */
/* ------------------------------------------------------------------ */

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  durationInFrames: number;
  fps: number;
  currentFrame?: number;
  onSeek?: (frame: number) => void;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  zoom?: number;
}

export function Timeline({
  tracks,
  setTracks,
  durationInFrames,
  fps,
  currentFrame = 0,
  onSeek,
  selectedItemId,
  onSelectItem,
  zoom = 1,
}: TimelineProps) {
  const totalSeconds = durationInFrames / fps;
  const playheadPercent = durationInFrames > 0 ? (currentFrame / durationInFrames) * 100 : 0;
  const rulerRef = useRef<HTMLDivElement>(null);

  // Generate tick marks — adapt to zoom
  const baseInterval = totalSeconds <= 10 ? 1 : totalSeconds <= 30 ? 2 : totalSeconds <= 60 ? 5 : 10;
  const effectiveInterval = Math.max(0.5, baseInterval / zoom);
  const ticks: number[] = [];
  for (let s = 0; s <= totalSeconds; s += effectiveInterval) {
    ticks.push(Math.round(s * 10) / 10);
  }

  // Seek by clicking ruler
  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const frame = Math.round(pct * durationInFrames);
      onSeek(Math.max(0, Math.min(frame, durationInFrames - 1)));
    },
    [onSeek, durationInFrames]
  );

  // Drag playhead
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onSeek || !rulerRef.current) return;

      const ruler = rulerRef.current;

      const seek = (ev: MouseEvent) => {
        const rect = ruler.getBoundingClientRect();
        const pct = (ev.clientX - rect.left) / rect.width;
        const frame = Math.round(pct * durationInFrames);
        onSeek(Math.max(0, Math.min(frame, durationInFrames - 1)));
      };

      const up = () => {
        document.removeEventListener("mousemove", seek);
        document.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", seek);
      document.addEventListener("mouseup", up);
    },
    [onSeek, durationInFrames]
  );

  // Resize handler for items
  const handleItemResize = useCallback(
    (itemId: string, newFrom: number, newDuration: number) => {
      setTracks((prev) =>
        prev.map((track) => ({
          ...track,
          items: track.items.map((it) =>
            it.id === itemId
              ? ({ ...it, from: newFrom, durationInFrames: newDuration } as Item)
              : it
          ),
        }))
      );
    },
    [setTracks]
  );

  return (
    <div className="bg-surface-0 border-t border-border/50 select-none flex-shrink-0">
      <div className="overflow-x-auto">
        <div
          style={{ width: `${100 * zoom}%`, minWidth: "100%" }}
          className="relative"
        >
          {/* Time ruler */}
          <div
            ref={rulerRef}
            className="relative h-6 border-b border-border/30 cursor-pointer"
            onClick={handleRulerClick}
          >
            {ticks.map((sec, i) => {
              const pct = (sec / totalSeconds) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${pct}%` }}
                >
                  <div className="w-px h-2.5 bg-border/60" />
                  <span className="text-[9px] text-muted/70 font-mono mt-px">
                    {formatDuration(sec)}
                  </span>
                </div>
              );
            })}

            {/* Playhead handle (triangle) */}
            <div
              className="absolute top-0 z-20 cursor-grab active:cursor-grabbing"
              style={{ left: `${playheadPercent}%`, transform: "translateX(-50%)" }}
              onMouseDown={handlePlayheadMouseDown}
            >
              <svg width="12" height="10" viewBox="0 0 12 10" className="fill-white drop-shadow">
                <polygon points="0,0 12,0 6,10" />
              </svg>
            </div>
          </div>

          {/* Track lanes */}
          <div>
            {tracks.map((track) => {
              const Icon = TRACK_ICONS[track.name] ?? Layers;
              return (
                <div
                  key={track.name}
                  className="flex items-stretch border-b border-border/20 last:border-b-0"
                >
                  {/* Track label */}
                  <div className="w-10 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-1 border-r border-border/20 bg-surface-1/80">
                    <Icon className="h-3 w-3 text-muted" />
                    <span className="text-[7px] text-muted/70 font-medium leading-none">
                      {track.name.slice(0, 5)}
                    </span>
                  </div>

                  {/* Lane */}
                  <div
                    className="flex-1 relative h-8 bg-surface-0 hover:bg-surface-1/30 transition-colors"
                    data-lane
                    onClick={() => onSelectItem?.(null)}
                  >
                    {track.items.map((item) => (
                      <ResizableItemBlock
                        key={item.id}
                        item={item}
                        trackName={track.name}
                        totalFrames={durationInFrames}
                        selected={selectedItemId === item.id}
                        onSelect={(id) => onSelectItem?.(id)}
                        onResize={handleItemResize}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Playhead line (spans full height of tracks) */}
          <div
            className="absolute top-6 bottom-0 w-px bg-white/90 z-10 pointer-events-none"
            style={{ left: `${playheadPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
