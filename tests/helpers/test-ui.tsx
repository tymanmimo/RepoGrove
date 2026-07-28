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
      environmentToken={null}
      tokenStore={tokenStore}
      historyStore={historyStore}
    />,
  );
}

export async function waitForText(
  lastFrame: () => string | undefined,
  expectedText: string,
) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (lastFrame()?.includes(expectedText)) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Expected frame to include: ${expectedText}`);
}

export async function typeText(
  view: ReturnType<typeof render>,
  value: string,
) {
  view.stdin.write(value);
  await waitForText(view.lastFrame, value);
}

export async function openSearch(view: ReturnType<typeof render>) {
  await waitForText(view.lastFrame, "Main menu");
  view.stdin.write("1");
  await waitForText(view.lastFrame, "Search GitHub profiles");
}
