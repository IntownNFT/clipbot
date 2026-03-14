import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRun, getManifest } from "@/lib/run-store";
import { updateRun } from "@/lib/run-store";
import { createSSEStream, sseResponse } from "@/lib/sse";

const WORKER_URL = process.env.WORKER_URL;
const WORKER_AUTH = process.env.WORKER_AUTH_TOKEN;
const isServerless = !!process.env.VERCEL;

/** Parse yt-dlp progress from the last lines of pipeline.log */
async function parseDownloadProgress(
  outputDir: string
): Promise<{ percent: number; speed: string; eta: string } | null> {
  try {
    const logPath = path.join(outputDir, "pipeline.log");
    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      const match = line.match(
        /\[download\]\s+([\d.]+)%\s+of\s+~?\s*[\d.]+\w+\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/
      );
      if (match) {
        return {
          percent: parseFloat(match[1]!),
          speed: match[2]!,
          eta: match[3]!,
        };
      }
      const done = line.match(/\[download\]\s+100%/);
      if (done) {
        return { percent: 100, speed: "", eta: "" };
      }
    }
  } catch {
    // Log file doesn't exist yet
  }
  return null;
}

/** Check if the pipeline process crashed */
async function detectCrash(outputDir: string): Promise<string | null> {
  try {
    const logPath = path.join(outputDir, "pipeline.log");
    const content = await readFile(logPath, "utf-8");
    if (!content.trim()) return null;
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.match(/^error:/i) || line.match(/^Error:/)) return line.trim();
      if (line.includes("Cannot find module") || line.includes("SyntaxError")) return line.trim();
      if (line.includes("ENOENT") || line.includes("EACCES")) return line.trim();
    }
  } catch {}
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  // ── Proxy SSE from worker ──────────────────────────────────────────
  if (isServerless && WORKER_URL) {
    const headers: Record<string, string> = {};
    if (WORKER_AUTH) headers["Authorization"] = `Bearer ${WORKER_AUTH}`;

    try {
      const workerRes = await fetch(`${WORKER_URL}/jobs/${runId}/stream`, { headers });

      if (!workerRes.ok || !workerRes.body) {
        return new Response("Worker stream unavailable", { status: 502 });
      }

      // Pipe the worker's SSE stream directly through
      return new Response(workerRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch {
      return new Response("Worker unreachable", { status: 502 });
    }
  }

  if (isServerless) {
    return new Response("No worker configured", { status: 501 });
  }

  // ── Local mode ─────────────────────────────────────────────────────
  const run = await getRun(runId);
  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  const stream = createSSEStream(async (send) => {
    let lastStatus = "";
    let attempts = 0;
    let noManifestCount = 0;
    const maxAttempts = 1200;

    while (attempts < maxAttempts) {
      const manifest = await getManifest(run.outputDir);
      const currentStatus = manifest?.status ?? run.status;
      let downloadProgress = null;
      if (currentStatus === "downloading" || !manifest) {
        downloadProgress = await parseDownloadProgress(run.outputDir);
      }

      if (manifest) {
        noManifestCount = 0;
        const payload = { ...manifest, downloadProgress };
        if (manifest.status !== lastStatus) {
          send("status", payload);
          lastStatus = manifest.status;
          if (manifest.status !== run.status) {
            await updateRun(runId, { status: manifest.status, completedAt: manifest.completedAt });
          }
        } else {
          send("status", payload);
        }
        if (manifest.status === "complete" || manifest.status === "failed") break;
      } else {
        noManifestCount++;
        if (downloadProgress) {
          send("status", {
            id: runId, sourceUrl: run.sourceUrl, status: "downloading",
            startedAt: run.startedAt, downloadProgress,
          });
        }
        if (noManifestCount >= 30) {
          const crashMsg = await detectCrash(run.outputDir);
          if (crashMsg) {
            await updateRun(runId, { status: "failed" });
            send("status", {
              id: runId, sourceUrl: run.sourceUrl, status: "failed",
              startedAt: run.startedAt, error: { step: "startup", message: crashMsg },
            });
            break;
          }
        }
        const freshRun = await getRun(runId);
        if (freshRun?.status === "failed" || freshRun?.status === "complete") {
          send("status", { id: runId, sourceUrl: run.sourceUrl, status: freshRun.status, startedAt: run.startedAt });
          break;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
  });

  return sseResponse(stream);
}
