import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { cleanup } from "ink-testing-library";

import { profileStatistics } from "../fixtures/profile-statistics.js";
import { createHistoryStore, createTokenStore } from "../helpers/stores.js";
import type { HistoryStore } from "../../src/storage/history-store.js";
import {
  openSearch,
  renderApp,
  typeText,
  waitForText,
} from "../helpers/test-ui.js";

afterEach(cleanup);

describe("App", () => {
  it("continues in anonymous mode", async () => {
    const view = renderApp();

    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("j");
    await waitForText(view.lastFrame, "Continue without a token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Main menu");

    assert.match(view.lastFrame() ?? "", /Anonymous/);
    view.unmount();
  });

  it("uses the saved token and records a successful search", async () => {
    const { store } = createTokenStore("saved-token");
    const history = createHistoryStore();
    let receivedToken: string | null = null;
    const view = renderApp({
      tokenStore: store,
      historyStore: history.store,
      async fetchStatistics(_username, token) {
        receivedToken = token;
        return profileStatistics;
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(receivedToken, "saved-token");
    assert.match(view.lastFrame() ?? "", /@octocat/);
    assert.match(view.lastFrame() ?? "", /hello-world/);

    view.stdin.write("m");
    await waitForText(view.lastFrame, "Search history (1)");
    assert.equal(history.state.entries[0]?.username, "octocat");

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
    await openSearch(view);
    await typeText(view, "missing-user");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search failed");
    assert.match(view.lastFrame() ?? "", /unexpected error/);

    view.stdin.write("r");
    await waitForText(view.lastFrame, "Search GitHub profiles");

    view.unmount();
  });

  it("repeats a search from persistent history", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    const history = createHistoryStore([
      {
        username: "octocat",
        searchedAt: "2026-07-27T12:00:00.000Z",
      },
    ]);
    let searchedUsername = "";
    const view = renderApp({
      tokenStore,
      historyStore: history.store,
      async fetchStatistics(username) {
        searchedUsername = username;
        return profileStatistics;
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search history (1)");
    view.stdin.write("2");
    await waitForText(view.lastFrame, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(searchedUsername, "octocat");
    assert.equal(history.state.entries[0]?.username, "octocat");
    view.unmount();
  });

  it("clears search history", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    const history = createHistoryStore([
      {
        username: "octocat",
        searchedAt: "2026-07-27T12:00:00.000Z",
      },
    ]);
    const view = renderApp({
      tokenStore,
      historyStore: history.store,
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search history (1)");
    view.stdin.write("2");
    await waitForText(view.lastFrame, "Clear history");
    view.stdin.write("2");
    await waitForText(view.lastFrame, "No searches yet.");

    assert.deepEqual(history.state.entries, []);
    assert.equal(history.state.clearCount, 1);
    view.unmount();
  });

  it("opens token settings and returns to the main menu", async () => {
    const { store } = createTokenStore("saved-token");
    const view = renderApp({ tokenStore: store });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Token settings");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Back to main menu");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Main menu");

    view.unmount();
  });

  it("clears the active token after deleting saved credentials", async () => {
    const { store } = createTokenStore("saved-token");
    let receivedToken: string | null | undefined;
    const view = renderApp({
      tokenStore: store,
      async fetchStatistics(_username, token) {
        receivedToken = token;
        return profileStatistics;
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Token settings");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Delete saved token");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Main menu");
    assert.match(view.lastFrame() ?? "", /Anonymous/);

    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    assert.equal(receivedToken, null);

    view.unmount();
  });

  it("falls back to the environment token after deleting saved credentials", async () => {
    const { store } = createTokenStore("saved-token");
    let receivedToken: string | null | undefined;
    const view = renderApp({
      environmentToken: " environment-token ",
      tokenStore: store,
      async fetchStatistics(_username, token) {
        receivedToken = token;
        return profileStatistics;
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Token settings");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Delete saved token");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Use environment token");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Main menu");

    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    assert.equal(receivedToken, "environment-token");

    view.unmount();
  });

  it("prevents duplicate searches and cancels loading with Escape", async () => {
    const { store } = createTokenStore("saved-token");
    let requestCount = 0;
    let capturedSignal: AbortSignal | undefined;
    const view = renderApp({
      tokenStore: store,
      fetchStatistics: async (_username, _token, signal) => {
        requestCount += 1;
        capturedSignal = signal;
        return new Promise<never>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const error = new Error("cancelled");
            error.name = "AbortError";
            reject(error);
          });
        });
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Fetching @octocat");
    assert.equal(requestCount, 1);

    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search GitHub profiles");
    assert.equal(capturedSignal?.aborted, true);

    view.unmount();
  });

  it("ignores a late search result after unmount", async () => {
    const { store } = createTokenStore("saved-token");
    const history = createHistoryStore();
    let resolveRequest: ((value: typeof profileStatistics) => void) | undefined;
    const request = new Promise<typeof profileStatistics>((resolve) => {
      resolveRequest = resolve;
    });
    const view = renderApp({
      tokenStore: store,
      historyStore: history.store,
      fetchStatistics: async () => request,
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Fetching @octocat");
    view.unmount();
    resolveRequest?.(profileStatistics);
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(history.state.addCount, 0);
  });

  it("does not overwrite a new search with stale startup history", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    let resolveLoad:
      | ((entries: Array<{ username: string; searchedAt: string }>) => void)
      | undefined;
    const startupHistory = new Promise<
      Array<{ username: string; searchedAt: string }>
    >((resolve) => {
      resolveLoad = resolve;
    });
    const historyStore: HistoryStore = {
      async load() {
        return startupHistory;
      },
      async add(username) {
        return [
          {
            username,
            searchedAt: "2026-07-28T12:00:00.000Z",
          },
        ];
      },
      async clear() {},
    };
    const view = renderApp({
      tokenStore,
      historyStore,
      fetchStatistics: async () => profileStatistics,
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await openSearch(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    view.stdin.write("m");
    await waitForText(view.lastFrame, "Search history (1)");

    resolveLoad?.([
      {
        username: "stale-user",
        searchedAt: "2026-07-20T12:00:00.000Z",
      },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    view.stdin.write("2");
    await waitForText(view.lastFrame, "octocat");

    assert.doesNotMatch(view.lastFrame() ?? "", /stale-user/);
    view.unmount();
  });
});
