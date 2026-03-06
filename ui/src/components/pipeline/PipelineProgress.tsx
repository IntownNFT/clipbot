"use client";

import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "./StepIndicator";
import type { DownloadProgress } from "@/hooks/useRunStream";

const STEP_PROGRESS: Record<string, number> = {
  downloading: 10,
  transcribing: 30,
  analyzing: 50,
  clipping: 70,
  publishing: 85,
  complete: 100,
  failed: 0,
};

interface PipelineProgressProps {
  status: string;
  downloadProgress?: DownloadProgress | null;
}

export function PipelineProgress({ status, downloadProgress }: PipelineProgressProps) {
  // During download, use real yt-dlp percentage (mapped to 0-20% of overall bar)
  let pct = STEP_PROGRESS[status] ?? 0;
  if (status === "downloading" && downloadProgress) {
    pct = Math.round(downloadProgress.percent * 0.2); // 0-20% of overall
  }

  return (
    <div className="space-y-4">
      <StepIndicator currentStep={status} />
      {status !== "failed" && <Progress value={pct} />}
      {status === "downloading" && downloadProgress && downloadProgress.percent < 100 && (
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="font-mono">{downloadProgress.percent.toFixed(1)}%</span>
          {downloadProgress.speed && <span>{downloadProgress.speed}</span>}
          {downloadProgress.eta && <span>ETA {downloadProgress.eta}</span>}
        </div>
      )}
    </div>
  );
}
