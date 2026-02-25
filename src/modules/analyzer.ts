import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisResponseSchema, type ViralMoment } from "../types/clip.js";
import type { AnalysisOptions } from "../types/pipeline.js";
import { log } from "../utils/logger.js";
import { retry } from "../utils/retry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const promptCache = new Map<string, string>();

async function getSystemPrompt(niche?: string): Promise<string> {
  const cacheKey = niche ?? "__base__";
  if (promptCache.has(cacheKey)) return promptCache.get(cacheKey)!;

  const promptPath = path.resolve(__dirname, "../../prompts/viral-moments.md");
  let prompt = await readFile(promptPath, "utf-8");

  // Inject niche-specific instructions if configured
  if (niche) {
    try {
      const nichePath = path.resolve(__dirname, `../../prompts/niches/${niche}.md`);
      const nicheInstructions = await readFile(nichePath, "utf-8");
      prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", nicheInstructions);
    } catch {
      prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", "No niche-specific scoring for this video. Apply general viral criteria only.");
    }
  } else {
    prompt = prompt.replace("{{NICHE_INSTRUCTIONS}}", "No niche-specific scoring for this video. Apply general viral criteria only.");
  }

  promptCache.set(cacheKey, prompt);
  return prompt;
}

export async function analyzeTranscript(
  transcript: string,
  videoTitle: string,
  apiKey: string,
  options: AnalysisOptions
): Promise<ViralMoment[]> {
  const client = new Anthropic({ apiKey });
  const systemPrompt = await getSystemPrompt(options.niche);

  const userMessage = `Video Title: "${videoTitle}"

Find the top ${options.maxClips} most viral-worthy moments. Only include moments with a virality score of ${options.minScore} or higher. Each clip should be at most ${options.maxDuration} seconds.

TRANSCRIPT:
${transcript}`;

  log.debug(`Sending ${transcript.length} chars to ${options.model}`);

  const response = await retry(
    async () => {
      const msg = await client.messages.create({
        model: options.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        msg.content[0]?.type === "text" ? msg.content[0].text : "";

      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/m, "")
        .replace(/\n?```\s*$/m, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      return AnalysisResponseSchema.parse(parsed);
    },
    {
      maxAttempts: 2,
      onRetry: (attempt) =>
        log.warn(`Claude response parse failed, retrying (attempt ${attempt + 1})...`),
    }
  );

  const moments = response.moments
    .filter((m) => m.viralityScore >= options.minScore)
    .filter((m) => m.durationSeconds <= options.maxDuration)
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, options.maxClips);

  log.debug(
    `Analysis complete: ${response.moments.length} found, ${moments.length} passed filters`
  );

  return moments;
}
