"use client";

import { ClipCard } from "./ClipCard";

interface Clip {
  momentIndex: number;
  title: string;
  filePath: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
}

interface ClipGridProps {
  clips: Clip[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  runId: string;
}

export function ClipGrid({
  clips,
  selectedIndices,
  onToggle,
  runId,
}: ClipGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {clips.map((clip) => (
        <ClipCard
          key={clip.momentIndex}
          clip={clip}
          runId={runId}
          selected={selectedIndices.has(clip.momentIndex)}
          onToggle={() => onToggle(clip.momentIndex)}
        />
      ))}
    </div>
  );
}
