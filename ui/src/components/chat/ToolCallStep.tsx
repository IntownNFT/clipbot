"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { formatDuration, formatFileSize } from "@/lib/utils";
import {
  Download,
  FileText,
  Brain,
  Scissors,
  Captions,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { DownloadProgress } from "@/hooks/useRunStream";
import type { PipelineManifest } from "@/lib/run-store";

const STEP_ICON: Record<string, typeof Download> = {
  downloading: Download,
  transcribing: FileText,
  analyzing: Brain,
  clipping: Scissors,
  publishing: Captions,
};

const STEP_ORDER = ["downloading", "transcribing", "analyzing", "clipping", "publishing"];

type StepState = "pending" | "active" | "complete" | "failed";

interface ToolCallStepProps {
  step: string;
  currentStatus: string;
  downloadProgress?: DownloadProgress | null;
  error?: { step: string; message: string } | null;
  manifest?: PipelineManifest | null;
  options?: {
    quality?: string;
    maxClips?: number;
    minScore?: number;
    maxDuration?: number;
    niche?: string;
  };
}

function getVerb(
  step: string,
  state: StepState,
  manifest?: PipelineManifest | null,
  options?: ToolCallStepProps["options"]
): string {
  const quality = options?.quality ?? manifest?.download?.quality ?? "1080";

  switch (step) {
    case "downloading":
      if (state === "complete" && manifest?.download) {
        return `Downloaded ${quality}p (${formatFileSize(manifest.download.fileSize)}, ${formatDuration(manifest.download.durationSeconds)})`;
      }
      return `Downloading video at ${quality}p`;
    case "transcribing":
      if (state === "complete" && manifest?.wordTimestamps) {
        return `Transcribed ${manifest.wordTimestamps.length} words`;
      }
      return "Transcribing audio";
    case "analyzing": {
      const niche = options?.niche;
      const nicheLabel = niche && niche !== "general" ? ` for ${niche}` : "";
      if (state === "complete" && manifest?.moments) {
        return `Found ${manifest.moments.length} viral moment${manifest.moments.length !== 1 ? "s" : ""}${nicheLabel}`;
      }
      return `Finding viral moments${nicheLabel}`;
    }
    case "clipping":
      if (state === "complete" && manifest?.clips) {
        return `Cut ${manifest.clips.length} clip${manifest.clips.length !== 1 ? "s" : ""}`;
      }
      return `Cutting up to ${options?.maxClips ?? 5} clips`;
    case "publishing":
      if (state === "complete") return "Captions applied";
      return "Applying captions";
    default:
      return step;
  }
}

function getDetail(
  step: string,
  state: StepState,
  downloadProgress?: DownloadProgress | null,
  manifest?: PipelineManifest | null,
  error?: { step: string; message: string } | null
): React.ReactNode {
  if (state === "failed" && error) {
    return <span className="text-red-400">{error.message}</span>;
  }
  if (state === "pending") return null;

  if (state === "active" && step === "downloading" && downloadProgress) {
    return (
      <div className="flex items-center gap-3 font-mono">
        <span>{downloadProgress.percent.toFixed(1)}%</span>
        {downloadProgress.speed && <span>{downloadProgress.speed}</span>}
        {downloadProgress.eta && <span>ETA {downloadProgress.eta}</span>}
      </div>
    );
  }

  if (state === "complete") {
    if (step === "downloading" && manifest?.download) {
      return <span>{manifest.download.filename}</span>;
    }
    return null;
  }

  if (state === "active") {
    return <span>Working...</span>;
  }

  return null;
}

export function ToolCallStep({
  step,
  currentStatus,
  downloadProgress,
  error,
  manifest,
  options,
}: ToolCallStepProps) {
  const Icon = STEP_ICON[step];
  if (!Icon) return null;

  const stepIdx = STEP_ORDER.indexOf(step);
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const isComplete = currentStatus === "complete";

  let state: StepState = "pending";
  if (currentStatus === "failed" && error?.step === step) {
    state = "failed";
  } else if (currentStatus === "failed" && currentIdx > stepIdx) {
    state = "complete";
  } else if (isComplete || currentIdx > stepIdx) {
    state = "complete";
  } else if (currentIdx === stepIdx) {
    state = "active";
  }

  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const autoExpanded = state === "active" || state === "failed";
  const detail = getDetail(step, state, downloadProgress, manifest, error);
  const hasDetail = detail !== null;
  const expanded = manualOpen ?? autoExpanded;

  const verb = getVerb(step, state, manifest, options);

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        state === "active" && "border-brand-gold/30 bg-brand-gold/5",
        state === "complete" && "border-accent/20 bg-accent/5",
        state === "failed" && "border-red-500/30 bg-red-500/5",
        state === "pending" && "border-border/50 bg-surface-1/50 opacity-50"
      )}
    >
      <button
        onClick={() => hasDetail && setManualOpen(expanded ? false : true)}
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-2 text-left",
          hasDetail ? "cursor-pointer" : "cursor-default"
        )}
      >
        {hasDetail ? (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="h-3 w-3 text-muted" />
          </motion.div>
        ) : (
          <div className="w-3" />
        )}

        {state === "active" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-gold" />
        ) : state === "complete" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
        ) : state === "failed" ? (
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <Icon className="h-3.5 w-3.5 text-muted" />
        )}

        <span
          className={cn(
            "text-xs font-medium",
            state === "active" && "text-brand-gold",
            state === "complete" && "text-accent",
            state === "failed" && "text-red-400",
            state === "pending" && "text-muted"
          )}
        >
          {verb}
        </span>
      </button>

      <AnimatePresence>
        {expanded && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pl-9 text-xs text-muted">
              {detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
