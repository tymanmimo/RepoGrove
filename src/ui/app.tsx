import * as React from "react";
import { Box, useApp, useInput } from "ink";

import { analyzeProfile, type ProfileStatistics } from "../core/profile-analyzer.js";
import { fetchGitHubData, validateGitHubToken } from "../github/client.js";
import { formatError } from "../github/errors.js";
import {
  localHistoryStore,
  type HistoryStore,
  type SearchHistoryEntry,
} from "../storage/history-store.js";
import { systemTokenStore, type TokenStore } from "../storage/token-store.js";
import { Header } from "./components/header.js";
import {
  HistoryMenu,
  type HistoryAction,
} from "./screens/history-menu.js";
import { MainMenu, type MainMenuAction } from "./screens/main-menu.js";
import {
  LoadingScreen,
  ProfileDashboard,
  SearchErrorScreen,
  SearchScreen,
} from "./screens/profile-screens.js";
import { TokenSetup } from "./screens/token-setup.js";

const { useEffect, useRef, useState } = React;

type Screen =
  | "authentication"
  | "menu"
  | "token-settings"
  | "history"
  | "search"
  | "loading"
  | "result"
  | "error";

export interface AppProps {
  environmentToken?: string | null;
  tokenStore?: TokenStore;
  historyStore?: HistoryStore;
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
  environmentToken = process.env.GITHUB_TOKEN?.trim() || null,
  tokenStore = systemTokenStore,
  historyStore = localHistoryStore,
  validateToken = validateGitHubToken,
  fetchStatistics = loadStatistics,
}: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("authentication");
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [username, setUsername] = useState("");
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchingRef = useRef(false);
  const historyRevisionRef = useRef(0);

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
        if (mounted) {
          setHistoryError("Search history is unavailable.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [historyStore]);

  useInput(
    (input, key) => {
      if (
        input === "q" &&
        (screen === "menu" ||
          screen === "history" ||
          screen === "result" ||
          screen === "error")
      ) {
        exit();
      }

      if (key.escape && (screen === "search" || screen === "history")) {
        setScreen("menu");
      }

      if (key.escape && screen === "loading") {
        requestIdRef.current += 1;
        searchControllerRef.current?.abort();
        searchingRef.current = false;
        setScreen("search");
      }

      if (input === "r" && (screen === "result" || screen === "error")) {
        setUsername("");
        setStatistics(null);
        setError("");
        setScreen("search");
      }

      if (input === "m" && (screen === "result" || screen === "error")) {
        setScreen("menu");
      }
    },
    {
      isActive:
        screen === "menu" ||
        screen === "history" ||
        screen === "search" ||
        screen === "loading" ||
        screen === "result" ||
        screen === "error",
    },
  );

  const selectMainMenu = (action: MainMenuAction) => {
    if (action === "exit") {
      exit();
      return;
    }

    if (action === "search") {
      setUsername("");
      setScreen("search");
      return;
    }

    if (action === "history") {
      setScreen("history");
      return;
    }

    setScreen("token-settings");
  };

  const search = async (value: string) => {
    const normalizedUsername = value.trim();

    if (!normalizedUsername || searchingRef.current) {
      return;
    }

    searchingRef.current = true;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setUsername(normalizedUsername);
    setScreen("loading");

    try {
      const result = await fetchStatistics(
        normalizedUsername,
        activeToken,
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
      setScreen("result");

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
        setScreen("error");
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
      await search(action.username);
      return;
    }

    if (action.type === "back") {
      setScreen("menu");
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
    setActiveToken(token);
    setScreen("menu");
  };

  const tokenSetupProps = {
    environmentToken,
    tokenStore,
    validateToken,
    onComplete: completeTokenSetup,
    onTokenChange: setActiveToken,
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />
      {screen === "authentication" && <TokenSetup {...tokenSetupProps} />}
      {screen === "menu" && (
        <MainMenu
          authenticated={Boolean(activeToken)}
          historyCount={history.length}
          historyError={historyError}
          onSelect={selectMainMenu}
        />
      )}
      {screen === "token-settings" && (
        <TokenSetup {...tokenSetupProps} onCancel={() => setScreen("menu")} />
      )}
      {screen === "history" && (
        <HistoryMenu entries={history} error={historyError} onSelect={selectHistory} />
      )}
      {screen === "search" && (
        <SearchScreen
          username={username}
          authenticated={Boolean(activeToken)}
          onChange={setUsername}
          onSubmit={search}
        />
      )}
      {screen === "loading" && <LoadingScreen username={username} />}
      {screen === "result" && statistics && (
        <ProfileDashboard statistics={statistics} />
      )}
      {screen === "error" && <SearchErrorScreen message={error} />}
    </Box>
  );
}
