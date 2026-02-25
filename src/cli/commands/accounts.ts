import { Command } from "commander";
import ora from "ora";
import Table from "cli-table3";
import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { listAccounts } from "../../modules/publisher.js";
import { log } from "../../utils/logger.js";

export const accountsCommand = new Command("accounts")
  .description("List connected social media accounts from Late")
  .option("--json", "Output as JSON")
  .option("--config <path>", "Path to config file")
  .action(async (opts) => {
    const config = await loadConfig(opts.config);

    if (!config.lateApiKey) {
      log.error("Missing LATE_API_KEY. Set it in .env or environment.");
      process.exit(1);
    }

    const spinner = ora("Fetching accounts...").start();

    try {
      const accounts = await listAccounts(config.lateApiKey);
      spinner.stop();

      if (accounts.length === 0) {
        log.warn("No connected accounts found. Connect accounts at getlate.dev.");
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(accounts, null, 2));
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan("Account ID"),
          chalk.cyan("Platform"),
          chalk.cyan("Name"),
        ],
      });

      for (const account of accounts) {
        table.push([account.id, account.platform, account.name]);
      }

      console.log(`\n${chalk.bold("Connected Accounts:")}`);
      console.log(table.toString());
      console.log(
        `\n${chalk.gray("Copy the Account IDs into clipbot.config.json under 'accounts'.")}`
      );
    } catch (err) {
      spinner.fail(
        `Failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });
