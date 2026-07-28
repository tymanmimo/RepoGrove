import * as React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

import { theme } from "../theme.js";

export function SearchPanel({
  username,
  authenticated,
  focused,
  busy,
  compact,
  onChange,
  onSubmit,
}: {
  username: string;
  authenticated: boolean;
  focused: boolean;
  busy: boolean;
  compact: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <Box
      borderStyle="round"
      borderColor={focused ? theme.accent : theme.borderMuted}
      flexDirection="column"
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={focused ? theme.bright : theme.primary}>
          Search Account
        </Text>
        {!compact && (
          <Text color={authenticated ? theme.accent : theme.warning}>
            {authenticated ? "Authenticated" : "Anonymous"}
          </Text>
        )}
      </Box>
      <Box>
        <Text color={theme.accent}>{">"} </Text>
        <TextInput
          value={username}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Enter a GitHub username"
          focus={focused && !busy}
        />
      </Box>
    </Box>
  );
}
