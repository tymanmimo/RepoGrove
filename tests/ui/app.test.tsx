import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { cleanup } from "ink-testing-library";

import type { HistoryStore } from "../../src/storage/history-store.js";
import { profileStatistics } from "../fixtures/profile-statistics.js";
import { createHistoryStore, createTokenStore } from "../helpers/stores.js";
import {
  openSearch,
  renderApp,
  typeText,
  waitFor,
  waitForText,
} from "../helpers/test-ui.js";

afterEach(cleanup);

async function useSavedToken(view: ReturnType<typeof renderApp>) {
  await waitForText(view.lastFrame, "Use saved token");
  view.stdin.write("\r");
  await openSearch(view);
}

async function openTokenSettings(view: ReturnType<typeof renderApp>) {
  view.stdin.write("\u0014");
  await waitForText(view.lastFrame, "GITHUB_TOKEN Setup");
}

describe("App", () => {
  it("moves from welcome to an anonymous workspace", async () => {
    const view = renderApp({ terminalSize: { columns: 100, rows: 40 } });

    await waitForText(view.lastFrame, "Add GITHUB_TOKEN");
    assert.match(view.lastFrame() ?? "", /REPOGROVE/);
    assert.match(view.lastFrame() ?? "", /████████████/);
    view.stdin.write("j");
    await waitForText(view.lastFrame, "Continue without a token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search Account");

    const frame = view.lastFrame() ?? "";
    assert.match(frame, /Search History/);
    assert.match(frame, /Anonymous/);
    assert.match(frame, /Search for a GitHub account to begin/);
  });

  it("automatically searches an initial username once", async () => {
    const { store } = createTokenStore("saved-token");
    const history = createHistoryStore();
    const searches: Array<{ username: string; token: string | null }> = [];
    const view = renderApp({
      initialUsername: "  tymanmimo  ",
      tokenStore: store,
      historyStore: history.store,
      async fetchStatistics(username, token) {
        searches.push({ username, token });
        return { ...profileStatistics, username };
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.deepEqual(searches, [
      { username: "tymanmimo", token: "saved-token" },
    ]);
    assert.equal(history.state.entries[0]?.username, "tymanmimo");

    await openTokenSettings(view);
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search Account");
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(searches.length, 1);
  });

  it("searches with a saved token and updates the sidebar", async () => {
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

    await useSavedToken(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(receivedToken, "saved-token");
    assert.equal(history.state.entries[0]?.username, "octocat");
    assert.match(view.lastFrame() ?? "", /hello-world/);
  });

  it("shows errors inside the workspace", async () => {
    const { store } = createTokenStore("saved-token");
    const view = renderApp({
      tokenStore: store,
      fetchStatistics: async () => Promise.reject(new Error("Network error")),
    });

    await useSavedToken(view);
    await typeText(view, "missing-user");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Search failed");

    const frame = view.lastFrame() ?? "";
    assert.match(frame, /unexpected error/);
    assert.match(frame, /Search Account/);
    assert.match(frame, /Search History/);
  });

  it("switches focus and repeats a search from history", async () => {
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

    await useSavedToken(view);
    await waitForText(view.lastFrame, "octocat");
    view.stdin.write("\t");
    await new Promise((resolve) => setTimeout(resolve, 50));
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(searchedUsername, "octocat");
  });

  it("clears history from the sidebar", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    const history = createHistoryStore([
      {
        username: "octocat",
        searchedAt: "2026-07-27T12:00:00.000Z",
      },
    ]);
    const view = renderApp({ tokenStore, historyStore: history.store });

    await useSavedToken(view);
    view.stdin.write("\t");
    await new Promise((resolve) => setTimeout(resolve, 50));
    view.stdin.write("2");
    await waitForText(view.lastFrame, "No searches yet.");

    assert.deepEqual(history.state.entries, []);
    assert.equal(history.state.clearCount, 1);
  });

  it("opens token settings with Ctrl+T and returns to the workspace", async () => {
    const { store } = createTokenStore("saved-token");
    const view = renderApp({ tokenStore: store });

    await useSavedToken(view);
    await typeText(view, "octo");
    await openTokenSettings(view);
    await waitForText(view.lastFrame, "Back to workspace");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search Account");

    assert.match(view.lastFrame() ?? "", /octo/);
    assert.doesNotMatch(view.lastFrame() ?? "", /octot/);
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

    await useSavedToken(view);
    await openTokenSettings(view);
    await waitForText(view.lastFrame, "Delete saved token");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Add GITHUB_TOKEN");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search Account");
    assert.match(view.lastFrame() ?? "", /Anonymous/);

    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    assert.equal(receivedToken, null);
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

    await useSavedToken(view);
    await openTokenSettings(view);
    await waitForText(view.lastFrame, "Delete saved token");
    view.stdin.write("3");
    await waitForText(view.lastFrame, "Use environment token");
    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search Account");
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");

    assert.equal(receivedToken, "environment-token");
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

    await useSavedToken(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Fetching @octocat");
    assert.equal(requestCount, 1);

    view.stdin.write("\u001B");
    await waitForText(view.lastFrame, "Search for a GitHub account to begin.");
    assert.equal(capturedSignal?.aborted, true);
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

    await useSavedToken(view);
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
        return [{ username, searchedAt: "2026-07-28T12:00:00.000Z" }];
      },
      async clear() {},
    };
    const view = renderApp({
      tokenStore,
      historyStore,
      fetchStatistics: async () => profileStatistics,
    });

    await useSavedToken(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    resolveLoad?.([
      {
        username: "stale-user",
        searchedAt: "2026-07-20T12:00:00.000Z",
      },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.doesNotMatch(view.lastFrame() ?? "", /stale-user/);
  });

  it("allows searches while history persistence is pending", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    const searches: string[] = [];
    const historyStore: HistoryStore = {
      async load() {
        return [
          {
            username: "second-user",
            searchedAt: "2026-07-20T12:00:00.000Z",
          },
        ];
      },
      async add() {
        return new Promise(() => {});
      },
      async clear() {},
    };
    const view = renderApp({
      initialUsername: "first-user",
      tokenStore,
      historyStore,
      async fetchStatistics(username) {
        searches.push(username);
        return { ...profileStatistics, username };
      },
    });

    await waitForText(view.lastFrame, "Use saved token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    await waitForText(view.lastFrame, "second-user");
    view.stdin.write("\t");
    await new Promise((resolve) => setTimeout(resolve, 50));
    view.stdin.write("\r");
    await waitFor(
      () => searches.length === 2,
      "Expected a second search while history persistence was pending",
    );

    assert.deepEqual(searches, ["first-user", "second-user"]);
  });

  it("ignores a stale startup history failure", async () => {
    const { store: tokenStore } = createTokenStore("saved-token");
    let rejectLoad: ((reason: Error) => void) | undefined;
    const startupHistory = new Promise<never[]>((_resolve, reject) => {
      rejectLoad = reject;
    });
    const historyStore: HistoryStore = {
      async load() {
        return startupHistory;
      },
      async add(username) {
        return [{ username, searchedAt: "2026-07-28T12:00:00.000Z" }];
      },
      async clear() {},
    };
    const view = renderApp({
      tokenStore,
      historyStore,
      fetchStatistics: async () => profileStatistics,
    });

    await useSavedToken(view);
    await typeText(view, "octocat");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Active Projects");
    rejectLoad?.(new Error("History unavailable"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.doesNotMatch(view.lastFrame() ?? "", /Search history is unavailable/);
  });

  it("adapts result details to compact and wide terminals", async () => {
    const compactToken = createTokenStore("saved-token");
    const compact = renderApp({
      tokenStore: compactToken.store,
      terminalSize: { columns: 30, rows: 12 },
      fetchStatistics: async () => profileStatistics,
    });

    await useSavedToken(compact);
    await typeText(compact, "octocat");
    compact.stdin.write("\r");
    await waitForText(compact.lastFrame, "@octocat");
    assert.doesNotMatch(compact.lastFrame() ?? "", /https:\/\//);
    compact.unmount();

    const mediumToken = createTokenStore("saved-token");
    const medium = renderApp({
      tokenStore: mediumToken.store,
      terminalSize: { columns: 50, rows: 20 },
      fetchStatistics: async () => profileStatistics,
    });

    await useSavedToken(medium);
    await typeText(medium, "octocat");
    medium.stdin.write("\r");
    await waitForText(medium.lastFrame, "@octocat");
    assert.doesNotMatch(medium.lastFrame() ?? "", /https:\/\//);
    medium.unmount();

    const wideToken = createTokenStore("saved-token");
    const wide = renderApp({
      tokenStore: wideToken.store,
      terminalSize: { columns: 100, rows: 40 },
      fetchStatistics: async () => profileStatistics,
    });

    await useSavedToken(wide);
    await typeText(wide, "octocat");
    wide.stdin.write("\r");
    await waitForText(wide.lastFrame, "Active Projects");
    assert.match(wide.lastFrame() ?? "", /https:\/\/github.com/);
  });
});
