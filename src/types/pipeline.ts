import type { TranscriptSegment, ViralMoment } from "./clip.js";
import type { Platform } from "./config.js";

export interface DownloadOptions {
  quality: string;
  outputDir: string;
  onProgress?: (percent: number) => void;
}

export interface DownloadResult {
  filePath: string;
  filename: string;
  fileSize: number;
  quality: string;
  durationSeconds: number;
}

export interface AnalysisOptions {
  model: string;
  maxClips: number;
  minScore: number;
  maxDuration: number;
  niche?: string;
}

export interface ClipOptions {
  outputDir: string;
  maxDuration: number;
  padBefore: number;
  padAfter: number;
  burnSubtitles: boolean;
  transcript?: TranscriptSegment[];
}

export interface ClipResult {
  momentIndex: number;
  title: string;
  filePath: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
}

export interface PublishOptions {
  platforms: PlatformTarget[];
  publishNow: boolean;
  scheduledFor?: string;
}

export interface PlatformTarget {
  platform: Platform;
  accountId: string;
}

export interface PostResult {
  clipIndex: number;
  postId: string;
  platforms: {
    platform: string;
    status: "published" | "scheduled" | "failed";
    url?: string;
    error?: string;
  }[];
}

export type PipelineStep =
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "clipping"
  | "publishing"
  | "complete"
  | "failed";

export interface PipelineState {
  id: string;
  sourceUrl: string;
  status: PipelineStep;
  startedAt: string;
  completedAt?: string;
  download?: DownloadResult;
  transcript?: TranscriptSegment[];
  moments?: ViralMoment[];
  clips?: ClipResult[];
  posts?: PostResult[];
  error?: { step: string; message: string };
}
