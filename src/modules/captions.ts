import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { log } from "../utils/logger.js";
import type { WordTimestamp } from "../types/clip.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execFileAsync = promisify(execFile);

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

/**
 * Slice word-level timestamps to a clip's time range.
 * Uses exact timestamps from YouTube auto-captions (tOffsetMs per word).
 * Returns timings relative to clip start (0 = first frame of clip).
 */
export function sliceWordTimings(
  wordTimestamps: WordTimestamp[],
  clipStartMs: number,
  clipEndMs: number
): WordTiming[] {
  const timings: WordTiming[] = [];

  for (const wt of wordTimestamps) {
    // Skip words entirely outside the clip range
    if (wt.endMs <= clipStartMs || wt.startMs >= clipEndMs) continue;

    timings.push({
      word: wt.word,
      startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
      endMs: Math.round(Math.min(wt.endMs, clipEndMs) - clipStartMs),
    });
  }

  return timings;
}

/**
 * Generate an ASS subtitle file with styled, highlighted captions and hook text
 */
function generateASS(opts: {
  words: WordTiming[];
  hookText?: string;
  hookDuration?: number;
  width: number;
  height: number;
}): string {
  const { words, hookText, hookDuration = 3, width, height } = opts;

  // ASS header with styles
  let ass = `[Script Info]
Title: ClipBot Captions
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,60,60,420,1
Style: CaptionHighlight,Arial,72,&H0000D7FF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,60,60,420,1
Style: Hook,Arial,56,&H00FFFFFF,&H0000FFFF,&H00000000,&HAA000000,-1,0,0,0,100,100,0,0,3,5,3,8,60,60,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Add hook text (first few seconds)
  if (hookText) {
    const hookEnd = formatASSTime(hookDuration * 1000);
    ass += `Dialogue: 1,0:00:00.00,${hookEnd},Hook,,0,0,0,,{\\fad(300,300)}${escapeASS(hookText)}\n`;
  }

  // Group words into lines of ~5 words
  const wordsPerLine = 5;
  for (let i = 0; i < words.length; i += wordsPerLine) {
    const lineWords = words.slice(i, i + wordsPerLine);
    const lineStart = lineWords[0]!.startMs;
    const lineEnd = lineWords[lineWords.length - 1]!.endMs;

    const startTime = formatASSTime(lineStart);
    const endTime = formatASSTime(lineEnd + 300); // Small buffer

    // Build line with karaoke timing for word-by-word highlight
    // \k tag: duration in centiseconds (1cs = 10ms)
    let lineText = "";
    for (const w of lineWords) {
      const durCs = Math.round((w.endMs - w.startMs) / 10);
      lineText += `{\\kf${durCs}}${escapeASS(w.word)} `;
    }

    ass += `Dialogue: 0,${startTime},${endTime},Caption,,0,0,0,,${lineText.trim()}\n`;
  }

  return ass;
}

function formatASSTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeASS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

/**
 * Check if the logo file exists in the assets directory
 */
async function findLogo(): Promise<string | null> {
  const logoPath = path.resolve(__dirname, "../../assets/logo.png");
  try {
    await access(logoPath);
    return logoPath;
  } catch {
    return null;
  }
}

/**
 * Burn captions, hook text, and logo watermark onto a video clip using ffmpeg + ASS subtitles
 */
export async function renderWithCaptions(opts: {
  inputVideoPath: string;
  outputPath: string;
  words: WordTiming[];
  hookText?: string;
  hookDuration?: number;
  durationInSeconds: number;
}): Promise<void> {
  const assContent = generateASS({
    words: opts.words,
    hookText: opts.hookText,
    hookDuration: opts.hookDuration,
    width: 1080,
    height: 1920,
  });

  // Write ASS file next to the output
  const assPath = opts.outputPath.replace(".mp4", ".ass");
  await writeFile(assPath, assContent, "utf-8");

  log.debug(`Generated ASS subtitles: ${opts.words.length} words`);

  const ffmpegBin = typeof ffmpegPath === "string" ? ffmpegPath : "ffmpeg";
  const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");

  // Check for logo watermark
  const logoPath = await findLogo();

  let args: string[];

  if (logoPath) {
    // With logo: use filter_complex to overlay logo + burn ASS subs
    // Logo: remove white bg (colorkey), scale to 80px wide, 60% opacity
    // Position: top-right safe zone (60px from right, 30px from top)
    const escapedLogoPath = logoPath.replace(/\\/g, "/");
    args = [
      "-i", opts.inputVideoPath,
      "-i", escapedLogoPath,
      "-filter_complex",
      `[1:v]colorkey=0xFFFFFF:0.3:0.15,scale=80:-1,format=rgba,colorchannelmixer=aa=0.6[logo];` +
      `[0:v][logo]overlay=W-w-60:30[bg];` +
      `[bg]ass='${escapedAssPath}'`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "28",
      "-maxrate", "4M",
      "-bufsize", "8M",
      "-c:a", "copy",
      "-movflags", "+faststart",
      "-y",
      opts.outputPath,
    ];
    log.debug("Adding MELT logo watermark (top-right)");
  } else {
    // Without logo: simple ASS subtitle burn
    args = [
      "-i", opts.inputVideoPath,
      "-vf", `ass='${escapedAssPath}'`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "28",
      "-maxrate", "4M",
      "-bufsize", "8M",
      "-c:a", "copy",
      "-movflags", "+faststart",
      "-y",
      opts.outputPath,
    ];
  }

  await execFileAsync(ffmpegBin, args, { timeout: 300000 });

  // Clean up ASS file
  await rm(assPath, { force: true }).catch(() => {});

  log.success(`Rendered with captions: ${path.basename(opts.outputPath)}`);
}
