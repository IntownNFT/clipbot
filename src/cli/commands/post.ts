import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { loadState } from "../../pipeline/state.js";
import { uploadAndPost } from "../../modules/publisher.js";
import { log } from "../../utils/logger.js";
import type { Platform } from "../../types/config.js";
import type { PlatformTarget } from "../../types/pipeline.js";

export const postCommand = new Command("post")
  .description("Post previously generated clips from a pipeline run")
  .argument("<directory>", "Output directory from a previous run")
  .option(
    "-p, --platforms <list>",
    "Target platforms",
    "tiktok,youtube,instagram"
  )
  .option("--schedule <datetime>", "ISO 8601 datetime to schedule posts")
  .option("--select <clips>", "Specific clip numbers to post (e.g., 1,3,5)")
  .option("--config <path>", "Path to config file")
  .action(async (directory: string, opts) => {
    const config = await loadConfig(opts.config);

    if (!config.lateApiKey) {
      log.error("Missing LATE_API_KEY. Set it in .env or environment.");
      process.exit(1);
    }

    const state = await loadState(directory);
    if (!state) {
      log.error(`No manifest.json found in: ${directory}`);
      process.exit(1);
    }

    if (!state.clips || state.clips.length === 0) {
      log.error("No clips found in this pipeline run.");
      process.exit(1);
    }

    if (!state.moments || state.moments.length === 0) {
      log.error("No moment data found in this pipeline run.");
      process.exit(1);
    }

    const platforms: Platform[] = (opts.platforms as string).split(",") as Platform[];
    const platformTargets: PlatformTarget[] = platforms
      .filter((p) => config.accounts[p])
      .map((p) => ({ platform: p, accountId: config.accounts[p]! }));

    if (platformTargets.length === 0) {
      log.error(
        "No platform accounts configured. Set account IDs in clipbot.config.json."
      );
      process.exit(1);
    }

    // Filter clips if --select is provided
    let clips = state.clips;
    if (opts.select) {
      const selected = (opts.select as string)
        .split(",")
        .map((n: string) => parseInt(n.trim()));
      clips = clips.filter((c) => selected.includes(c.momentIndex));
    }

    const spinner = ora(`Publishing ${clips.length} clips...`).start();

    let published = 0;
    for (const clip of clips) {
      const moment = state.moments.find((m) => m.index === clip.momentIndex);
      if (!moment) continue;

      try {
        spinner.text = `Publishing clip ${clip.momentIndex}: "${clip.title}"...`;
        await uploadAndPost(clip, moment, config.lateApiKey, {
          platforms: platformTargets,
          publishNow: !opts.schedule,
          scheduledFor: opts.schedule,
        });
        published++;
      } catch (err) {
        log.error(
          `Failed clip ${clip.momentIndex}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    spinner.stop();
    console.log(
      `${chalk.bold("Published:")} ${chalk.green(`${published}/${clips.length}`)} clips`
    );
  });
