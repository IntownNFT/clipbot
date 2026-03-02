"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PipelineManifest } from "@/lib/run-store";

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
}

interface UseRunStreamResult {
  manifest: PipelineManifest | null;
  downloadProgress: DownloadProgress | null;
  connected: boolean;
  error: string | null;
}

export function useRunStream(runId: string): UseRunStreamResult {
  const [manifest, setManifest] = useState<PipelineManifest | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const es = new EventSource(`/api/runs/${runId}/stream`);
    sourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.downloadProgress) {
          setDownloadProgress(data.downloadProgress);
        } else {
          setDownloadProgress(null);
        }
        setManifest(data as PipelineManifest);

        // Stop listening once pipeline is done
        if (data.status === "complete" || data.status === "failed") {
          es.close();
          setConnected(false);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message);
      } catch {
        // Connection error, not a data error
      }
      es.close();
      setConnected(false);
    });

    es.onerror = () => {
      setConnected(false);
    };
  }, [runId]);

  useEffect(() => {
    connect();
    return () => {
      sourceRef.current?.close();
    };
  }, [connect]);

  return { manifest, downloadProgress, connected, error };
}
