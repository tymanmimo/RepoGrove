import * as React from "react";
import { Box, Text } from "ink";

import type { ProfileStatistics } from "../../core/profile-analyzer.js";
import type { SearchHistoryEntry } from "../../storage/history-store.js";
import { Header } from "../components/header.js";
import { theme } from "../theme.js";
import type { TerminalSize, WorkspaceFocus } from "../types.js";
import {
  HistorySidebar,
  type HistoryAction,
} from "./history-sidebar.js";
import { ResultsPanel, type ResultStatus } from "./results-panel.js";
import { SearchPanel } from "./search-panel.js";

export function Workspace({
  size,
  focus,
  history,
  historyError,
  username,
  authenticated,
  status,
  statistics,
  error,
  onHistorySelect,
  onUsernameChange,
  onSearch,
}: {
  size: TerminalSize;
  focus: WorkspaceFocus;
  history: SearchHistoryEntry[];
  historyError: string;
  username: string;
  authenticated: boolean;
  status: ResultStatus;
  statistics: ProfileStatistics | null;
  error: string;
  onHistorySelect: (action: HistoryAction) => void;
  onUsernameChange: (value: string) => void;
  onSearch: (value: string) => void;
}) {
  const stacked = size.columns < 70;
  const compact = size.rows < 20 || size.columns < 50;
  const veryShort = size.rows < 16;
  const sidebarWidth = Math.min(32, Math.max(24, Math.floor(size.columns * 0.28)));
  const historyLimit = stacked
    ? Math.max(1, Math.min(3, size.rows - 10))
    : Math.max(1, size.rows - 10);

  return (
    <Box
      width={size.columns}
      height={size.rows}
      flexDirection="column"
      paddingX={size.columns >= 50 ? 1 : 0}
    >
      <Header compact={compact} />
      <Box
        flexDirection={stacked ? "column" : "row"}
        flexGrow={1}
        gap={veryShort ? 0 : 1}
      >
        <Box
          width={stacked ? undefined : sidebarWidth}
          height={stacked ? (veryShort ? 3 : 6) : undefined}
        >
          <HistorySidebar
            entries={history}
            error={historyError}
            focused={focus === "history"}
            compact={veryShort}
            limit={historyLimit}
            onSelect={onHistorySelect}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} gap={veryShort ? 0 : 1}>
          <SearchPanel
            username={username}
            authenticated={authenticated}
            focused={focus === "search"}
            busy={status === "loading"}
            compact={compact}
            onChange={onUsernameChange}
            onSubmit={onSearch}
          />
          <ResultsPanel
            status={status}
            username={username}
            statistics={statistics}
            error={error}
            size={size}
          />
        </Box>
      </Box>
      {veryShort ? (
        <Text color={theme.muted}>Tab  Ctrl+T  Ctrl+C</Text>
      ) : (
        <Box justifyContent="space-between">
          <Text color={theme.muted}>Tab switch panel  Enter search</Text>
          <Text color={theme.muted}>Ctrl+T token  Ctrl+C exit</Text>
        </Box>
      )}
    </Box>
  );
}
