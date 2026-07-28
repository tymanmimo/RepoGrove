import * as React from "react";
import { render } from "ink-testing-library";

import { App, type AppProps } from "../../src/ui/app.js";
import { createHistoryStore, createTokenStore } from "./stores.js";

export function renderApp(props: AppProps = {}) {
  const tokenStore = props.tokenStore ?? createTokenStore().store;
  const historyStore = props.historyStore ?? createHistoryStore().store;
  return render(
    <App
      {...props}
      environmentToken={props.environmentToken ?? null}
      tokenStore={tokenStore}
      historyStore={historyStore}
    />,
  );
}

export async function waitForText(
  lastFrame: () => string | undefined,
  expectedText: string,
) {
  await waitFor(
    () => Boolean(lastFrame()?.includes(expectedText)),
    `Expected frame to include: ${expectedText}`,
  );
}

export async function waitFor(
  condition: () => boolean,
  failureMessage: string,
) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (condition()) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(failureMessage);
}

export async function typeText(
  view: ReturnType<typeof render>,
  value: string,
) {
  view.stdin.write(value);
  await waitForText(view.lastFrame, value);
}

export async function openSearch(view: ReturnType<typeof render>) {
  await waitForText(view.lastFrame, "Search Account");
}
