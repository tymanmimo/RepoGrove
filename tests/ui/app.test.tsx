import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { profileStatistics } from "../fixtures/profile-statistics.js";
import { createHistoryStore, createTokenStore } from "../helpers/stores.js";
import {
  openSearch,
  renderApp,
  typeText,
  waitForText,
} from "../helpers/test-ui.js";

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
});
