import { NextResponse } from "next/server";
import { listRuns, getManifest } from "@/lib/run-store";

export interface AggregatedClip {
  runId: string;
  sourceUrl: string;
  runStartedAt: string;
  momentIndex: number;
  title: string;
  filePath: string;
  rawFilePath?: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
  viralityScore: number;
  hookText: string;
  hashtags: string[];
  category: string;
  description: string;
  wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
}

export async function GET() {
  const runs = await listRuns();
  const completedRuns = runs.filter((r) => r.status === "complete");

  const clips: AggregatedClip[] = [];

  for (const run of completedRuns) {
    const manifest = await getManifest(run.outputDir);
    if (!manifest?.clips || !manifest.moments) continue;

    for (const clip of manifest.clips) {
      const moment = manifest.moments.find((m) => m.index === clip.momentIndex);
      if (!moment) continue;

      // Compute per-clip word timestamps (same logic as run detail page)
      let wordTimestamps: Array<{ word: string; startMs: number; endMs: number }> = [];
      if (manifest.wordTimestamps) {
        const clipStartMs = Math.max(0, moment.startSeconds - 1.5) * 1000;
        const clipEndMs = clipStartMs + clip.durationSeconds * 1000;

        wordTimestamps = manifest.wordTimestamps
          .filter((wt) => wt.endMs > clipStartMs && wt.startMs < clipEndMs)
          .map((wt) => ({
            word: wt.word,
            startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
            endMs: Math.round(Math.min(wt.endMs, clipEndMs) - clipStartMs),
          }));
      }

      clips.push({
        runId: run.runId,
        sourceUrl: run.sourceUrl,
        runStartedAt: run.startedAt,
        momentIndex: clip.momentIndex,
        title: clip.title,
        filePath: clip.filePath,
        rawFilePath: clip.rawFilePath,
        thumbnailPath: clip.thumbnailPath,
        durationSeconds: clip.durationSeconds,
        fileSizeBytes: clip.fileSizeBytes,
        resolution: clip.resolution,
        viralityScore: moment.viralityScore,
        hookText: moment.hookText,
        hashtags: moment.hashtags,
        category: moment.category,
        description: moment.description,
        wordTimestamps,
      });
    }
  }

  // Sort: most recent run first, then by virality score descending
  clips.sort((a, b) => {
    const dateDiff = new Date(b.runStartedAt).getTime() - new Date(a.runStartedAt).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.viralityScore - a.viralityScore;
  });

  return NextResponse.json(clips);
}
