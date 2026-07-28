import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { render } from "ink-testing-library";
import * as React from "react";

import type { ProfileStatistics } from "../src/analyzer.js";
import { App, type AppProps } from "../src/app.js";
import type { TokenStore } from "../src/credentials.js";

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

function createTokenStore(initialToken: string | null = null) {
  const state = {
    token: initialToken,
    deleteCount: 0,
  };
  const store: TokenStore = {
    async getToken() {
      return state.token;
    },
    async saveToken(token) {
      state.token = token;
    },
    async deleteToken() {
      state.token = null;
      state.deleteCount += 1;
    },
  };

  return { state, store };
}

function renderApp(props: AppProps = {}) {
  const tokenStore = props.tokenStore ?? createTokenStore().store;
  return render(
    <App {...props} environmentToken={null} tokenStore={tokenStore} />,
  );
}

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

async function typeText(
  view: ReturnType<typeof render>,
  value: string,
) {
  view.stdin.write(value);
  await waitForText(view.lastFrame, value);
}

describe("App", () => {
  it("offers saved token authentication on startup", async () => {
    const { store } = createTokenStore("saved-token");
    const view = renderApp({ tokenStore: store });

    await waitForText(view.lastFrame, "Use saved token");
    assert.match(view.lastFrame() ?? "", /Continue without a token/);
    assert.doesNotMatch(view.lastFrame() ?? "", /saved-token/);

    view.unmount();
  });

  it("continues in anonymous mode", async () => {
    const view = renderApp();

    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("2");
    await waitForText(view.lastFrame, "Search GitHub profiles");

    assert.match(view.lastFrame() ?? "", /Anonymous/);
    view.unmount();
  });

  it("uses the saved token for profile requests", async () => {
    const { store } = createTokenStore("saved-token");
    let receivedToken: string | null = null;
    const view = renderApp({
      tokenStore: store,
      async fetchStatistics(_username, token) {
        receivedToken = token;
        return statistics;
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search GitHub profiles");
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(receivedToken, "saved-token");
    assert.match(view.lastFrame() ?? "", /@octocat/);
    assert.match(view.lastFrame() ?? "", /hello-world/);

    view.unmount();
  });

  it("masks, validates, and saves a new token", async () => {
    const { state, store } = createTokenStore();
    let validatedToken = "";
    const view = renderApp({
      tokenStore: store,
      async validateToken(token) {
        validatedToken = token;
        return "octocat";
      },
    });
    const token = "github_pat_secret";

    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Enter GitHub token");
    view.stdin.write(token);
    await waitForText(view.lastFrame, "*".repeat(token.length));

    assert.doesNotMatch(view.lastFrame() ?? "", new RegExp(token));

    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search GitHub profiles");

    assert.equal(validatedToken, token);
    assert.equal(state.token, token);
    assert.doesNotMatch(view.lastFrame() ?? "", new RegExp(token));

    view.unmount();
  });

  it("replaces and deletes a saved token", async () => {
    const { state, store } = createTokenStore("old-token");
    const replaceView = renderApp({
      tokenStore: store,
      validateToken: async () => "octocat",
    });

    await waitForText(replaceView.lastFrame, "Replace saved token");
    replaceView.stdin.write("2");
    await waitForText(replaceView.lastFrame, "Enter GitHub token");
    replaceView.stdin.write("new-token");
    await waitForText(replaceView.lastFrame, "*********");
    replaceView.stdin.write("\r");
    await waitForText(replaceView.lastFrame, "Search GitHub profiles");

    assert.equal(state.token, "new-token");
    replaceView.unmount();

    const deleteView = renderApp({ tokenStore: store });
    await waitForText(deleteView.lastFrame, "Delete saved token");
    deleteView.stdin.write("3");
    await waitForText(deleteView.lastFrame, "Add a GitHub token");

    assert.equal(state.token, null);
    assert.equal(state.deleteCount, 1);
    deleteView.unmount();
  });

  it("rejects an invalid token without saving it", async () => {
    const { state, store } = createTokenStore();
    const view = renderApp({
      tokenStore: store,
      validateToken: async () => Promise.reject(new Error("Invalid token")),
    });

    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Enter GitHub token");
    view.stdin.write("invalid-token");
    await waitForText(view.lastFrame, "*************");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "An unexpected error occurred.");

    assert.equal(state.token, null);
    assert.doesNotMatch(view.lastFrame() ?? "", /invalid-token/);
    view.unmount();
  });

  it("shows a profile error and returns to search", async () => {
    const { store } = createTokenStore("saved-token");
    const view = renderApp({
      tokenStore: store,
      fetchStatistics: async () => Promise.reject(new Error("Network error")),
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search GitHub profiles");
    await typeText(view, "missing-user");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search failed");
    assert.match(view.lastFrame() ?? "", /unexpected error/);

    view.stdin.write("r");
    await waitForText(view.lastFrame, "Search GitHub profiles");

    view.unmount();
  });
});
