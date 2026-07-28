#!/usr/bin/env node

import { createRequire } from "node:module";
import { createElement } from "react";
import { Command } from "commander";
import { render } from "ink";

import { App } from "./ui/app.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const enterAlternateScreen = "\u001B[?1049h";
const leaveAlternateScreen = "\u001B[?1049l";

const program = new Command()
  .name("repogrove")
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

    process.stdout.write(enterAlternateScreen);

    try {
      const app = render(createElement(App));
      await app.waitUntilExit();
    } finally {
      process.stdout.write(leaveAlternateScreen);
    }
  });

await program.parseAsync(process.argv);
