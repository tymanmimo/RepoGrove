import * as React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";

import type { ProfileStatistics } from "../../core/profile-analyzer.js";

export function SearchScreen({
  username,
  authenticated,
  onChange,
  onSubmit,
}: {
  username: string;
  authenticated: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="magentaBright">
          Search GitHub profiles
        </Text>
        <Text color={authenticated ? "green" : "yellow"}>
          {authenticated ? "Authenticated" : "Anonymous"}
        </Text>
      </Box>
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
        <Text dimColor>Enter analyze  Esc menu  Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}

export function LoadingScreen({ username }: { username: string }) {
  return (
    <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
      <Text color="blueBright">
        <Spinner type="dots" /> Fetching @{username}
      </Text>
      <Text dimColor>Esc cancel</Text>
    </Box>
  );
}

export function ProfileDashboard({
  statistics,
}: {
  statistics: ProfileStatistics;
}) {
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
        <Text dimColor>[r] New search  [m] Main menu  [q] Quit</Text>
      </Box>
    </Box>
  );
}

export function SearchErrorScreen({ message }: { message: string }) {
  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="red" flexDirection="column" paddingX={1}>
        <Text bold color="redBright">
          Search failed
        </Text>
        <Text>{message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[r] Try again  [m] Main menu  [q] Quit</Text>
      </Box>
    </Box>
  );
}
