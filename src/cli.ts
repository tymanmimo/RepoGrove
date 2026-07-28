#!/usr/bin/env node

import { RequestError } from "octokit";

import { analyzeGitHubData } from "./analyzer.js";
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

const username = process.argv[2]?.trim();

if (!username) {
  console.error("Usage: github-analyzer <username>");
  process.exitCode = 1;
} else {
  try {
    const data = await fetchGitHubData(username);
    const statistics = analyzeGitHubData(data);

    console.log(`GitHub profile: @${statistics.username}`);
    console.log(`Public repositories: ${statistics.repositoryCount}`);
    console.log(`Total stars: ${statistics.starCount}`);

    if (statistics.languages.length === 0) {
      console.log("Languages: No language data available.");
    } else {
      console.log("Languages:");

      for (const language of statistics.languages) {
        const repositoryLabel =
          language.repositoryCount === 1 ? "repository" : "repositories";
        console.log(
          `  ${language.name}: ${language.repositoryCount} ${repositoryLabel} (${language.percentage}%)`,
        );
      }
    }
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}
