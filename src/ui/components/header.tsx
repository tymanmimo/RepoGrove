import * as React from "react";
import { Box, Text } from "ink";

import { theme } from "../theme.js";

export function Header({ compact = false }: { compact?: boolean }) {
  return (
    <Box flexDirection="column" marginBottom={compact ? 0 : 1}>
      <Text bold color={theme.bright}>
        GITHUB ANALYZER
      </Text>
      {!compact && (
        <Text color={theme.muted}>Explore public profiles without leaving your terminal.</Text>
      )}
    </Box>
  );
}
