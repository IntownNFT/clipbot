import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRun, getManifest } from "@/lib/run-store";
import { updateRun } from "@/lib/run-store";
import { createSSEStream, sseResponse } from "@/lib/sse";

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
      // yt-dlp: [download]  45.2% of  1.23GiB at  5.20MiB/s ETA 02:15
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

/** Check if the pipeline process crashed (log has errors, no manifest created) */
async function detectCrash(outputDir: string): Promise<string | null> {
  try {
    const logPath = path.join(outputDir, "pipeline.log");
    const content = await readFile(logPath, "utf-8");
    if (!content.trim()) return null;

    // Check for known error patterns
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.match(/^error:/i) || line.match(/^Error:/)) {
        return line.trim();
      }
      if (line.includes("Cannot find module") || line.includes("SyntaxError")) {
        return line.trim();
      }
      if (line.includes("ENOENT") || line.includes("EACCES")) {
        return line.trim();
      }
    }
  } catch {
    // No log file
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  const stream = createSSEStream(async (send) => {
    let lastStatus = "";
    let attempts = 0;
    let noManifestCount = 0;
    const maxAttempts = 1200; // 10 minutes at 500ms

    while (attempts < maxAttempts) {
      const manifest = await getManifest(run.outputDir);

      // Parse download progress from log if still downloading
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

          // Update run record status
          if (manifest.status !== run.status) {
            await updateRun(runId, {
              status: manifest.status,
              completedAt: manifest.completedAt,
            });
          }
        } else {
          send("status", payload);
        }

        if (manifest.status === "complete" || manifest.status === "failed") {
          break;
        }
      } else {
        noManifestCount++;

        if (downloadProgress) {
          send("status", {
            id: runId,
            sourceUrl: run.sourceUrl,
            status: "downloading",
            startedAt: run.startedAt,
            downloadProgress,
          });
        }

        // After 15 seconds with no manifest, check if process crashed
        if (noManifestCount >= 30) {
          const crashMsg = await detectCrash(run.outputDir);
          if (crashMsg) {
            await updateRun(runId, { status: "failed" });
            send("status", {
              id: runId,
              sourceUrl: run.sourceUrl,
              status: "failed",
              startedAt: run.startedAt,
              error: { step: "startup", message: crashMsg },
            });
            break;
          }
        }

        // Re-check if the run was cancelled externally
        const freshRun = await getRun(runId);
        if (freshRun?.status === "failed" || freshRun?.status === "complete") {
          send("status", {
            id: runId,
            sourceUrl: run.sourceUrl,
            status: freshRun.status,
            startedAt: run.startedAt,
          });
          break;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
  });

  return sseResponse(stream);
}
