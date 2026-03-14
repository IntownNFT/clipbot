#!/usr/bin/env node
/**
 * Clipbot HTTP Tool Server
 *
 * Exposes all Vercel AI SDK tools over HTTP for Soshi to call.
 * Runs from ui/ so @/ path aliases and deps resolve correctly.
 * Usage: cd ui && npx tsx http-server.ts
 */

import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { allTools } from "./src/lib/ai/tools";
import { getOutputDir } from "./src/lib/paths";
import {
  createRun,
  updateRun,
  findExistingRun,
} from "./src/lib/run-store";
import { spawnPipeline } from "./src/lib/pipeline-worker";

const PORT = parseInt(process.env.PORT || "3101");
const NAME = "clipbot";

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

/**
 * Handle process_video directly — bypasses Next.js API route.
 * Creates a run record and spawns the CLI pipeline as a background process.
 */
async function handleProcessVideo(args: { url: string; spaceId?: string; force?: boolean }) {
  const { url, spaceId, force } = args;
  if (!url) return { error: "URL is required" };

  if (!force) {
    const existing = await findExistingRun(url);
    if (existing) {
      const isActive = ["downloading", "transcribing", "analyzing", "clipping", "publishing"].includes(existing.status);
      if (isActive) {
        return { error: "This video is already being processed", existingRunId: existing.runId };
      }
      return { error: "This video was already processed", existingRunId: existing.runId, alreadyComplete: true };
    }
  }

  const runId = randomUUID().slice(0, 8);
  const outputDir = path.join(getOutputDir(), runId);

  await createRun({
    runId,
    sourceUrl: url,
    status: "downloading",
    ...(spaceId && { spaceId }),
    options: {
      quality: "1080",
      maxClips: 5,
      minScore: 7,
      maxDuration: 59,
      platforms: ["tiktok", "youtube", "instagram"],
      subtitles: true,
      niche: "cannabis",
      backgroundFillStyle: "blurred-zoom",
    },
    startedAt: new Date().toISOString(),
    outputDir,
  });

  const { pid } = await spawnPipeline({
    url,
    runId,
    quality: "1080",
    maxClips: 5,
    minScore: 7,
    maxDuration: 59,
    niche: "cannabis",
    subtitles: true,
    skipPublish: true,
    backgroundFillStyle: "blurred-zoom",
  });

  if (pid) {
    await updateRun(runId, { pid });
  }

  return { success: true, runId, message: "Pipeline started — use get_run_detail to check progress" };
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.url === "/health") {
    return json(200, { status: "ok", name: NAME, tools: Object.keys(allTools).length });
  }

  if (req.url === "/tools" && req.method === "GET") {
    const list = Object.entries(allTools).map(([name, t]) => ({
      name,
      description: (t as any).description || name,
    }));
    return json(200, list);
  }

  const match = req.url?.match(/^\/tools\/([a-z_]+)$/);
  if (match && req.method === "POST") {
    const toolName = match[1];
    const tool = (allTools as Record<string, any>)[toolName];
    if (!tool) return json(404, { error: `Tool "${toolName}" not found` });

    try {
      const body = await readBody(req);
      const args = body ? JSON.parse(body) : {};

      // Handle process_video directly — no Next.js needed
      if (toolName === "process_video") {
        const result = await handleProcessVideo(args);
        return json(result.error ? 400 : 200, result);
      }

      const result = await tool.execute(args);
      return json(200, result);
    } catch (err: any) {
      return json(500, { error: err.message || String(err) });
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[${NAME}] HTTP tool server on port ${PORT} (${Object.keys(allTools).length} tools)`);
});
