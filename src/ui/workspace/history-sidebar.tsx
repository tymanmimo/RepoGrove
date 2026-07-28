import * as React from "react";
import { Box, Text } from "ink";
import SelectInput, {
  type IndicatorProps,
  type ItemProps,
} from "ink-select-input";

import type { SearchHistoryEntry } from "../../storage/history-store.js";
import { theme } from "../theme.js";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export type HistoryAction =
  | { type: "search"; username: string }
  | { type: "clear" };

export function formatHistoryDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${dateFormatter.format(date)} UTC`
    : "Unknown time";
}

function HistoryIndicator({ isSelected }: IndicatorProps) {
  return <Text color={theme.accent}>{isSelected ? ">" : " "} </Text>;
}

function HistoryItem({ isSelected, label }: ItemProps) {
  return (
    <Text color={isSelected ? theme.bright : theme.muted} wrap="truncate-end">
      {label}
    </Text>
  );
}

export function HistorySidebar({
  entries,
  error,
  focused,
  compact,
  limit,
  onSelect,
}: {
  entries: SearchHistoryEntry[];
  error: string;
  focused: boolean;
  compact: boolean;
  limit: number;
  onSelect: (action: HistoryAction) => void;
}) {
  const items: Array<{ key: string; label: string; value: HistoryAction }> = [
    ...entries.map((entry) => ({
      key: `profile:${entry.username.toLowerCase()}:${entry.searchedAt}`,
      label: `${entry.username}  ${formatHistoryDate(entry.searchedAt)}`,
      value: {
        type: "search" as const,
        username: entry.username,
      },
    })),
    ...(entries.length > 0
      ? [
          {
            key: "clear",
            label: "Clear history",
            value: { type: "clear" as const },
          },
        ]
      : []),
  ];

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? theme.accent : theme.borderMuted}
      flexDirection="column"
      paddingX={1}
      flexGrow={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={focused ? theme.bright : theme.primary}>
          Search History
        </Text>
        <Text color={theme.muted}>{entries.length}/10</Text>
      </Box>
      {error && <Text color={theme.warning}>{error}</Text>}
      {entries.length === 0 && !error && !compact && (
        <Text color={theme.muted}>No searches yet.</Text>
      )}
      {items.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <SelectInput
            items={items}
            isFocused={focused}
            limit={Math.max(1, limit)}
            indicatorComponent={HistoryIndicator}
            itemComponent={HistoryItem}
            onSelect={(item) => onSelect(item.value)}
          />
        </Box>
      )}
    </Box>
  );
}
