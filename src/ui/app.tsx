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

const { useEffect, useState } = React;

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
  validateToken?: (token: string) => Promise<void>;
  fetchStatistics?: (
    username: string,
    token: string | null,
  ) => Promise<ProfileStatistics>;
}

async function loadStatistics(
  username: string,
  token: string | null,
): Promise<ProfileStatistics> {
  const data = await fetchGitHubData(username, token);
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

  useEffect(() => {
    let mounted = true;

    historyStore
      .load()
      .then((entries) => {
        if (mounted) {
          setHistory((currentEntries) =>
            currentEntries.length === 0 ? entries : currentEntries,
          );
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

  useInput((input, key) => {
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

    if (input === "r" && (screen === "result" || screen === "error")) {
      setUsername("");
      setStatistics(null);
      setError("");
      setScreen("search");
    }

    if (input === "m" && (screen === "result" || screen === "error")) {
      setScreen("menu");
    }
  });

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

    if (!normalizedUsername) {
      return;
    }

    setUsername(normalizedUsername);
    setScreen("loading");

    try {
      const result = await fetchStatistics(normalizedUsername, activeToken);
      setStatistics(result);
      setScreen("result");

      try {
        const updatedHistory = await historyStore.add(result.username);
        setHistory(updatedHistory);
        setHistoryError("");
      } catch {
        setHistoryError("Could not save search history.");
      }
    } catch (searchError) {
      setError(formatError(searchError));
      setScreen("error");
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
