#!/usr/bin/env node
import { Command } from "commander";
import { processCommand } from "./commands/process.js";
import { previewCommand } from "./commands/preview.js";
import { batchCommand } from "./commands/batch.js";
import { postCommand } from "./commands/post.js";
import { accountsCommand } from "./commands/accounts.js";
import { configCommand } from "./commands/config.js";
import { setVerbose } from "../utils/logger.js";

const program = new Command();

program
  .name("clipbot")
  .description("Automated viral clip pipeline: YouTube → AI → clip → post")
  .version("0.1.0")
  .option("--verbose", "Enable debug logging")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) setVerbose(true);
  });

program.addCommand(processCommand);
program.addCommand(previewCommand);
program.addCommand(batchCommand);
program.addCommand(postCommand);
program.addCommand(accountsCommand);
program.addCommand(configCommand);

program.parse();
