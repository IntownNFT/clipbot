import { z } from "zod";

export interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

/** A single word with its exact timestamp from YouTube auto-captions */
export interface WordTimestamp {
  word: string;
  /** Absolute start time in the original video (ms) */
  startMs: number;
  /** Absolute end time in the original video (ms) */
  endMs: number;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  startFormatted: string;
  endFormatted: string;
  text: string;
}

export const ViralMomentSchema = z.object({
  index: z.number().int().positive(),
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(500),
  hookText: z.string().min(1).max(200),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  durationSeconds: z.number().positive(),
  viralityScore: z.number().int().min(1).max(10),
  reasoning: z.string().min(1),
  hashtags: z.array(z.string()).min(1).max(10),
  category: z.enum([
    "humor",
    "education",
    "controversy",
    "emotional",
    "unexpected",
    "quotable",
  ]),
});

export type ViralMoment = z.infer<typeof ViralMomentSchema>;

export const AnalysisResponseSchema = z.object({
  videoSummary: z.string(),
  overallViralPotential: z.number().int().min(1).max(10),
  moments: z.array(ViralMomentSchema),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
