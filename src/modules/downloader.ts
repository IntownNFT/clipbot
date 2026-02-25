import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { log } from "../utils/logger.js";
import { retry } from "../utils/retry.js";
import { extractVideoId } from "../utils/url.js";
import type { DownloadOptions, DownloadResult } from "../types/pipeline.js";

const execFileAsync = promisify(execFile);

interface CobaltResponse {
  status: "tunnel" | "redirect" | "picker" | "error";
  url?: string;
  filename?: string;
  error?: string;
}

export async function downloadVideo(
  youtubeUrl: string,
  cobaltUrl: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  // Try cobalt first, fall back to yt-dlp
  try {
    return await downloadViaCobalt(youtubeUrl, cobaltUrl, options);
  } catch (cobaltErr) {
    log.warn(
      `Cobalt unavailable (${cobaltErr instanceof Error ? cobaltErr.message : String(cobaltErr)}), falling back to yt-dlp...`
    );
    return await downloadViaYtDlp(youtubeUrl, options);
  }
}

async function downloadViaCobalt(
  youtubeUrl: string,
  cobaltUrl: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  const apiUrl = cobaltUrl.replace(/\/$/, "");

  const cobaltRes = await retry(async () => {
    const res = await fetch(`${apiUrl}/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        videoQuality: options.quality,
        youtubeVideoCodec: "h264",
        filenameStyle: "nerdy",
      }),
    });

    if (!res.ok) {
      throw new Error(`Cobalt API returned ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as CobaltResponse;
  }, { maxAttempts: 1 });

  if (cobaltRes.status === "error") {
    throw new Error(`Cobalt error: ${cobaltRes.error ?? "Unknown error"}`);
  }

  if (!cobaltRes.url) {
    throw new Error(`Cobalt returned status "${cobaltRes.status}" with no URL`);
  }

  const filename = cobaltRes.filename ?? "video.mp4";
  const filePath = path.join(options.outputDir, filename);

  log.debug(`Downloading from tunnel: ${cobaltRes.url}`);

  const downloadRes = await retry(async () => {
    const res = await fetch(cobaltRes.url!);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    return res;
  });

  const totalBytes = parseInt(
    downloadRes.headers.get("Content-Length") ??
      downloadRes.headers.get("Estimated-Content-Length") ??
      "0",
    10
  );

  if (!downloadRes.body) {
    throw new Error("Download response has no body");
  }

  let downloadedBytes = 0;
  const reader = downloadRes.body.getReader();
  const nodeStream = new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
        return;
      }
      downloadedBytes += value.length;
      if (totalBytes > 0) {
        options.onProgress?.(Math.round((downloadedBytes / totalBytes) * 100));
      }
      this.push(Buffer.from(value));
    },
  });

  const writeStream = createWriteStream(filePath);
  await pipeline(nodeStream, writeStream);

  const fileStats = await stat(filePath);

  return {
    filePath,
    filename,
    fileSize: fileStats.size,
    quality: options.quality,
    durationSeconds: 0,
  };
}

async function downloadViaYtDlp(
  youtubeUrl: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  const videoId = extractVideoId(youtubeUrl) ?? "video";
  const outputTemplate = path.join(options.outputDir, `${videoId}.%(ext)s`);

  log.debug(`Downloading via yt-dlp: ${youtubeUrl}`);

  const args = [
    "-m", "yt_dlp",
    "-f", `bestvideo[height<=${options.quality}]+bestaudio/best[height<=${options.quality}]/best`,
    "--merge-output-format", "mp4",
    "-o", outputTemplate,
    "--no-playlist",
    ...(typeof ffmpegPath === "string" ? ["--ffmpeg-location", ffmpegPath] : []),
    youtubeUrl,
  ];

  await execFileAsync("python", args, { timeout: 300000 });

  // Find the downloaded file
  const expectedPath = path.join(options.outputDir, `${videoId}.mp4`);
  const fileStats = await stat(expectedPath);
  const filename = `${videoId}.mp4`;

  log.debug(`Downloaded ${fileStats.size} bytes to ${expectedPath}`);

  return {
    filePath: expectedPath,
    filename,
    fileSize: fileStats.size,
    quality: options.quality,
    durationSeconds: 0,
  };
}
