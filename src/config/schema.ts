import { z } from "zod";

const PlatformSchema = z.enum(["tiktok", "youtube", "instagram"]);

export const ConfigFileSchema = z.object({
  cobaltUrl: z.string().url().optional(),
  claudeModel: z.string().optional(),
  accounts: z.record(z.string(), z.string()).optional(),
  defaultQuality: z.string().optional(),
  defaultMaxClips: z.number().int().positive().optional(),
  defaultMinScore: z.number().int().min(1).max(10).optional(),
  defaultMaxDuration: z.number().int().positive().optional(),
  outputDir: z.string().optional(),
  niche: z.string().optional(),
  subtitles: z.boolean().optional(),
  padBefore: z.number().nonnegative().optional(),
  padAfter: z.number().nonnegative().optional(),
  defaultPlatforms: z.array(PlatformSchema).optional(),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;
