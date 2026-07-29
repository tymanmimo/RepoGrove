import * as React from "react";
import { useInput, useWindowSize } from "ink";

import { analyzeProfile, type ProfileStatistics } from "../core/profile-analyzer.js";
import { fetchGitHubData, validateGitHubToken } from "../github/client.js";
import { formatError } from "../github/errors.js";
import {
  localHistoryStore,
  type HistoryStore,
  type SearchHistoryEntry,
} from "../storage/history-store.js";
import { systemTokenStore, type TokenStore } from "../storage/token-store.js";
import { TokenSetup } from "./screens/token-setup.js";
import { WelcomeScreen } from "./screens/welcome-screen.js";
import type { TerminalSize, WorkspaceFocus } from "./types.js";
import type { HistoryAction } from "./workspace/history-sidebar.js";
import type { ResultStatus } from "./workspace/results-panel.js";
import { Workspace } from "./workspace/workspace.js";

const { useEffect, useRef, useState } = React;

type Screen = "welcome" | "workspace";

export interface AppProps {
  initialUsername?: string;
  environmentToken?: string | null;
  tokenStore?: TokenStore;
  historyStore?: HistoryStore;
  terminalSize?: TerminalSize;
  validateToken?: (token: string, signal?: AbortSignal) => Promise<void>;
  fetchStatistics?: (
    username: string,
    token: string | null,
    signal?: AbortSignal,
  ) => Promise<ProfileStatistics>;
}

async function loadStatistics(
  username: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<ProfileStatistics> {
  const data = await fetchGitHubData(username, token, signal);
  return analyzeProfile(data);
}

export function App({
  initialUsername = "",
  environmentToken = process.env.GITHUB_TOKEN?.trim() || null,
  tokenStore = systemTokenStore,
  historyStore = localHistoryStore,
  terminalSize,
  validateToken = validateGitHubToken,
  fetchStatistics = loadStatistics,
}: AppProps) {
  const windowSize = useWindowSize();
  const size = terminalSize ?? windowSize;
  const normalizedInitialUsername = initialUsername.trim();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [welcomeCanCancel, setWelcomeCanCancel] = useState(false);
  const [focus, setFocus] = useState<WorkspaceFocus>("search");
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [username, setUsername] = useState(normalizedInitialUsername);
  const [status, setStatus] = useState<ResultStatus>("idle");
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchingRef = useRef(false);
  const historyRevisionRef = useRef(0);
  const suppressInputRef = useRef(false);
  const initialSearchRef = useRef(normalizedInitialUsername);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      searchControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const historyRevision = historyRevisionRef.current;

    historyStore
      .load()
      .then((entries) => {
        if (mounted && historyRevision === historyRevisionRef.current) {
          setHistory(entries);
        }
      })
      .catch(() => {
        if (mounted && historyRevision === historyRevisionRef.current) {
          setHistoryError("Search history is unavailable.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [historyStore]);

  useInput(
    (input, key) => {
      if (key.tab) {
        setFocus((current) => (current === "search" ? "history" : "search"));
        return;
      }

      if (key.ctrl && input === "t") {
        const preservedUsername = username;
        suppressInputRef.current = true;
        queueMicrotask(() => {
          setUsername(preservedUsername);
          suppressInputRef.current = false;
        });
        setWelcomeCanCancel(true);
        setScreen("welcome");
        return;
      }

      if (key.escape && status === "loading") {
        requestIdRef.current += 1;
        searchControllerRef.current?.abort();
        searchingRef.current = false;
        setStatus(statistics ? "result" : "idle");
      }
    },
    { isActive: screen === "workspace" },
  );

  const changeUsername = (value: string) => {
    if (!suppressInputRef.current) {
      setUsername(value);
    }
  };

  const search = async (value: string, token = activeToken) => {
    const normalizedUsername = value.trim();

    if (!normalizedUsername || searchingRef.current) {
      return;
    }

    searchingRef.current = true;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setUsername(normalizedUsername);
    setError("");
    setStatus("loading");

    try {
      const result = await fetchStatistics(
        normalizedUsername,
        token,
        controller.signal,
      );

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        controller.signal.aborted
      ) {
        return;
      }

      setStatistics(result);
      setStatus("result");
      searchingRef.current = false;
      searchControllerRef.current = null;

      try {
        historyRevisionRef.current += 1;
        const updatedHistory = await historyStore.add(result.username);

        if (mountedRef.current && requestId === requestIdRef.current) {
          setHistory(updatedHistory);
          setHistoryError("");
        }
      } catch {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setHistoryError("Could not save search history.");
        }
      }
    } catch (searchError) {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current &&
        !controller.signal.aborted
      ) {
        setError(formatError(searchError));
        setStatus("error");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        searchingRef.current = false;
        searchControllerRef.current = null;
      }
    }
  };

  const selectHistory = async (action: HistoryAction) => {
    if (action.type === "search") {
      setFocus("search");
      await search(action.username);
      return;
    }

    try {
      historyRevisionRef.current += 1;
      await historyStore.clear();
      setHistory([]);
      setHistoryError("");
    } catch {
      setHistoryError("Could not clear search history.");
    }
  };

  const completeTokenSetup = (token: string | null) => {
    const initialSearch = initialSearchRef.current;
    initialSearchRef.current = "";
    setActiveToken(token);
    setWelcomeCanCancel(false);
    setScreen("workspace");
    setFocus("search");

    if (initialSearch) {
      void search(initialSearch, token);
    }
  };

  const tokenSetupProps = {
    environmentToken,
    tokenStore,
    validateToken,
    onComplete: completeTokenSetup,
    onTokenChange: setActiveToken,
  };

  if (screen === "welcome") {
    return (
      <WelcomeScreen size={size}>
        <TokenSetup
          {...tokenSetupProps}
          {...(welcomeCanCancel
            ? { onCancel: () => setScreen("workspace") }
            : {})}
        />
      </WelcomeScreen>
    );
  }

  return (
    <Workspace
      size={size}
      focus={focus}
      history={history}
      historyError={historyError}
      username={username}
      authenticated={Boolean(activeToken)}
      status={status}
      statistics={statistics}
      error={error}
      onHistorySelect={selectHistory}
      onUsernameChange={changeUsername}
      onSearch={search}
    />
  );
}
