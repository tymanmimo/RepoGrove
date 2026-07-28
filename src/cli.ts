#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { RequestError } from "octokit";
import ora from "ora";

import { analyzeGitHubData } from "./analyzer.js";
import { formatStatistics } from "./formatter.js";
import { fetchGitHubData } from "./github.js";

function formatError(error: unknown): string {
  if (!(error instanceof RequestError)) {
    return "An unexpected error occurred.";
  }

  if (error.status === 404) {
    return "GitHub user not found.";
  }

  if (error.status === 401) {
    return "The GitHub token is invalid.";
  }

  if (error.status === 403) {
    return "GitHub API rate limit exceeded. Set GITHUB_TOKEN and try again.";
  }

  return `GitHub API request failed: ${error.message}`;
}

const program = new Command()
  .name("github-analyzer")
  .description("Analyze a public GitHub profile")
  .version("0.1.0")
  .argument("<username>", "GitHub username to analyze")
  .showHelpAfterError()
  .configureOutput({
    outputError: (message, write) => write(chalk.red(message)),
  })
  .action(async (username: string) => {
    const spinner = ora({
      text: `Fetching @${username.trim()}...`,
      color: "blue",
    }).start();

    try {
      const data = await fetchGitHubData(username.trim());
      const statistics = analyzeGitHubData(data);
      spinner.succeed(chalk.blueBright("Profile loaded"));
      console.log(`\n${formatStatistics(statistics)}`);
    } catch (error) {
      spinner.fail(chalk.red(formatError(error)));
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);
