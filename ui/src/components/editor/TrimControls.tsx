"use client";

import { useCallback } from "react";
import { formatDuration } from "@/lib/utils";

interface TrimControlsProps {
  durationSec: number;
  trimStart: number;
  trimEnd: number;
  onTrimStartChange: (sec: number) => void;
  onTrimEndChange: (sec: number) => void;
}

export function TrimControls({
  durationSec,
  trimStart,
  trimEnd,
  onTrimStartChange,
  onTrimEndChange,
}: TrimControlsProps) {
  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (val < trimEnd - 1) onTrimStartChange(val);
    },
    [trimEnd, onTrimStartChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (val > trimStart + 1) onTrimEndChange(val);
    },
    [trimStart, onTrimEndChange]
  );

  const trimmedDuration = trimEnd - trimStart;
  const startPercent = (trimStart / durationSec) * 100;
  const endPercent = (trimEnd / durationSec) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Trim</span>
        <span>{formatDuration(trimmedDuration)}</span>
      </div>

      {/* Visual trim bar */}
      <div className="relative h-6 bg-surface-2 rounded overflow-hidden">
        {/* Active region */}
        <div
          className="absolute top-0 bottom-0 bg-accent/20 border-x-2 border-accent"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted">
            Start: {formatDuration(trimStart)}
          </label>
          <input
            type="range"
            min={0}
            max={durationSec}
            step={0.1}
            value={trimStart}
            onChange={handleStartChange}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted">
            End: {formatDuration(trimEnd)}
          </label>
          <input
            type="range"
            min={0}
            max={durationSec}
            step={0.1}
            value={trimEnd}
            onChange={handleEndChange}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
