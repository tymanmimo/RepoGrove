import * as React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

import type { SearchHistoryEntry } from "../../storage/history-store.js";

export type HistoryAction =
  | { type: "search"; username: string }
  | { type: "clear" }
  | { type: "back" };

export function HistoryMenu({
  entries,
  error,
  onSelect,
}: {
  entries: SearchHistoryEntry[];
  error: string;
  onSelect: (action: HistoryAction) => void;
}) {
  const items: Array<{ key?: string; label: string; value: HistoryAction }> = [
    ...entries.map((entry) => ({
      key: `profile:${entry.username.toLowerCase()}`,
      label: `${entry.username}  ${new Date(entry.searchedAt).toLocaleString()}`,
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
    {
      key: "back",
      label: "Back to main menu",
      value: { type: "back" as const },
    },
  ];

  return (
    <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
      <Text bold color="blueBright">
        Search history
      </Text>
      {entries.length === 0 && !error && <Text dimColor>No searches yet.</Text>}
      {error && <Text color="yellow">{error}</Text>}
      <Box marginTop={1}>
        <SelectInput
          items={items}
          limit={12}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
      <Text dimColor>Esc back  q quit</Text>
    </Box>
  );
}
