import type Anthropic from "@anthropic-ai/sdk";
import { getSpaces, createSpace } from "@/lib/space-store";
import { listRuns, getRun, getManifest } from "@/lib/run-store";
import {
  getScheduledPosts,
  addScheduledPost,
  updateScheduledPost,
} from "@/lib/schedule-store";
import { getCreators, addCreator, removeCreator } from "@/lib/creator-store";
import { getNotifications } from "@/lib/notification-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { fetchChannelFeedWithMeta } from "@/lib/youtube-rss";
import {
  listPosts,
  getPost,
  updatePost,
  deletePost,
  listLateAccounts,
} from "@/lib/late-client";
import type { Space } from "@/lib/types";

export const TOOLS: Anthropic.Tool[] = [
  // ── Existing tools ──────────────────────────────────────────────
  {
    name: "list_spaces",
    description:
      "List all spaces (workspaces). Returns each space's id, name, icon, description, and account/creator counts.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_space",
    description:
      "Create a new space (workspace) with a name, optional icon emoji, and optional description.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name of the space" },
        icon: {
          type: "string",
          description: "Emoji icon for the space (e.g. '🎮'). Defaults to '📁'",
        },
        description: {
          type: "string",
          description: "Short description of the space",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_runs",
    description:
      "Get recent video processing runs. Returns run ID, source URL, status, started time, and clip count for each run. Optionally filter by status.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Filter by status: 'complete', 'failed', 'downloading', 'transcribing', 'analyzing', 'clipping'. Omit for all.",
        },
        limit: {
          type: "number",
          description: "Max number of runs to return (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "schedule_clip",
    description:
      "Schedule a clip for posting. Requires a run ID, clip index, platform(s), and a date/time to post.",
    input_schema: {
      type: "object" as const,
      properties: {
        runId: { type: "string", description: "The run ID containing the clip" },
        clipIndex: {
          type: "number",
          description: "Index of the clip within the run (0-based)",
        },
        clipTitle: { type: "string", description: "Title/name for the clip" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description:
            "Platforms to post to (e.g. ['tiktok', 'youtube', 'instagram'])",
        },
        scheduledFor: {
          type: "string",
          description: "ISO 8601 date-time string for when to post",
        },
      },
      required: ["runId", "clipIndex", "clipTitle", "platforms", "scheduledFor"],
    },
  },
  {
    name: "list_scheduled",
    description:
      "List all scheduled posts. Returns clip title, platforms, scheduled time, and status for each.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "list_creators",
    description:
      "List all tracked YouTube creators. Returns channel name, URL, auto-process setting, and default options.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_creator",
    description:
      "Add a YouTube creator to track. Provide channel name and URL at minimum.",
    input_schema: {
      type: "object" as const,
      properties: {
        channelName: { type: "string", description: "YouTube channel name" },
        channelUrl: {
          type: "string",
          description: "YouTube channel URL (e.g. https://youtube.com/@channelname)",
        },
        channelId: {
          type: "string",
          description: "YouTube channel ID (optional, derived from URL if omitted)",
        },
        autoProcess: {
          type: "boolean",
          description: "Automatically process new videos (default false)",
        },
      },
      required: ["channelName", "channelUrl"],
    },
  },
  {
    name: "get_settings",
    description:
      "Get the current app settings including Claude model, default quality, platforms, niche, and more.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ── Pipeline Tools ──────────────────────────────────────────────
  {
    name: "process_video",
    description:
      "Start the clipping pipeline on a YouTube video URL. Returns a run ID immediately — the pipeline runs asynchronously in the background. Use get_runs or get_run_detail to check progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "YouTube video URL to process",
        },
        spaceId: {
          type: "string",
          description: "Space ID to use for settings (optional, uses global defaults if omitted)",
        },
        force: {
          type: "boolean",
          description: "Force re-processing even if this URL was already processed (default false)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_run_detail",
    description:
      "Get full details for a single run including moments (with virality scores) and clips. Omits transcript/wordTimestamps to save tokens.",
    input_schema: {
      type: "object" as const,
      properties: {
        runId: {
          type: "string",
          description: "The run ID to get details for",
        },
      },
      required: ["runId"],
    },
  },
  {
    name: "get_clips",
    description:
      "List generated clips across runs. Optionally filter by run ID or minimum virality score.",
    input_schema: {
      type: "object" as const,
      properties: {
        runId: {
          type: "string",
          description: "Filter to a specific run ID (optional)",
        },
        minScore: {
          type: "number",
          description: "Minimum virality score (1-10) to include (optional)",
        },
        limit: {
          type: "number",
          description: "Max number of clips to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "check_creator_videos",
    description:
      "Fetch a tracked creator's latest YouTube videos via RSS feed. Returns up to 10 recent videos with title, URL, and publish date.",
    input_schema: {
      type: "object" as const,
      properties: {
        creatorId: {
          type: "string",
          description: "The creator ID (from list_creators) to check",
        },
      },
      required: ["creatorId"],
    },
  },

  // ── Late/Social Tools ───────────────────────────────────────────
  {
    name: "publish_clip",
    description:
      "Publish a clip to social platforms via getLate.dev. Burns captions if needed, uploads the video, and creates the post. Supports scheduling for later.",
    input_schema: {
      type: "object" as const,
      properties: {
        runId: {
          type: "string",
          description: "The run ID containing the clip",
        },
        clipIndex: {
          type: "number",
          description: "Index of the clip within the run (0-based, matches moment index)",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Platforms to publish to (e.g. ['tiktok', 'youtube', 'instagram'])",
        },
        scheduledFor: {
          type: "string",
          description: "ISO 8601 date-time to schedule the post for (optional, publishes immediately if omitted)",
        },
      },
      required: ["runId", "clipIndex", "platforms"],
    },
  },
  {
    name: "list_posts",
    description:
      "List posts from getLate.dev. Optionally filter by status (draft, scheduled, published) or platform.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by post status: 'draft', 'scheduled', 'published' (optional)",
        },
        platform: {
          type: "string",
          description: "Filter by platform: 'tiktok', 'youtube', 'instagram', 'facebook' (optional)",
        },
        limit: {
          type: "number",
          description: "Max number of posts to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_post_analytics",
    description:
      "Get performance metrics for a specific post from getLate.dev. Returns impressions, views, likes, comments, shares, and engagement rate.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: {
          type: "string",
          description: "The Late.dev post ID to get analytics for",
        },
      },
      required: ["postId"],
    },
  },
  {
    name: "update_post",
    description:
      "Update a draft or scheduled post on getLate.dev. Can change content text or reschedule the post.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: {
          type: "string",
          description: "The Late.dev post ID to update",
        },
        content: {
          type: "string",
          description: "New content/caption text for the post (optional)",
        },
        scheduledFor: {
          type: "string",
          description: "New ISO 8601 date-time to schedule the post for (optional)",
        },
      },
      required: ["postId"],
    },
  },
  {
    name: "delete_post",
    description:
      "Delete a draft or scheduled post from getLate.dev. Cannot delete already-published posts.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: {
          type: "string",
          description: "The Late.dev post ID to delete",
        },
      },
      required: ["postId"],
    },
  },
  {
    name: "list_accounts",
    description:
      "List connected social media accounts from getLate.dev. Shows platform and account name for each.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ── Management Tools ────────────────────────────────────────────
  {
    name: "get_notifications",
    description:
      "View new video alerts from tracked YouTube creators. Optionally filter by status (pending, processing, dismissed).",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by status: 'pending', 'processing', 'dismissed' (optional)",
        },
        limit: {
          type: "number",
          description: "Max number of notifications to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "remove_creator",
    description:
      "Stop tracking a YouTube creator. Removes them from the creator list.",
    input_schema: {
      type: "object" as const,
      properties: {
        creatorId: {
          type: "string",
          description: "The creator ID to remove (from list_creators)",
        },
      },
      required: ["creatorId"],
    },
  },
  {
    name: "cancel_run",
    description:
      "Cancel an in-progress pipeline run. Kills the background process and marks the run as failed.",
    input_schema: {
      type: "object" as const,
      properties: {
        runId: {
          type: "string",
          description: "The run ID to cancel",
        },
      },
      required: ["runId"],
    },
  },
  {
    name: "cancel_scheduled",
    description:
      "Cancel a scheduled post. Marks it as cancelled so it won't be published.",
    input_schema: {
      type: "object" as const,
      properties: {
        postId: {
          type: "string",
          description: "The scheduled post ID to cancel (from list_scheduled)",
        },
      },
      required: ["postId"],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    // ── Existing tools ──────────────────────────────────────────
    case "list_spaces": {
      const spaces = await getSpaces();
      return spaces.map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        description: s.description,
        accountCount: s.accounts?.length ?? 0,
        creatorCount: s.creators?.length ?? 0,
      }));
    }

    case "create_space": {
      const now = new Date().toISOString();
      const space: Space = {
        id: crypto.randomUUID(),
        name: input.name as string,
        icon: (input.icon as string) || "📁",
        description: (input.description as string) || "",
        settings: {},
        accounts: [],
        creators: [],
        createdAt: now,
        updatedAt: now,
      };
      await createSpace(space);
      return { success: true, id: space.id, name: space.name, icon: space.icon };
    }

    case "get_runs": {
      let runs = await listRuns();
      if (input.status) {
        runs = runs.filter((r) => r.status === input.status);
      }
      const limit = (input.limit as number) || 10;
      return runs.slice(0, limit).map((r) => ({
        runId: r.runId,
        sourceUrl: r.sourceUrl,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt ?? null,
        spaceId: r.spaceId ?? null,
      }));
    }

    case "schedule_clip": {
      const post = {
        id: crypto.randomUUID(),
        runId: input.runId as string,
        clipIndex: input.clipIndex as number,
        clipTitle: input.clipTitle as string,
        platforms: input.platforms as string[],
        scheduledFor: input.scheduledFor as string,
        status: "scheduled" as const,
        createdAt: new Date().toISOString(),
      };
      await addScheduledPost(post);
      return { success: true, id: post.id, scheduledFor: post.scheduledFor };
    }

    case "list_scheduled": {
      const posts = await getScheduledPosts();
      return posts.map((p) => ({
        id: p.id,
        clipTitle: p.clipTitle,
        platforms: p.platforms,
        scheduledFor: p.scheduledFor,
        status: p.status,
        runId: p.runId,
      }));
    }

    case "list_creators": {
      const creators = await getCreators();
      return creators.map((c) => ({
        id: c.id,
        channelName: c.channelName,
        channelUrl: c.channelUrl,
        autoProcess: c.autoProcess,
        defaultOptions: c.defaultOptions,
        lastCheckedAt: c.lastCheckedAt ?? null,
      }));
    }

    case "add_creator": {
      const creator = {
        id: crypto.randomUUID(),
        channelId: (input.channelId as string) || "",
        channelName: input.channelName as string,
        channelUrl: input.channelUrl as string,
        autoProcess: (input.autoProcess as boolean) ?? false,
        defaultOptions: {},
        createdAt: new Date().toISOString(),
      };
      await addCreator(creator);
      return { success: true, id: creator.id, channelName: creator.channelName };
    }

    case "get_settings": {
      const config = await getEffectiveConfig();
      // Return safe subset (no API keys)
      return {
        claudeModel: config.claudeModel,
        defaultQuality: config.defaultQuality,
        defaultMaxClips: config.defaultMaxClips,
        defaultMinScore: config.defaultMinScore,
        defaultMaxDuration: config.defaultMaxDuration,
        defaultPlatforms: config.defaultPlatforms,
        niche: config.niche,
        subtitles: config.subtitles,
        backgroundFillStyle: config.backgroundFillStyle,
        captionMode: config.captionMode,
      };
    }

    // ── Pipeline Tools ──────────────────────────────────────────
    case "process_video": {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: input.url as string,
          spaceId: input.spaceId as string | undefined,
          force: (input.force as boolean) ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          error: data.error,
          ...(data.existingRunId && { existingRunId: data.existingRunId }),
          ...(data.alreadyComplete && { alreadyComplete: true }),
        };
      }
      return { success: true, runId: data.runId, message: "Pipeline started — use get_run_detail to check progress" };
    }

    case "get_run_detail": {
      const run = await getRun(input.runId as string);
      if (!run) return { error: "Run not found" };
      const manifest = await getManifest(run.outputDir);
      return {
        runId: run.runId,
        sourceUrl: run.sourceUrl,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt ?? null,
        spaceId: run.spaceId ?? null,
        options: run.options,
        moments: manifest?.moments?.map((m) => ({
          index: m.index,
          title: m.title,
          description: m.description,
          hookText: m.hookText,
          startSeconds: m.startSeconds,
          endSeconds: m.endSeconds,
          durationSeconds: m.durationSeconds,
          viralityScore: m.viralityScore,
          hashtags: m.hashtags,
          category: m.category,
        })) ?? null,
        clips: manifest?.clips?.map((c) => ({
          momentIndex: c.momentIndex,
          title: c.title,
          durationSeconds: c.durationSeconds,
          fileSizeBytes: c.fileSizeBytes,
          resolution: c.resolution,
        })) ?? null,
        posts: manifest?.posts ?? null,
        error: manifest?.error ?? null,
      };
    }

    case "get_clips": {
      const allRuns = await listRuns();
      const targetRuns = input.runId
        ? allRuns.filter((r) => r.runId === input.runId)
        : allRuns.filter((r) => r.status === "complete");

      const minScore = (input.minScore as number) ?? 0;
      const limit = (input.limit as number) || 20;

      const clips: Array<{
        runId: string;
        sourceUrl: string;
        momentIndex: number;
        title: string;
        viralityScore: number;
        durationSeconds: number;
        hashtags: string[];
        category: string;
      }> = [];

      for (const run of targetRuns) {
        const manifest = await getManifest(run.outputDir);
        if (!manifest?.clips || !manifest.moments) continue;
        for (const clip of manifest.clips) {
          const moment = manifest.moments.find((m) => m.index === clip.momentIndex);
          if (!moment || moment.viralityScore < minScore) continue;
          clips.push({
            runId: run.runId,
            sourceUrl: run.sourceUrl,
            momentIndex: clip.momentIndex,
            title: clip.title,
            viralityScore: moment.viralityScore,
            durationSeconds: clip.durationSeconds,
            hashtags: moment.hashtags,
            category: moment.category,
          });
        }
      }

      clips.sort((a, b) => b.viralityScore - a.viralityScore);
      return clips.slice(0, limit);
    }

    case "check_creator_videos": {
      const creators = await getCreators();
      const creator = creators.find((c) => c.id === input.creatorId);
      if (!creator) return { error: "Creator not found" };
      if (!creator.channelId) {
        return { error: "Creator has no channel ID — try removing and re-adding with a channel ID" };
      }
      const feed = await fetchChannelFeedWithMeta(creator.channelId);
      return {
        channelName: feed.channelName || creator.channelName,
        videos: feed.videos.slice(0, 10).map((v) => ({
          videoId: v.videoId,
          title: v.title,
          url: v.url,
          publishedAt: v.publishedAt,
        })),
      };
    }

    // ── Late/Social Tools ───────────────────────────────────────
    case "publish_clip": {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/runs/${input.runId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipIndices: [input.clipIndex as number],
          platforms: input.platforms as string[],
          scheduledFor: input.scheduledFor as string | undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error };
      return { success: true, results: data.results };
    }

    case "list_posts": {
      const posts = await listPosts({
        status: input.status as string | undefined,
        platform: input.platform as string | undefined,
        limit: (input.limit as number) || 20,
      });
      return posts.map((p) => ({
        id: p._id,
        content: p.content,
        status: p.status,
        platforms: p.platforms.map((pl) => pl.platform),
        scheduledFor: p.scheduledFor ?? null,
        publishedAt: p.publishedAt ?? null,
        createdAt: p.createdAt ?? null,
      }));
    }

    case "get_post_analytics": {
      const post = await getPost(input.postId as string);
      return {
        id: post._id,
        content: post.content,
        status: post.status,
        platforms: post.platforms.map((pl) => pl.platform),
        publishedAt: post.publishedAt ?? null,
        analytics: post.analytics ?? { impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 },
      };
    }

    case "update_post": {
      const updates: { content?: string; scheduledFor?: string } = {};
      if (input.content) updates.content = input.content as string;
      if (input.scheduledFor) updates.scheduledFor = input.scheduledFor as string;
      const updated = await updatePost(input.postId as string, updates);
      return {
        success: true,
        id: updated._id,
        content: updated.content,
        status: updated.status,
        scheduledFor: updated.scheduledFor ?? null,
      };
    }

    case "delete_post": {
      await deletePost(input.postId as string);
      return { success: true, message: "Post deleted" };
    }

    case "list_accounts": {
      const accounts = await listLateAccounts();
      return accounts.map((a) => ({
        id: a._id,
        platform: a.platform,
        name: a.name,
      }));
    }

    // ── Management Tools ────────────────────────────────────────
    case "get_notifications": {
      let notifications = await getNotifications();
      if (input.status) {
        notifications = notifications.filter((n) => n.status === input.status);
      }
      const limit = (input.limit as number) || 20;
      return notifications.slice(0, limit).map((n) => ({
        id: n.id,
        videoTitle: n.videoTitle,
        videoUrl: n.videoUrl,
        creatorName: n.creatorName,
        publishedAt: n.publishedAt,
        status: n.status,
        runId: n.runId ?? null,
      }));
    }

    case "remove_creator": {
      const removed = await removeCreator(input.creatorId as string);
      if (!removed) return { error: "Creator not found" };
      return { success: true, message: "Creator removed" };
    }

    case "cancel_run": {
      const run = await getRun(input.runId as string);
      if (!run) return { error: "Run not found" };
      const activeStatuses = ["downloading", "transcribing", "analyzing", "clipping"];
      if (!activeStatuses.includes(run.status)) {
        return { error: `Run is not active (status: ${run.status})` };
      }
      // Kill the pipeline process if we have a PID
      if (run.pid) {
        try {
          process.kill(run.pid);
        } catch {
          // Process may have already exited
        }
      }
      const { updateRun } = await import("@/lib/run-store");
      await updateRun(run.runId, { status: "failed", completedAt: new Date().toISOString() });
      return { success: true, message: "Run cancelled" };
    }

    case "cancel_scheduled": {
      const updated = await updateScheduledPost(input.postId as string, {
        status: "cancelled",
      });
      if (!updated) return { error: "Scheduled post not found" };
      return { success: true, id: updated.id, status: "cancelled" };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
