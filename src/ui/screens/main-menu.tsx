import * as React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export type MainMenuAction = "search" | "history" | "token" | "exit";

export function MainMenu({
  authenticated,
  historyCount,
  historyError,
  onSelect,
}: {
  authenticated: boolean;
  historyCount: number;
  historyError: string;
  onSelect: (action: MainMenuAction) => void;
}) {
  const items = [
    { label: "Search account", value: "search" as const },
    {
      label: `Search history (${historyCount})`,
      value: "history" as const,
    },
    { label: "Token settings", value: "token" as const },
    { label: "Exit", value: "exit" as const },
  ];

  return (
    <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="magentaBright">
          Main menu
        </Text>
        <Text color={authenticated ? "green" : "yellow"}>
          {authenticated ? "Authenticated" : "Anonymous"}
        </Text>
      </Box>
      {historyError && <Text color="yellow">{historyError}</Text>}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
      </Box>
    </Box>
  );
}
