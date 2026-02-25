import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineState } from "../types/pipeline.js";
import { log } from "../utils/logger.js";

const MANIFEST_FILE = "manifest.json";

export function createInitialState(id: string, sourceUrl: string): PipelineState {
  return {
    id,
    sourceUrl,
    status: "downloading",
    startedAt: new Date().toISOString(),
  };
}

export async function saveState(
  state: PipelineState,
  outputDir: string
): Promise<void> {
  const filePath = path.join(outputDir, MANIFEST_FILE);
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  log.debug(`State saved: ${state.status}`);
}

export async function loadState(
  outputDir: string
): Promise<PipelineState | null> {
  try {
    const filePath = path.join(outputDir, MANIFEST_FILE);
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as PipelineState;
  } catch {
    return null;
  }
}
