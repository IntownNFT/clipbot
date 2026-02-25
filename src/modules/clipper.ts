import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { ViralMoment } from "../types/clip.js";
import type { ClipOptions, ClipResult } from "../types/pipeline.js";
import { log } from "../utils/logger.js";

if (typeof ffmpegPath === "string" && ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

export async function createClip(
  sourcePath: string,
  moment: ViralMoment,
  options: ClipOptions
): Promise<ClipResult> {
  const safeName = sanitizeFilename(moment.title);
  const outputPath = path.join(
    options.outputDir,
    `clip_${moment.index}_${safeName}.mp4`
  );
  const thumbPath = path.join(
    options.outputDir,
    `clip_${moment.index}_${safeName}_thumb.jpg`
  );

  const startSec = Math.max(0, moment.startSeconds - options.padBefore);
  const endSec = moment.endSeconds + options.padAfter;
  const duration = Math.min(endSec - startSec, options.maxDuration);

  log.debug(
    `Clipping "${moment.title}" [${startSec.toFixed(1)}s - ${(startSec + duration).toFixed(1)}s]`
  );

  // Create the clip: center-crop to 9:16 and scale to 1080x1920
  await new Promise<void>((resolve, reject) => {
    const filters = [
      // Center crop to 9:16 aspect ratio
      "crop=ih*9/16:ih:(iw-ih*9/16)/2:0",
      // Scale to 1080x1920
      "scale=1080:1920",
      // Short fade in/out
      "fade=in:0:d=0.3",
      `fade=out:st=${Math.max(0, duration - 0.3)}:d=0.3`,
    ];

    ffmpeg(sourcePath)
      .inputOptions([`-ss ${startSec}`])
      .duration(duration)
      .videoFilters(filters)
      .videoCodec("libx264")
      .addOutputOptions([
        "-preset medium",
        "-crf 28",
        "-profile:v high",
        "-level 4.0",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-maxrate 4M",
        "-bufsize 8M",
      ])
      .audioCodec("aac")
      .audioBitrate("128k")
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  // Extract thumbnail from 1 second into the clip
  await new Promise<void>((resolve, reject) => {
    ffmpeg(outputPath)
      .inputOptions(["-ss 1"])
      .frames(1)
      .output(thumbPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  const fileStats = await stat(outputPath);

  return {
    momentIndex: moment.index,
    title: moment.title,
    filePath: outputPath,
    thumbnailPath: thumbPath,
    durationSeconds: duration,
    fileSizeBytes: fileStats.size,
    resolution: { width: 1080, height: 1920 },
  };
}

export async function createAllClips(
  sourcePath: string,
  moments: ViralMoment[],
  options: ClipOptions
): Promise<ClipResult[]> {
  const results: ClipResult[] = [];

  for (const moment of moments) {
    try {
      const clip = await createClip(sourcePath, moment, options);
      results.push(clip);
      log.success(`Clip ${moment.index}: "${moment.title}" (${clip.durationSeconds.toFixed(1)}s)`);
    } catch (err) {
      log.error(
        `Failed to clip "${moment.title}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return results;
}
