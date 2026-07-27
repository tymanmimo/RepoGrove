#!/usr/bin/env node

import { RequestError } from "octokit";

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
    const { profile, repositories } = await fetchGitHubData(username);
    console.log(`Loaded @${profile.login}: ${repositories.length} public repositories.`);
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}
