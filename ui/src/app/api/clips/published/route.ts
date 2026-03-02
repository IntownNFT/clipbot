import { NextResponse } from "next/server";
import { listRuns, getManifest } from "@/lib/run-store";

export interface PublishedClip {
  runId: string;
  sourceUrl: string;
  clipIndex: number;
  title: string;
  thumbnailPath: string;
  durationSeconds: number;
  postId: string;
  platforms: Array<{
    platform: string;
    status: string;
    url?: string;
  }>;
  publishedAt: string;
}

export async function GET() {
  const runs = await listRuns();
  const completedRuns = runs.filter((r) => r.status === "complete");

  const published: PublishedClip[] = [];

  for (const run of completedRuns) {
    const manifest = await getManifest(run.outputDir);
    if (!manifest?.posts?.length || !manifest.clips) continue;

    for (const post of manifest.posts) {
      const clip = manifest.clips.find((c) => c.momentIndex === post.clipIndex);
      if (!clip) continue;

      published.push({
        runId: run.runId,
        sourceUrl: run.sourceUrl,
        clipIndex: post.clipIndex,
        title: clip.title,
        thumbnailPath: clip.thumbnailPath,
        durationSeconds: clip.durationSeconds,
        postId: post.postId,
        platforms: post.platforms.map((p) => ({
          platform: p.platform,
          status: p.status,
          url: p.url,
        })),
        publishedAt: run.completedAt ?? run.startedAt,
      });
    }
  }

  published.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return NextResponse.json(published);
}
