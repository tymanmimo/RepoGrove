#!/usr/bin/env node

import { createElement } from "react";
import { Command } from "commander";
import { render } from "ink";

import { App } from "./app.js";

const program = new Command()
  .name("github-analyzer")
  .description("Explore public GitHub profiles in an interactive terminal UI")
  .version("0.1.0")
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
