import type { ReactNode } from "react";
import * as React from "react";
import { Box, Text } from "ink";
import { Header } from "../components/header.js";
import { theme } from "../theme.js";
import type { TerminalSize } from "../types.js";

type WelcomeScreenProps = {
  size: TerminalSize;
  children: ReactNode;
  showLogo?: boolean;
};

export function WelcomeScreen({
  size,
  children,
  showLogo = true,
}: WelcomeScreenProps) {
  const compact = size.columns < 50 || size.rows < 24;
  const panelWidth = Math.min(
    Math.max(size.columns - 4, 28),
    72,
  );

  return (
    <Box
      width={size.columns}
      height={size.rows}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        width={panelWidth}
        flexDirection="column"
        alignItems="center"
      >
        <Header compact={compact} showLogo={showLogo} />

        <Text color={theme.muted}>
          Connect securely or continue with public API access.
        </Text>

        <Box
          width="100%"
          flexDirection="column"
          alignItems="center"
          marginTop={compact ? 0 : 1}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}