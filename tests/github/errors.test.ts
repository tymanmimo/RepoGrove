import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RequestError } from "octokit";

import { formatError } from "../../src/github/errors.js";

function createRequestError(
  status: number,
  headers: Record<string, string> = {},
) {
  return new RequestError("secret-token\u001B[31m", status, {
    request: {
      method: "GET",
      url: "https://api.github.com/test",
      headers: {},
      request: {},
    },
    response: {
      status,
      url: "https://api.github.com/test",
      headers,
      data: {},
    },
  });
}

describe("formatError", () => {
  it("maps common GitHub responses to safe messages", () => {
    const cases: Array<[RequestError, string]> = [
      [createRequestError(401), "The GitHub token is invalid."],
      [createRequestError(404), "GitHub user not found."],
      [
        createRequestError(403, { "x-ratelimit-remaining": "0" }),
        "GitHub API rate limit exceeded. Add a GitHub token and try again.",
      ],
      [createRequestError(403), "GitHub denied the request."],
      [
        createRequestError(429),
        "GitHub API rate limit exceeded. Add a GitHub token and try again.",
      ],
      [createRequestError(503), "GitHub is temporarily unavailable."],
      [createRequestError(418), "GitHub API request failed."],
    ];

    for (const [error, expected] of cases) {
      const message = formatError(error);
      assert.equal(message, expected);
      assert.equal(message.includes("secret-token"), false);
      assert.equal(message.includes(String.fromCharCode(27)), false);
    }
  });

  it("maps cancellation and connection failures", () => {
    const aborted = new Error("secret-token");
    aborted.name = "AbortError";

    assert.equal(formatError(aborted), "Request cancelled.");
    assert.equal(formatError(new TypeError("secret-token")), "Could not connect to GitHub.");
    assert.equal(formatError(new Error("secret-token")), "An unexpected error occurred.");
  });
});
