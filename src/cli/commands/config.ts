import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";

export const configCommand = new Command("config")
  .description("View current configuration")
  .option("--config <path>", "Path to config file")
  .action(async (opts) => {
    const config = await loadConfig(opts.config);

    // Mask API keys
    const display = {
      ...config,
      claudeApiKey: config.claudeApiKey
        ? `${config.claudeApiKey.slice(0, 10)}...`
        : chalk.red("NOT SET"),
      lateApiKey: config.lateApiKey
        ? `${config.lateApiKey.slice(0, 10)}...`
        : chalk.red("NOT SET"),
    };

    console.log(`\n${chalk.bold("ClipBot Configuration:")}\n`);
    console.log(JSON.stringify(display, null, 2));
  });
