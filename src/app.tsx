import * as React from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";

import { analyzeGitHubData, type ProfileStatistics } from "./analyzer.js";
import { formatError } from "./errors.js";
import { fetchGitHubData } from "./github.js";

const { useState } = React;

type Screen = "search" | "loading" | "result" | "error";

export interface AppProps {
  fetchStatistics?: (username: string) => Promise<ProfileStatistics>;
}

async function loadStatistics(username: string): Promise<ProfileStatistics> {
  const data = await fetchGitHubData(username);
  return analyzeGitHubData(data);
}

function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="blueBright">
        GITHUB ANALYZER
      </Text>
      <Text color="gray">Explore public profiles without leaving your terminal.</Text>
    </Box>
  );
}

function SearchScreen({
  username,
  onChange,
  onSubmit,
}: {
  username: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
      <Text bold color="magentaBright">
        Search GitHub profiles
      </Text>
      <Box marginTop={1}>
        <Text color="blueBright">{">"} </Text>
        <TextInput
          value={username}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Enter a username"
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Enter analyze  Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}

function LoadingScreen({ username }: { username: string }) {
  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text color="blueBright">
        <Spinner type="dots" /> Fetching @{username}
      </Text>
    </Box>
  );
}

function Dashboard({ statistics }: { statistics: ProfileStatistics }) {
  const visibleLanguages = statistics.languages.slice(0, 8);
  const hiddenLanguageCount = statistics.languages.length - visibleLanguages.length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="blueBright">
          @{statistics.username}
        </Text>
      </Box>

      <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
        <Box marginRight={4} flexDirection="column">
          <Text dimColor>PUBLIC REPOSITORIES</Text>
          <Text bold color="cyanBright">
            {statistics.repositoryCount}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>TOTAL STARS</Text>
          <Text bold color="yellowBright">
            {statistics.starCount}
          </Text>
        </Box>
      </Box>

      <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1} marginBottom={1}>
        <Text bold color="magentaBright">
          Languages
        </Text>
        {visibleLanguages.length === 0 ? (
          <Text dimColor>No language data available.</Text>
        ) : (
          visibleLanguages.map((language) => (
            <Box key={language.name} justifyContent="space-between">
              <Text>{language.name}</Text>
              <Text color="magentaBright">
                {language.repositoryCount} repos  {language.percentage}%
              </Text>
            </Box>
          ))
        )}
        {hiddenLanguageCount > 0 && <Text dimColor>+{hiddenLanguageCount} more</Text>}
      </Box>

      <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
        <Text bold color="blueBright">
          Active Projects
        </Text>
        {statistics.activeProjects.length === 0 ? (
          <Text dimColor>No active projects available.</Text>
        ) : (
          statistics.activeProjects.map((project) => (
            <Box key={project.name} flexDirection="column" marginTop={1}>
              <Box justifyContent="space-between">
                <Text bold>{project.name}</Text>
                <Text color="cyan">
                  {project.language ?? "Unknown"}  {project.starCount} stars  {project.updatedAt?.slice(0, 10) ?? "Unknown"}
                </Text>
              </Box>
              <Text dimColor wrap="truncate-end">
                {project.url}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>[r] New search  [q] Quit</Text>
      </Box>
    </Box>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="red" flexDirection="column" paddingX={1}>
        <Text bold color="redBright">
          Search failed
        </Text>
        <Text>{message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[r] Try again  [q] Quit</Text>
      </Box>
    </Box>
  );
}

export function App({ fetchStatistics = loadStatistics }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("search");
  const [username, setUsername] = useState("");
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [error, setError] = useState("");

  useInput((input) => {
    if (screen !== "result" && screen !== "error") {
      return;
    }

    if (input === "q") {
      exit();
    }

    if (input === "r") {
      setUsername("");
      setStatistics(null);
      setError("");
      setScreen("search");
    }
  });

  const search = async (value: string) => {
    const normalizedUsername = value.trim();

    if (!normalizedUsername) {
      return;
    }

    setUsername(normalizedUsername);
    setScreen("loading");

    try {
      const result = await fetchStatistics(normalizedUsername);
      setStatistics(result);
      setScreen("result");
    } catch (searchError) {
      setError(formatError(searchError));
      setScreen("error");
    }
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />
      {screen === "search" && (
        <SearchScreen username={username} onChange={setUsername} onSubmit={search} />
      )}
      {screen === "loading" && <LoadingScreen username={username} />}
      {screen === "result" && statistics && <Dashboard statistics={statistics} />}
      {screen === "error" && <ErrorScreen message={error} />}
    </Box>
  );
}
