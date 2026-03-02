"use client";

import { useMemo } from "react";
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";
import { normalizeUrl, extractVideoId, youtubeThumbUrl } from "@/lib/utils";

export interface Thread {
  threadId: string;
  sourceUrl: string;
  title: string;
  lastStatus: string;
  lastRunAt: string;
  runCount: number;
  completedClipCount: number;
  runs: ChatMessage[];
  hasActiveRun: boolean;
  thumbnailUrl: string | null;
}

export function useThreads() {
  const { messages, loading, addRun, refetch } = useChatMessages();

  const threads = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();

    // messages are chronological (oldest first) — iterate to group
    for (const msg of messages) {
      const id = normalizeUrl(msg.sourceUrl);
      const existing = map.get(id);
      if (existing) {
        existing.push(msg);
      } else {
        map.set(id, [msg]);
      }
    }

    const result: Thread[] = [];

    for (const [threadId, runs] of map) {
      // Runs within a thread: newest first for display
      const newestFirst = [...runs].reverse();
      const latest = newestFirst[0];

      const completedClipCount = newestFirst.reduce((sum, r) => {
        return sum + (r.manifest?.clips?.length ?? 0);
      }, 0);

      const hasActiveRun = newestFirst.some(
        (r) => !["complete", "failed"].includes(r.status)
      );

      // Title from the latest manifest filename, or URL fallback
      const title =
        newestFirst.find((r) => r.manifest?.download?.filename)?.manifest
          ?.download?.filename ?? latest.sourceUrl;

      const videoId = extractVideoId(latest.sourceUrl);
      const thumbnailUrl = videoId ? youtubeThumbUrl(videoId) : null;

      result.push({
        threadId,
        sourceUrl: latest.sourceUrl,
        title,
        lastStatus: latest.status,
        lastRunAt: latest.startedAt,
        runCount: runs.length,
        completedClipCount,
        runs: newestFirst,
        hasActiveRun,
        thumbnailUrl,
      });
    }

    // Sort by most recent activity
    result.sort(
      (a, b) => new Date(b.lastRunAt).getTime() - new Date(a.lastRunAt).getTime()
    );

    return result;
  }, [messages]);

  return { threads, messages, loading, addRun, refetch };
}
