"use client";

import { useState, useCallback } from "react";
import { ToolCallStep } from "./ToolCallStep";
import { MomentsResult } from "./MomentsResult";
import { ClipsResult } from "./ClipsResult";
import { ErrorResult } from "./ErrorResult";
import { ActionBar } from "./ActionBar";
import { ClipEditorSlideOver } from "@/components/feed/ClipEditorSlideOver";
import { PublishDialog } from "@/components/clips/PublishDialog";
import type { PipelineManifest } from "@/lib/run-store";
import type { DownloadProgress } from "@/hooks/useRunStream";
import type { AggregatedClip } from "@/app/api/clips/route";
import { toMediaUrl } from "@/lib/utils";

const PIPELINE_STEPS = ["downloading", "transcribing", "analyzing", "clipping", "publishing"];

interface BotResponseProps {
  runId: string;
  sourceUrl: string;
  status: string;
  manifest: PipelineManifest | null;
  downloadProgress: DownloadProgress | null;
  options?: Record<string, unknown>;
  onRetry: () => void;
}

export function BotResponse({
  runId,
  sourceUrl,
  status,
  manifest,
  downloadProgress,
  options,
  onRetry,
}: BotResponseProps) {
  const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set());
  const [showPublish, setShowPublish] = useState(false);
  const [editingClip, setEditingClip] = useState<AggregatedClip | null>(null);

  const toggleClip = (idx: number) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllClips = () => {
    if (manifest?.clips) {
      setSelectedClips(new Set(manifest.clips.map((c) => c.momentIndex)));
    }
  };

  const handleClickClip = useCallback(
    (clipIndex: number) => {
      if (!manifest?.clips) return;
      const clip = manifest.clips.find((c) => c.momentIndex === clipIndex);
      const moment = manifest.moments?.find((m) => m.index === clipIndex);
      if (!clip) return;

      // Build an AggregatedClip for the slide-over
      const aggregated: AggregatedClip = {
        runId,
        sourceUrl,
        runStartedAt: manifest.startedAt,
        momentIndex: clip.momentIndex,
        title: clip.title,
        filePath: clip.filePath,
        rawFilePath: clip.rawFilePath,
        thumbnailPath: clip.thumbnailPath,
        durationSeconds: clip.durationSeconds,
        fileSizeBytes: clip.fileSizeBytes,
        resolution: clip.resolution,
        viralityScore: moment?.viralityScore ?? 0,
        hookText: moment?.hookText ?? "",
        hashtags: moment?.hashtags ?? [],
        category: moment?.category ?? "",
        description: moment?.description ?? "",
        wordTimestamps: (manifest.wordTimestamps ?? [])
          .filter((wt) => {
            if (!moment) return false;
            const clipStartMs = Math.max(0, moment.startSeconds - 1.5) * 1000;
            const clipEndMs = clipStartMs + clip.durationSeconds * 1000;
            return wt.endMs > clipStartMs && wt.startMs < clipEndMs;
          })
          .map((wt) => {
            const moment2 = moment!;
            const clipStartMs = Math.max(0, moment2.startSeconds - 1.5) * 1000;
            return {
              word: wt.word,
              startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
              endMs: Math.round(
                Math.min(wt.endMs, clipStartMs + clip.durationSeconds * 1000) - clipStartMs
              ),
            };
          }),
      };
      setEditingClip(aggregated);
    },
    [manifest, runId, sourceUrl]
  );

  const clipTitles: Record<number, string> = {};
  manifest?.clips?.forEach((c) => {
    clipTitles[c.momentIndex] = c.title;
  });

  const isFailed = status === "failed";

  return (
    <div className="space-y-1.5 max-w-lg">
      {/* Pipeline steps */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((step) => (
          <ToolCallStep
            key={step}
            step={step}
            currentStatus={status}
            downloadProgress={step === "downloading" ? downloadProgress : null}
            error={manifest?.error?.step === step ? manifest.error : null}
            manifest={manifest}
            options={options as { quality?: string; maxClips?: number; minScore?: number; maxDuration?: number; niche?: string }}
          />
        ))}
      </div>

      {/* Moments */}
      {manifest?.moments && manifest.moments.length > 0 && (
        <MomentsResult moments={manifest.moments} />
      )}

      {/* Clips */}
      {manifest?.clips && manifest.clips.length > 0 && (
        <ClipsResult
          clips={manifest.clips}
          moments={manifest.moments}
          selectedClips={selectedClips}
          onToggleClip={toggleClip}
          onSelectAll={selectAllClips}
          onClickClip={handleClickClip}
        />
      )}

      {/* Error */}
      {isFailed && <ErrorResult error={manifest?.error} />}

      {/* Actions */}
      {(isFailed || status === "complete" || !["complete", "failed"].includes(status)) && (
        <ActionBar
          runId={runId}
          sourceUrl={sourceUrl}
          status={status}
          selectedCount={selectedClips.size}
          onPublish={() => setShowPublish(true)}
          onRetry={onRetry}
          onCancel={() => {}}
          options={options as Record<string, unknown>}
        />
      )}

      {/* Publish Dialog */}
      <PublishDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        runId={runId}
        clipIndices={Array.from(selectedClips)}
        clipTitles={clipTitles}
      />

      {/* Clip Editor Slide-Over */}
      <ClipEditorSlideOver
        clip={editingClip}
        captionMode="overlay"
        onClose={() => setEditingClip(null)}
      />
    </div>
  );
}
