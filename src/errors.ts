import { RequestError } from "octokit";

export function formatError(error: unknown): string {
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
    return "GitHub API rate limit exceeded. Add a GitHub token and try again.";
  }

  return `GitHub API request failed: ${error.message}`;
}
