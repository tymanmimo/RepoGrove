import * as React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

import type { ProfileStatistics } from "../../core/profile-analyzer.js";
import { theme } from "../theme.js";
import type { TerminalSize } from "../types.js";

export type ResultStatus = "idle" | "loading" | "result" | "error";

export function ResultsPanel({
  status,
  username,
  statistics,
  error,
  size,
}: {
  status: ResultStatus;
  username: string;
  statistics: ProfileStatistics | null;
  error: string;
  size: TerminalSize;
}) {
  if (status === "idle") {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.borderMuted}
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
      >
        <Text color={theme.muted}>Search for a GitHub account to begin.</Text>
      </Box>
    );
  }

  if (status === "loading") {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.border}
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <Text color={theme.accent}>
          <Spinner type="dots" /> Fetching @{username}
        </Text>
        <Text color={theme.muted}>Esc cancel</Text>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.error}
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <Text bold color={theme.error}>
          Search failed
        </Text>
        <Text>{error}</Text>
      </Box>
    );
  }

  if (!statistics) {
    return null;
  }

  if (size.rows < 16) {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        flexGrow={1}
      >
        <Text color={theme.bright} wrap="truncate-end">
          @{statistics.username}  {statistics.repositoryCount} repos  {statistics.starCount} stars
        </Text>
      </Box>
    );
  }

  const short = size.rows < 22;
  const medium = size.rows < 32;
  const languageLimit = short ? 2 : medium ? 4 : 8;
  const projectLimit = short ? 1 : medium ? 3 : 5;
  const visibleLanguages = statistics.languages.slice(0, languageLimit);
  const visibleProjects = statistics.activeProjects.slice(0, projectLimit);
  const hiddenLanguages = statistics.languages.length - visibleLanguages.length;
  const hiddenProjects = statistics.activeProjects.length - visibleProjects.length;
  const showUrls = size.rows >= 30 && size.columns >= 90;
  const splitDetails = size.columns >= 120 && size.rows >= 24;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text bold color={theme.bright} wrap="truncate-end">
          @{statistics.username}
        </Text>
        <Text color={theme.accent}>
          {statistics.repositoryCount} repositories  {statistics.starCount} stars
        </Text>
      </Box>

      <Box flexDirection={splitDetails ? "row" : "column"} flexGrow={1} gap={1}>
        <Box
          borderStyle="round"
          borderColor={theme.borderMuted}
          flexDirection="column"
          paddingX={1}
          flexGrow={1}
        >
          <Text bold color={theme.primary}>
            Languages
          </Text>
          {visibleLanguages.length === 0 ? (
            <Text color={theme.muted}>No language data available.</Text>
          ) : (
            visibleLanguages.map((language) => (
              <Box key={language.name} justifyContent="space-between">
                <Text wrap="truncate-end">{language.name}</Text>
                <Text color={theme.accent}>{language.percentage}%</Text>
              </Box>
            ))
          )}
          {hiddenLanguages > 0 && <Text color={theme.muted}>+{hiddenLanguages} more</Text>}
        </Box>

        <Box
          borderStyle="round"
          borderColor={theme.borderMuted}
          flexDirection="column"
          paddingX={1}
          flexGrow={2}
        >
          <Text bold color={theme.primary}>
            Active Projects
          </Text>
          {visibleProjects.length === 0 ? (
            <Text color={theme.muted}>No active projects available.</Text>
          ) : (
            visibleProjects.map((project) => (
              <Box key={project.name} flexDirection="column">
                <Box justifyContent="space-between">
                  <Text bold wrap="truncate-end">
                    {project.name}
                  </Text>
                  <Text color={theme.accent} wrap="truncate-end">
                    {project.language ?? "Unknown"}  {project.starCount} stars
                  </Text>
                </Box>
                {showUrls && (
                  <Text color={theme.muted} wrap="truncate-end">
                    {project.url}
                  </Text>
                )}
              </Box>
            ))
          )}
          {hiddenProjects > 0 && <Text color={theme.muted}>+{hiddenProjects} more</Text>}
        </Box>
      </Box>
    </Box>
  );
}
