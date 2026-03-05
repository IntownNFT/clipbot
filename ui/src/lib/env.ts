import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ENV_PATH } from "./paths";

/**
 * Load the parent .env file into process.env.
 * @param force - If true, re-reads from disk even if already loaded.
 */
let loaded = false;

export function loadEnv(force = false): void {
  if (loaded && !force) return;
  loaded = true;

  if (!existsSync(ENV_PATH)) return;

  try {
    const raw = readFileSync(ENV_PATH, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = value;
    }
  } catch {
    // .env file may not exist yet
  }
}

/**
 * Save or update a single key in the parent .env file and process.env.
 */
export function saveEnvVar(key: string, value: string): void {
  process.env[key] = value;

  let lines: string[] = [];
  if (existsSync(ENV_PATH)) {
    try {
      lines = readFileSync(ENV_PATH, "utf-8").split("\n");
    } catch {
      lines = [];
    }
  }

  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }

  if (!found) {
    lines.push(`${key}=${value}`);
  }

  writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

/**
 * Remove a key from the parent .env file and process.env.
 */
export function removeEnvVar(key: string): void {
  delete process.env[key];

  if (!existsSync(ENV_PATH)) return;

  try {
    const lines = readFileSync(ENV_PATH, "utf-8")
      .split("\n")
      .filter((line) => !line.trim().startsWith(`${key}=`));
    writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
  } catch {
    // ignore
  }
}
