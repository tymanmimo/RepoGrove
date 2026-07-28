import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { render } from "ink-testing-library";
import * as React from "react";

import { TokenSetup } from "../../src/ui/screens/token-setup.js";
import { createTokenStore } from "../helpers/stores.js";
import { waitForText } from "../helpers/test-ui.js";

describe("TokenSetup", () => {
  it("offers saved token authentication without exposing the token", async () => {
    const { store } = createTokenStore("saved-token");
    const view = render(
      <TokenSetup
        environmentToken={null}
        tokenStore={store}
        validateToken={async () => {}}
        onComplete={() => {}}
      />,
    );

    await waitForText(view.lastFrame, "Use saved token");
    assert.match(view.lastFrame() ?? "", /Continue without a token/);
    assert.doesNotMatch(view.lastFrame() ?? "", /saved-token/);

    view.unmount();
  });

  it("masks, validates, and saves a new token", async () => {
    const { state, store } = createTokenStore();
    let validatedToken = "";
    let activeToken: string | null = null;
    const view = render(
      <TokenSetup
        environmentToken={null}
        tokenStore={store}
        validateToken={async (token) => {
          validatedToken = token;
        }}
        onComplete={(token) => {
          activeToken = token;
        }}
      />,
    );
    const token = "github_pat_secret";

    await waitForText(view.lastFrame, "Add a GitHub token");
    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Enter GitHub token");
    view.stdin.write(token);
    await waitForText(view.lastFrame, "*".repeat(token.length));

    assert.doesNotMatch(view.lastFrame() ?? "", new RegExp(token));

    view.stdin.write("\r");
    await waitForText(view.lastFrame, "Validating and saving token");

    assert.equal(validatedToken, token);
    assert.equal(state.token, token);
    assert.equal(activeToken, token);
    assert.doesNotMatch(view.lastFrame() ?? "", new RegExp(token));

    view.unmount();
  });

  it("replaces and deletes a saved token", async () => {
    const { state, store } = createTokenStore("old-token");
    const replaceView = render(
      <TokenSetup
        environmentToken={null}
        tokenStore={store}
        validateToken={async () => {}}
        onComplete={() => {}}
      />,
    );

    await waitForText(replaceView.lastFrame, "Replace saved token");
    replaceView.stdin.write("2");
    await waitForText(replaceView.lastFrame, "Enter GitHub token");
    replaceView.stdin.write("new-token");
    await waitForText(replaceView.lastFrame, "*********");
    replaceView.stdin.write("\r");
    await waitForText(replaceView.lastFrame, "Validating and saving token");

    assert.equal(state.token, "new-token");
    replaceView.unmount();

    const deleteView = render(
      <TokenSetup
        environmentToken={null}
        tokenStore={store}
        validateToken={async () => {}}
        onComplete={() => {}}
      />,
    );
    await waitForText(deleteView.lastFrame, "Delete saved token");
    deleteView.stdin.write("3");
    await waitForText(deleteView.lastFrame, "Add a GitHub token");

    assert.equal(state.token, null);
    assert.equal(state.deleteCount, 1);
    deleteView.unmount();
  });

  it("rejects an invalid token without saving it", async () => {
    const { state, store } = createTokenStore();
    const view = render(
      <TokenSetup
        environmentToken={null}
        tokenStore={store}
        validateToken={async () => Promise.reject(new Error("Invalid token"))}
        onComplete={() => {}}
      />,
    );

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
});
