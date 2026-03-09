#!/usr/bin/env node
/**
 * Clipbot MCP Server
 *
 * Thin wrapper that re-exports clipbot's Vercel AI SDK tools as MCP tools.
 * Runs as a child process over stdio transport.
 *
 * Usage:
 *   node dist/mcp/server.js          (compiled)
 *   npx tsx src/mcp/server.ts         (dev)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------- Tool imports (same store functions the UI tools use) ----------

import { getSpaces, createSpace } from "../../ui/src/lib/space-store.js";
import { listRuns, getRun, getManifest } from "../../ui/src/lib/run-store.js";
import {
  getScheduledPosts,
  addScheduledPost,
  updateScheduledPost,
} from "../../ui/src/lib/schedule-store.js";
import {
  getCreators,
  addCreator,
  removeCreator,
} from "../../ui/src/lib/creator-store.js";
import { getNotifications } from "../../ui/src/lib/notification-store.js";
import { getEffectiveConfig } from "../../ui/src/lib/settings-store.js";
import { fetchChannelFeedWithMeta } from "../../ui/src/lib/youtube-rss.js";
import {
  listPosts,
  getPost,
  updatePost,
  deletePost,
  listLateAccounts,
} from "../../ui/src/lib/late-client.js";

// ---------- Server setup ----------

const server = new McpServer({
  name: "clipbot",
  version: "1.0.0",
});

// ---------- Workspace & Config tools ----------

server.tool("list_spaces", "List all spaces (workspaces)", {}, async () => {
  const spaces = await getSpaces();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          spaces.map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.icon,
            description: s.description,
            accountCount: s.accounts?.length ?? 0,
            creatorCount: s.creators?.length ?? 0,
          }))
        ),
      },
    ],
  };
});

server.tool(
  "create_space",
  "Create a new space (workspace)",
  {
    name: z.string().describe("Name of the space"),
    icon: z.string().optional().describe("Emoji icon (default '📁')"),
    description: z.string().optional().describe("Short description"),
  },
  async ({ name, icon, description }) => {
    const now = new Date().toISOString();
    const space = {
      id: crypto.randomUUID(),
      name,
      icon: icon || "📁",
      description: description || "",
      settings: {},
      accounts: [],
      creators: [],
      createdAt: now,
      updatedAt: now,
    };
    await createSpace(space);
    return {
      content: [
        { type: "text", text: JSON.stringify({ success: true, id: space.id, name: space.name }) },
      ],
    };
  }
);

server.tool(
  "get_settings",
  "Get current app settings",
  {},
  async () => {
    const config = await getEffectiveConfig();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
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
          }),
        },
      ],
    };
  }
);

// ---------- Pipeline tools ----------

server.tool(
  "process_video",
  "Start the clipping pipeline on a YouTube video URL",
  {
    url: z.string().describe("YouTube video URL to process"),
    spaceId: z.string().optional().describe("Space ID for settings (optional)"),
    force: z.boolean().optional().describe("Force re-processing (default false)"),
  },
  async ({ url, spaceId, force }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, spaceId, force: force ?? false }),
    });
    const data = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(res.ok ? { success: true, runId: data.runId } : { error: data.error }) }],
    };
  }
);

server.tool(
  "get_runs",
  "Get recent video processing runs",
  {
    status: z.string().optional().describe("Filter by status (optional)"),
    limit: z.number().optional().describe("Max results (default 10)"),
  },
  async ({ status, limit }) => {
    let runs = await listRuns();
    if (status) runs = runs.filter((r) => r.status === status);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            runs.slice(0, limit || 10).map((r) => ({
              runId: r.runId,
              sourceUrl: r.sourceUrl,
              status: r.status,
              startedAt: r.startedAt,
              completedAt: r.completedAt ?? null,
              spaceId: r.spaceId ?? null,
            }))
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_run_detail",
  "Get full details for a single run including moments and clips",
  {
    runId: z.string().describe("The run ID"),
  },
  async ({ runId }) => {
    const run = await getRun(runId);
    if (!run) return { content: [{ type: "text", text: JSON.stringify({ error: "Run not found" }) }] };
    const manifest = await getManifest(run.outputDir);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            runId: run.runId,
            sourceUrl: run.sourceUrl,
            status: run.status,
            startedAt: run.startedAt,
            completedAt: run.completedAt ?? null,
            moments: manifest?.moments?.map((m) => ({
              index: m.index,
              title: m.title,
              viralityScore: m.viralityScore,
              durationSeconds: m.durationSeconds,
              hashtags: m.hashtags,
              category: m.category,
            })) ?? null,
            clips: manifest?.clips?.map((c) => ({
              momentIndex: c.momentIndex,
              title: c.title,
              durationSeconds: c.durationSeconds,
            })) ?? null,
          }),
        },
      ],
    };
  }
);

server.tool(
  "get_clips",
  "List generated clips across runs, optionally filtered",
  {
    runId: z.string().optional().describe("Filter to a specific run ID"),
    minScore: z.number().optional().describe("Minimum virality score (1-10)"),
    limit: z.number().optional().describe("Max clips to return (default 20)"),
  },
  async ({ runId, minScore, limit }) => {
    const allRuns = await listRuns();
    const targetRuns = runId
      ? allRuns.filter((r) => r.runId === runId)
      : allRuns.filter((r) => r.status === "complete");

    const min = minScore ?? 0;
    const max = limit || 20;
    const clips: Array<Record<string, unknown>> = [];

    for (const run of targetRuns) {
      const manifest = await getManifest(run.outputDir);
      if (!manifest?.clips || !manifest.moments) continue;
      for (const clip of manifest.clips) {
        const moment = manifest.moments.find((m) => m.index === clip.momentIndex);
        if (!moment || moment.viralityScore < min) continue;
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

    clips.sort((a, b) => (b.viralityScore as number) - (a.viralityScore as number));
    return {
      content: [{ type: "text", text: JSON.stringify(clips.slice(0, max)) }],
    };
  }
);

// ---------- Creator tools ----------

server.tool("list_creators", "List all tracked YouTube creators", {}, async () => {
  const creators = await getCreators();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          creators.map((c) => ({
            id: c.id,
            channelName: c.channelName,
            channelUrl: c.channelUrl,
            autoProcess: c.autoProcess,
            lastCheckedAt: c.lastCheckedAt ?? null,
          }))
        ),
      },
    ],
  };
});

server.tool(
  "add_creator",
  "Add a YouTube creator to track",
  {
    channelName: z.string().describe("YouTube channel name"),
    channelUrl: z.string().describe("YouTube channel URL"),
    channelId: z.string().optional().describe("YouTube channel ID (optional)"),
    autoProcess: z.boolean().optional().describe("Auto-process new videos (default false)"),
  },
  async ({ channelName, channelUrl, channelId, autoProcess }) => {
    const creator = {
      id: crypto.randomUUID(),
      channelId: channelId || "",
      channelName,
      channelUrl,
      autoProcess: autoProcess ?? false,
      defaultOptions: {},
      createdAt: new Date().toISOString(),
    };
    await addCreator(creator);
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, id: creator.id, channelName }) }],
    };
  }
);

server.tool(
  "remove_creator",
  "Stop tracking a YouTube creator",
  {
    creatorId: z.string().describe("The creator ID to remove"),
  },
  async ({ creatorId }) => {
    const removed = await removeCreator(creatorId);
    return {
      content: [
        { type: "text", text: JSON.stringify(removed ? { success: true } : { error: "Creator not found" }) },
      ],
    };
  }
);

server.tool(
  "check_creator_videos",
  "Fetch a tracked creator's latest YouTube videos via RSS",
  {
    creatorId: z.string().describe("The creator ID to check"),
  },
  async ({ creatorId }) => {
    const creators = await getCreators();
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return { content: [{ type: "text", text: JSON.stringify({ error: "Creator not found" }) }] };
    if (!creator.channelId) return { content: [{ type: "text", text: JSON.stringify({ error: "No channel ID" }) }] };
    const feed = await fetchChannelFeedWithMeta(creator.channelId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            channelName: feed.channelName || creator.channelName,
            videos: feed.videos.slice(0, 10).map((v) => ({
              videoId: v.videoId,
              title: v.title,
              url: v.url,
              publishedAt: v.publishedAt,
            })),
          }),
        },
      ],
    };
  }
);

// ---------- Scheduling tools ----------

server.tool(
  "schedule_clip",
  "Schedule a clip for posting at a specific time",
  {
    runId: z.string().describe("The run ID containing the clip"),
    clipIndex: z.number().describe("Clip index (0-based)"),
    clipTitle: z.string().describe("Title for the clip"),
    platforms: z.array(z.string()).describe("Platforms to post to"),
    scheduledFor: z.string().describe("ISO 8601 date-time to post"),
  },
  async ({ runId, clipIndex, clipTitle, platforms, scheduledFor }) => {
    const post = {
      id: crypto.randomUUID(),
      runId,
      clipIndex,
      clipTitle,
      platforms,
      scheduledFor,
      status: "scheduled" as const,
      createdAt: new Date().toISOString(),
    };
    await addScheduledPost(post);
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, id: post.id, scheduledFor }) }],
    };
  }
);

server.tool("list_scheduled", "List all scheduled posts", {}, async () => {
  const posts = await getScheduledPosts();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          posts.map((p) => ({
            id: p.id,
            clipTitle: p.clipTitle,
            platforms: p.platforms,
            scheduledFor: p.scheduledFor,
            status: p.status,
            runId: p.runId,
          }))
        ),
      },
    ],
  };
});

server.tool(
  "cancel_scheduled",
  "Cancel a scheduled post",
  {
    postId: z.string().describe("The scheduled post ID to cancel"),
  },
  async ({ postId }) => {
    const updated = await updateScheduledPost(postId, { status: "cancelled" });
    return {
      content: [
        { type: "text", text: JSON.stringify(updated ? { success: true, status: "cancelled" } : { error: "Not found" }) },
      ],
    };
  }
);

// ---------- Late.dev / Social tools ----------

server.tool(
  "publish_clip",
  "Publish a clip to social platforms via Late.dev",
  {
    runId: z.string().describe("The run ID containing the clip"),
    clipIndex: z.number().describe("Clip index (0-based)"),
    platforms: z.array(z.string()).describe("Platforms to publish to"),
    scheduledFor: z.string().optional().describe("ISO 8601 date-time to schedule (optional)"),
  },
  async ({ runId, clipIndex, platforms, scheduledFor }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs/${runId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipIndices: [clipIndex], platforms, scheduledFor }),
    });
    const data = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(res.ok ? { success: true, results: data.results } : { error: data.error }) }],
    };
  }
);

server.tool(
  "list_posts",
  "List posts from Late.dev",
  {
    status: z.string().optional().describe("Filter: draft, scheduled, published"),
    platform: z.string().optional().describe("Filter: tiktok, youtube, instagram"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  async ({ status, platform, limit }) => {
    const posts = await listPosts({ status, platform, limit: limit || 20 });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            posts.map((p) => ({
              id: p._id,
              content: p.content,
              status: p.status,
              platforms: p.platforms.map((pl) => pl.platform),
              scheduledFor: p.scheduledFor ?? null,
              publishedAt: p.publishedAt ?? null,
            }))
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_post_analytics",
  "Get performance metrics for a specific post",
  {
    postId: z.string().describe("The Late.dev post ID"),
  },
  async ({ postId }) => {
    const post = await getPost(postId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: post._id,
            status: post.status,
            analytics: post.analytics ?? { impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 },
          }),
        },
      ],
    };
  }
);

server.tool(
  "update_post",
  "Update a draft or scheduled post on Late.dev",
  {
    postId: z.string().describe("The post ID to update"),
    content: z.string().optional().describe("New caption text"),
    scheduledFor: z.string().optional().describe("New scheduled time (ISO 8601)"),
  },
  async ({ postId, content, scheduledFor }) => {
    const updates: { content?: string; scheduledFor?: string } = {};
    if (content) updates.content = content;
    if (scheduledFor) updates.scheduledFor = scheduledFor;
    const updated = await updatePost(postId, updates);
    return {
      content: [
        { type: "text", text: JSON.stringify({ success: true, id: updated._id, status: updated.status }) },
      ],
    };
  }
);

server.tool(
  "delete_post",
  "Delete a draft or scheduled post from Late.dev",
  {
    postId: z.string().describe("The post ID to delete"),
  },
  async ({ postId }) => {
    await deletePost(postId);
    return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
  }
);

server.tool("list_accounts", "List connected social media accounts", {}, async () => {
  const accounts = await listLateAccounts();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(accounts.map((a) => ({ id: a._id, platform: a.platform, name: a.name }))),
      },
    ],
  };
});

// ---------- Management tools ----------

server.tool(
  "get_notifications",
  "View new video alerts from tracked creators",
  {
    status: z.string().optional().describe("Filter: pending, processing, dismissed"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  async ({ status, limit }) => {
    let notifications = await getNotifications();
    if (status) notifications = notifications.filter((n) => n.status === status);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            notifications.slice(0, limit || 20).map((n) => ({
              id: n.id,
              videoTitle: n.videoTitle,
              videoUrl: n.videoUrl,
              creatorName: n.creatorName,
              publishedAt: n.publishedAt,
              status: n.status,
              runId: n.runId ?? null,
            }))
          ),
        },
      ],
    };
  }
);

server.tool(
  "cancel_run",
  "Cancel an in-progress pipeline run",
  {
    runId: z.string().describe("The run ID to cancel"),
  },
  async ({ runId }) => {
    const run = await getRun(runId);
    if (!run) return { content: [{ type: "text", text: JSON.stringify({ error: "Run not found" }) }] };
    const activeStatuses = ["downloading", "transcribing", "analyzing", "clipping"];
    if (!activeStatuses.includes(run.status)) {
      return { content: [{ type: "text", text: JSON.stringify({ error: `Run not active (status: ${run.status})` }) }] };
    }
    if (run.pid) {
      try { process.kill(run.pid); } catch { /* already exited */ }
    }
    const { updateRun } = await import("../../ui/src/lib/run-store.js");
    await updateRun(run.runId, { status: "failed", completedAt: new Date().toISOString() });
    return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
  }
);

