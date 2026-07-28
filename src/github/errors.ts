import { RequestError } from "octokit";

export function formatError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Request cancelled.";
  }

  if (error instanceof TypeError) {
    return "Could not connect to GitHub.";
  }

  if (!(error instanceof RequestError)) {
    return "An unexpected error occurred.";
  }

  if (error.status === 404) {
    return "GitHub user not found.";
  }

  if (error.status === 401) {
    return "The GitHub token is invalid.";
  }

  const rateLimitRemaining = error.response?.headers["x-ratelimit-remaining"];

  if (
    error.status === 429 ||
    (error.status === 403 && String(rateLimitRemaining) === "0")
  ) {
    return "GitHub API rate limit exceeded. Add a GitHub token and try again.";
  }

  if (error.status === 403) {
    return "GitHub denied the request.";
  }

  if (error.status >= 500) {
    return "GitHub is temporarily unavailable.";
  }

  return "GitHub API request failed.";
}
