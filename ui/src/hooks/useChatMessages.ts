"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { PipelineManifest } from "@/lib/run-store";
import type { DownloadProgress } from "@/hooks/useRunStream";

export interface RunRecord {
  runId: string;
  sourceUrl: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  spaceId?: string;
  options?: {
    quality?: string;
    maxClips?: number;
    minScore?: number;
    maxDuration?: number;
    platforms?: string[];
    subtitles?: boolean;
    niche?: string;
    backgroundFillStyle?: string;
  };
}

export interface ChatMessage {
  runId: string;
  sourceUrl: string;
  startedAt: string;
  status: string;
  manifest: PipelineManifest | null;
  downloadProgress: DownloadProgress | null;
  connected: boolean;
  options?: RunRecord["options"];
  spaceId?: string;
}

/**
 * Central hook: fetches runs list, opens SSE streams for active runs,
 * fetches manifests for completed runs, merges into unified ChatMessage[].
 */
export function useChatMessages() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [manifests, setManifests] = useState<Record<string, PipelineManifest>>({});
  const [downloadProgresses, setDownloadProgresses] = useState<Record<string, DownloadProgress>>({});
  const [connectedStreams, setConnectedStreams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const sourcesRef = useRef<Record<string, EventSource>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedManifestsRef = useRef<Set<string>>(new Set());

  const fetchRuns = useCallback(async (includeManifests = false) => {
    try {
      const url = includeManifests ? "/api/runs?include=manifests" : "/api/runs";
      const res = await fetch(url);
      const data: (RunRecord & { manifest?: PipelineManifest | null })[] = await res.json();

      // Extract inline manifests from batch response
      if (includeManifests) {
        const newManifests: Record<string, PipelineManifest> = {};
        for (const run of data) {
          if (run.manifest) {
            newManifests[run.runId] = run.manifest;
            fetchedManifestsRef.current.add(run.runId);
          }
        }
        if (Object.keys(newManifests).length > 0) {
          setManifests((prev) => ({ ...prev, ...newManifests }));
        }
      }

      const runs = data.map(({ manifest: _, ...run }) => run) as RunRecord[];
      setRuns(runs);
      return runs;
    } catch {
      return [];
    }
  }, []);

  // Fetch manifest for a single completed/failed run
  const fetchManifest = useCallback(async (runId: string) => {
    if (fetchedManifestsRef.current.has(runId)) return;
    // Mark before fetch to prevent concurrent retries
    fetchedManifestsRef.current.add(runId);

    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) {
        fetchedManifestsRef.current.delete(runId);
        return;
      }
      const data = await res.json();
      if (data.manifest) {
        setManifests((prev) => ({ ...prev, [runId]: data.manifest }));
      }
      // If no manifest, stay marked — don't retry endlessly
    } catch {
      // Network error — allow retry on next mount
      fetchedManifestsRef.current.delete(runId);
    }
  }, []);

  // Connect SSE for a single active run
  const connectStream = useCallback((runId: string) => {
    if (sourcesRef.current[runId]) return;

    const es = new EventSource(`/api/runs/${runId}/stream`);
    sourcesRef.current[runId] = es;

    es.onopen = () => {
      setConnectedStreams((prev) => new Set(prev).add(runId));
    };

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.downloadProgress) {
          setDownloadProgresses((prev) => ({ ...prev, [runId]: data.downloadProgress }));
        } else {
          setDownloadProgresses((prev) => {
            const next = { ...prev };
            delete next[runId];
            return next;
          });
        }
        setManifests((prev) => ({ ...prev, [runId]: data as PipelineManifest }));

        // Update run status in-place
        if (data.status === "complete" || data.status === "failed") {
          setRuns((prev) =>
            prev.map((r) =>
              r.runId === runId ? { ...r, status: data.status, completedAt: data.completedAt } : r
            )
          );
          es.close();
          delete sourcesRef.current[runId];
          setConnectedStreams((prev) => {
            const next = new Set(prev);
            next.delete(runId);
            return next;
          });
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.onerror = () => {
      es.close();
      delete sourcesRef.current[runId];
      setConnectedStreams((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    };
  }, []);

  // Initial load — use batch endpoint to get all manifests in one request
  useEffect(() => {
    fetchRuns(true).then((data) => {
      setLoading(false);
      // Fetch any missing manifests in parallel (batch already populated most)
      const missingManifestRuns = data.slice(0, 30).filter(
        (r) =>
          ["complete", "failed"].includes(r.status) &&
          !fetchedManifestsRef.current.has(r.runId)
      );
      if (missingManifestRuns.length > 0) {
        Promise.all(missingManifestRuns.map((r) => fetchManifest(r.runId)));
      }
      // Stream live updates for active runs
      for (const run of data.slice(0, 30)) {
        if (!["complete", "failed"].includes(run.status)) {
          connectStream(run.runId);
        }
      }
    });

    return () => {
      for (const es of Object.values(sourcesRef.current)) {
        es.close();
      }
      sourcesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry manifest fetches for completed runs that don't have manifests yet
  useEffect(() => {
    const missing = runs
      .slice(0, 30)
      .filter(
        (r) =>
          ["complete", "failed"].includes(r.status) &&
          !manifests[r.runId] &&
          !fetchedManifestsRef.current.has(r.runId)
      );
    for (const run of missing) {
      fetchManifest(run.runId);
    }
  }, [runs, manifests, fetchManifest]);

  // Poll for new runs every 5s when there are active ones
  useEffect(() => {
    const hasActive = runs.some((r) => !["complete", "failed"].includes(r.status));
    if (hasActive) {
      pollRef.current = setInterval(async () => {
        const fresh = await fetchRuns();
        for (const run of fresh) {
          if (!["complete", "failed"].includes(run.status) && !sourcesRef.current[run.runId]) {
            connectStream(run.runId);
          }
        }
      }, 5000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runs, fetchRuns, connectStream]);

  // Add a new run (called after POST /api/runs)
  const addRun = useCallback(
    (run: RunRecord) => {
      setRuns((prev) => [run, ...prev]);
      connectStream(run.runId);
    },
    [connectStream]
  );

  // Build ChatMessage array — most recent 30 runs, chronological (oldest first)
  const messages: ChatMessage[] = runs
    .slice(0, 30)
    .reverse()
    .map((run) => ({
      runId: run.runId,
      sourceUrl: run.sourceUrl,
      startedAt: run.startedAt,
      status: manifests[run.runId]?.status ?? run.status,
      manifest: manifests[run.runId] ?? null,
      downloadProgress: downloadProgresses[run.runId] ?? null,
      connected: connectedStreams.has(run.runId),
      options: run.options,
      spaceId: run.spaceId,
    }));

  return { messages, loading, addRun, refetch: fetchRuns };
}
