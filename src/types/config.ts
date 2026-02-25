export type Platform = "tiktok" | "youtube" | "instagram" | "facebook";

export interface ClipBotConfig {
  cobaltUrl: string;
  claudeApiKey: string;
  claudeModel: string;
  lateApiKey: string;
  accounts: Record<string, string>;
  defaultQuality: string;
  defaultMaxClips: number;
  defaultMinScore: number;
  defaultMaxDuration: number;
  outputDir: string;
  niche: string;
  subtitles: boolean;
  padBefore: number;
  padAfter: number;
  defaultPlatforms: Platform[];
}
