/**
 * Pipeline Worker Server
 *
 * Lightweight HTTP server that wraps the existing CLI pipeline.
 * Run locally with: npx tsx worker.ts
 * Expose via Cloudflare Tunnel: cloudflared tunnel --url http://localhost:4000
 *
 * The Vercel-deployed UI proxies pipeline requests to this worker via WORKER_URL.
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { readFile, readdir, stat, open, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = parseInt(process.env.WORKER_PORT || "4000", 10);
const AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN || "";
const OUTPUT_DIR = process.env.CLIPBOT_OUTPUT_DIR || path.join(__dirname, "clipbot-output");
const CLI_ENTRY = path.join(__dirname, "src", "cli", "index.ts");

// ── In-memory job tracking ───────────────────────────────────────────────

interface Job {
  runId: string;
  url: string;
  status: string;
  pid?: number;
  outputDir: string;
  startedAt: string;
  options: Record<string, unknown>;
}

const jobs = new Map<string, Job>();

// ── Helpers ──────────────────────────────────────────────────────────────

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function parseRawBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const COOKIES_PATH = path.join(process.env.CLIPBOT_HOME || __dirname, "cookies.txt");

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function checkAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!AUTH_TOKEN) return true; // No auth configured
  const header = req.headers.authorization;
  if (header === `Bearer ${AUTH_TOKEN}`) return true;
  json(res, { error: "Unauthorized" }, 401);
  return false;
}

async function readManifest(outputDir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(path.join(outputDir, "manifest.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function parseDownloadProgress(outputDir: string) {
  try {
    const logPath = path.join(outputDir, "pipeline.log");
    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      const match = line.match(
        /\[download\]\s+([\d.]+)%\s+of\s+~?\s*[\d.]+\w+\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/
      );
      if (match) return { percent: parseFloat(match[1]!), speed: match[2]!, eta: match[3]! };
      if (line.match(/\[download\]\s+100%/)) return { percent: 100, speed: "", eta: "" };
    }
  } catch {}
  return null;
}

// ── Route Handlers ───────────────────────────────────────────────────────

async function handlePostJob(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = await parseBody(req);
  const url = body.url as string;
  if (!url) return json(res, { error: "URL is required" }, 400);

  const runId = body.runId as string || crypto.randomUUID().slice(0, 8);
  const outputDir = path.join(OUTPUT_DIR, runId);
  const options = body.options as Record<string, unknown> || {};

  // Build CLI args
  const args = [
    "--tsconfig", path.join(__dirname, "tsconfig.json"),
    CLI_ENTRY, "process", url,
    "--run-id", runId,
  ];

  if (options.quality) args.push("--quality", String(options.quality));
  if (options.maxClips !== undefined) args.push("--max-clips", String(options.maxClips));
  if (options.minScore !== undefined) args.push("--min-score", String(options.minScore));
  if (options.maxDuration !== undefined) args.push("--max-duration", String(options.maxDuration));
  if (options.niche) args.push("--niche", String(options.niche));
  if (options.subtitles === false) args.push("--no-subtitles");
  args.push("--no-post"); // Never auto-publish from worker
  if (options.backgroundFillStyle) args.push("--bg-style", String(options.backgroundFillStyle));
  if (options.captionStyle) args.push("--caption-style", String(options.captionStyle));
  if (options.captionMode) args.push("--caption-mode", String(options.captionMode));
  if (options.scoringWeights) args.push("--scoring-weights", String(options.scoringWeights));

  // Create log directory
  try { await mkdir(outputDir, { recursive: true }); } catch {}

  const logPath = path.join(outputDir, "pipeline.log");
  const fullCommand = `npx tsx ${args.join(" ")} >"${logPath}" 2>&1`;

  const child = spawn(fullCommand, [], {
    cwd: __dirname,
    stdio: "ignore",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  child.unref();

  const job: Job = {
    runId,
    url,
    status: "downloading",
    pid: child.pid,
    outputDir,
    startedAt: new Date().toISOString(),
    options,
  };
  jobs.set(runId, job);

  console.log(`[worker] Started job ${runId} for ${url} (pid=${child.pid})`);
  json(res, { runId, outputDir }, 201);
}

async function handleGetJob(res: http.ServerResponse, runId: string) {
  const job = jobs.get(runId);
  const outputDir = job?.outputDir || path.join(OUTPUT_DIR, runId);
  const manifest = await readManifest(outputDir);
  const downloadProgress = await parseDownloadProgress(outputDir);

  if (manifest) {
    json(res, { ...manifest, downloadProgress });
  } else if (job) {
    json(res, { id: runId, sourceUrl: job.url, status: job.status, startedAt: job.startedAt, downloadProgress });
  } else {
    json(res, { error: "Job not found" }, 404);
  }
}

async function handleGetJobs(res: http.ServerResponse) {
  // Scan output directory for all runs
  const results: Record<string, unknown>[] = [];
  try {
    const dirs = await readdir(OUTPUT_DIR);
    for (const dir of dirs) {
      const manifest = await readManifest(path.join(OUTPUT_DIR, dir));
      if (manifest) {
        results.push({ runId: dir, ...manifest });
      } else {
        const job = jobs.get(dir);
        if (job) results.push({ runId: dir, sourceUrl: job.url, status: job.status, startedAt: job.startedAt });
      }
    }
  } catch {}
  json(res, results);
}

function handleStream(res: http.ServerResponse, runId: string) {
  const job = jobs.get(runId);
  const outputDir = job?.outputDir || path.join(OUTPUT_DIR, runId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  let attempts = 0;
  const maxAttempts = 1200; // 10 min at 500ms

  const poll = async () => {
    if (attempts >= maxAttempts || res.destroyed) {
      res.end();
      return;
    }
    attempts++;

    const manifest = await readManifest(outputDir);
    const downloadProgress = await parseDownloadProgress(outputDir);

    if (manifest) {
      const payload = { ...manifest, downloadProgress };
      res.write(`event: status\ndata: ${JSON.stringify(payload)}\n\n`);

      if (manifest.status === "complete" || manifest.status === "failed") {
        res.end();
        return;
      }
    } else if (downloadProgress) {
      const payload = {
        id: runId,
        sourceUrl: job?.url ?? "",
        status: "downloading",
        startedAt: job?.startedAt ?? new Date().toISOString(),
        downloadProgress,
      };
      res.write(`event: status\ndata: ${JSON.stringify(payload)}\n\n`);
    }

    setTimeout(poll, 500);
  };

  poll();
}

async function handleServeFile(req: http.IncomingMessage, res: http.ServerResponse, filePath: string) {
  const resolved = path.resolve(path.join(OUTPUT_DIR, filePath));
  if (!resolved.startsWith(path.resolve(OUTPUT_DIR))) {
    json(res, { error: "Forbidden" }, 403);
    return;
  }

  try {
    const fileStat = await stat(resolved);
    const fileSize = fileStat.size;
    const ext = path.extname(resolved).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4", ".webm": "video/webm",
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".gif": "image/gif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) { res.writeHead(416); res.end(); return; }
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = await open(resolved, "r");
      const buffer = Buffer.alloc(chunkSize);
      await file.read(buffer, 0, chunkSize, start);
      await file.close();
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      });
      res.end(buffer);
    } else {
      const file = await open(resolved, "r");
      const buffer = Buffer.alloc(fileSize);
      await file.read(buffer, 0, fileSize, 0);
      await file.close();
      res.writeHead(200, {
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(buffer);
    }
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

// ── Server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    });
    res.end();
    return;
  }

  if (!checkAuth(req, res)) return;

  // POST /jobs — start a pipeline job
  if (req.method === "POST" && pathname === "/jobs") {
    return handlePostJob(req, res);
  }

  // GET /jobs — list all jobs
  if (req.method === "GET" && pathname === "/jobs") {
    return handleGetJobs(res);
  }

  // GET /jobs/:id — get job status
  const jobMatch = pathname.match(/^\/jobs\/([^/]+)$/);
  if (req.method === "GET" && jobMatch) {
    return handleGetJob(res, jobMatch[1]);
  }

  // GET /jobs/:id/stream — SSE progress
  const streamMatch = pathname.match(/^\/jobs\/([^/]+)\/stream$/);
  if (req.method === "GET" && streamMatch) {
    return handleStream(res, streamMatch[1]);
  }

  // GET /files/* — serve output files
  if (req.method === "GET" && pathname.startsWith("/files/")) {
    const filePath = decodeURIComponent(pathname.slice("/files/".length));
    return handleServeFile(req, res, filePath);
  }

  // PUT /cookies — upload cookies.txt content
  if (req.method === "PUT" && pathname === "/cookies") {
    const body = await parseRawBody(req);
    if (!body.trim()) return json(res, { error: "Empty body" }, 400);
    try {
      await mkdir(path.dirname(COOKIES_PATH), { recursive: true });
      await writeFile(COOKIES_PATH, body);
      console.log(`[worker] Cookies updated at ${COOKIES_PATH} (${body.length} bytes)`);
      return json(res, { ok: true, path: COOKIES_PATH, size: body.length });
    } catch (err) {
      return json(res, { error: `Failed to write cookies: ${err}` }, 500);
    }
  }

  // GET /cookies/status — check if cookies exist
  if (req.method === "GET" && pathname === "/cookies/status") {
    try {
      await access(COOKIES_PATH);
      const st = await stat(COOKIES_PATH);
      const content = await readFile(COOKIES_PATH, "utf-8");
      const hasAuth = content.includes("LOGIN_INFO") || content.includes("__Secure-1PSID");
      return json(res, { exists: true, size: st.size, hasAuth, path: COOKIES_PATH, modified: st.mtime.toISOString() });
    } catch {
      return json(res, { exists: false, path: COOKIES_PATH });
    }
  }

  // GET /health
  if (pathname === "/health") {
    return json(res, { ok: true, jobs: jobs.size });
  }

  json(res, { error: "Not found" }, 404);
});

server.listen(PORT, () => {
  console.log(`\n  Pipeline Worker running on http://localhost:${PORT}`);
  console.log(`  Output dir: ${OUTPUT_DIR}`);
  if (AUTH_TOKEN) console.log(`  Auth: enabled`);
  else console.log(`  Auth: disabled (set WORKER_AUTH_TOKEN to enable)`);
  console.log(`\n  Expose with: cloudflared tunnel --url http://localhost:${PORT}\n`);
});