// ---------- Resources (read-only summaries) ----------

server.resource(
  "status",
  "clipbot://status",
  async () => {
    const runs = await listRuns();
    const today = new Date().toISOString().slice(0, 10);
    const runsToday = runs.filter((r) => r.startedAt?.startsWith(today)).length;
    const completedRuns = runs.filter((r) => r.status === "complete");

    let totalClips = 0;
    for (const run of completedRuns.slice(0, 20)) {
      const manifest = await getManifest(run.outputDir);
      totalClips += manifest?.clips?.length ?? 0;
    }

    const creators = await getCreators();
    const scheduled = await getScheduledPosts();
    const pendingPosts = scheduled.filter((p) => p.status === "scheduled").length;

    return {
      contents: [
        {
          uri: "clipbot://status",
          mimeType: "application/json",
          text: JSON.stringify({
            runsToday,
            totalRuns: runs.length,
            totalClips,
            trackedCreators: creators.length,
            pendingScheduledPosts: pendingPosts,
          }),
        },
      ],
    };
  }
);

// ---------- Event bridge ----------

import { soshiEvents } from '../events/emitter.js';

// Bridge soshi events to MCP notifications
soshiEvents.subscribe((eventName, data) => {
  server.server.notification({ method: 'notifications/event', params: { event: eventName, data } });
});

// ---------- Start ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Clipbot MCP server failed to start:", err);
  process.exit(1);
});
