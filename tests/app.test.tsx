import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { render } from "ink-testing-library";
import * as React from "react";

import type { ProfileStatistics } from "../src/analyzer.js";
import { App } from "../src/app.js";

const statistics: ProfileStatistics = {
  username: "octocat",
  repositoryCount: 8,
  starCount: 21_868,
  languages: [
    {
      name: "TypeScript",
      repositoryCount: 4,
      percentage: 80,
    },
    {
      name: "JavaScript",
      repositoryCount: 1,
      percentage: 20,
    },
  ],
  activeProjects: [
    {
      name: "hello-world",
      language: "TypeScript",
      starCount: 42,
      url: "https://github.com/octocat/hello-world",
      updatedAt: "2026-07-28T00:00:00Z",
    },
  ],
};

async function waitForText(
  lastFrame: () => string | undefined,
  expectedText: string,
) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (lastFrame()?.includes(expectedText)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.fail(`Expected frame to include: ${expectedText}`);
}

describe("App", () => {
  it("renders the search screen", () => {
    const view = render(<App />);

    assert.match(view.lastFrame() ?? "", /Search GitHub profiles/);
    assert.match(view.lastFrame() ?? "", /Enter a username/);

    view.unmount();
  });

  it("loads and displays a profile dashboard", async () => {
    let resolveRequest: ((value: ProfileStatistics) => void) | undefined;
    const request = new Promise<ProfileStatistics>((resolve) => {
      resolveRequest = resolve;
    });
    const view = render(<App fetchStatistics={() => request} />);

    view.stdin.write("octocat");
    await waitForText(view.lastFrame, "octocat");
    view.stdin.write("\r");

    await waitForText(view.lastFrame, "Fetching @octocat");
    resolveRequest?.(statistics);
    await waitForText(view.lastFrame, "Active Projects");

    const frame = view.lastFrame() ?? "";
    assert.match(frame, /@octocat/);
    assert.match(frame, /21868/);
    assert.match(frame, /TypeScript/);
    assert.match(frame, /hello-world/);

    view.unmount();
  });

  it("shows an error and returns to search", async () => {
    const view = render(
      <App fetchStatistics={() => Promise.reject(new Error("Network error"))} />,
    );

    view.stdin.write("missing-user");
    await waitForText(view.lastFrame, "missing-user");
    view.stdin.write("\r");

    await waitForText(view.lastFrame, "Search failed");
    assert.match(view.lastFrame() ?? "", /unexpected error/);

    view.stdin.write("r");
    await waitForText(view.lastFrame, "Search GitHub profiles");

    view.unmount();
  });
});
