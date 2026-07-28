import type { ReactNode } from "react";
import * as React from "react";
import { Box, Text } from "ink";

import { Header } from "../components/header.js";
import { theme } from "../theme.js";
import type { TerminalSize } from "../types.js";

export function WelcomeScreen({
  size,
  children,
}: {
  size: TerminalSize;
  children: ReactNode;
}) {
  const compact = size.columns < 50 || size.rows < 24;
  const panelWidth = Math.min(Math.max(size.columns - 4, 28), 72);

  return (
    <Box
      width={size.columns}
      height={size.rows}
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box width={panelWidth} flexDirection="column">
        <Header compact={compact} showLogo />
        <Text color={theme.muted}>Connect securely or continue with public API access.</Text>
        <Box marginTop={compact ? 0 : 1}>{children}</Box>
      </Box>
    </Box>
  );
}
