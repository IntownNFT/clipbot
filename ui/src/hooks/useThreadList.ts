"use client";

import { useEffect, useState, useMemo } from "react";
import { normalizeUrl, extractVideoId, youtubeThumbUrl } from "@/lib/utils";

interface RunRecord {
  runId: string;
  sourceUrl: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  spaceId?: string;
}

export interface ThreadSummary {
  threadId: string;
  sourceUrl: string;
  title: string;
  lastStatus: string;
  lastRunAt: string;
  runCount: number;
  hasActiveRun: boolean;
  thumbnailUrl: string | null;
  spaceIds: string[];
}

/**
 * Lightweight hook for the history page — just fetches /api/runs once
 * and groups into threads. No SSE, no manifests, no polling.
 */
export function useThreadList() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => setRuns(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const threads = useMemo(() => {
    const map = new Map<string, RunRecord[]>();

    for (const run of runs) {
      const id = normalizeUrl(run.sourceUrl);
      const existing = map.get(id);
      if (existing) {
        existing.push(run);
      } else {
        map.set(id, [run]);
      }
    }

    const result: ThreadSummary[] = [];

    for (const [threadId, group] of map) {
      // Sort newest first within group
      group.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      const latest = group[0];

      const hasActiveRun = group.some(
        (r) => !["complete", "failed"].includes(r.status)
      );

      const videoId = extractVideoId(latest.sourceUrl);

      const spaceIds = [...new Set(group.map((r) => r.spaceId).filter(Boolean))] as string[];

      result.push({
        threadId,
        sourceUrl: latest.sourceUrl,
        title: latest.sourceUrl,
        lastStatus: latest.status,
        lastRunAt: latest.startedAt,
        runCount: group.length,
        hasActiveRun,
        thumbnailUrl: videoId ? youtubeThumbUrl(videoId) : null,
        spaceIds,
      });
    }

    result.sort(
      (a, b) => new Date(b.lastRunAt).getTime() - new Date(a.lastRunAt).getTime()
    );

    return result;
  }, [runs]);

  return { threads, loading };
}
