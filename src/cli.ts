#!/usr/bin/env node

import { createRequire } from "node:module";
import { createElement } from "react";
import { Command } from "commander";
import { render } from "ink";

import { App } from "./ui/app.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command()
  .name("github-analyzer")
  .description("Explore public GitHub profiles in an interactive terminal UI")
  .version(version)
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async () => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error("Interactive mode requires a terminal.");
      process.exitCode = 1;
      return;
    }

    const app = render(createElement(App));
    await app.waitUntilExit();
  });

await program.parseAsync(process.argv);
