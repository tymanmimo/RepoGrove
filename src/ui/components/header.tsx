import * as React from "react";
import { Box, Text } from "ink";

import { theme } from "../theme.js";

const pixelLogo = [
  "       ██",
  "    ██ ██ ██",
  "  ████████████",
  "     ██████",
  "       ██",
];

export function Header({
  compact = false,
  showLogo = false,
}: {
  compact?: boolean;
  showLogo?: boolean;
}) {
  return (
    <Box flexDirection="column" marginBottom={compact ? 0 : 1}>
      {showLogo && !compact ? (
        <>
          {pixelLogo.map((line, index) => (
            <Text key={`${index}-${line}`} bold color={theme.accent}>
              {line}
            </Text>
          ))}
          <Text bold color={theme.bright}>
            {"    REPOGROVE"}
          </Text>
        </>
      ) : (
        <Text bold color={theme.bright}>
          REPOGROVE
        </Text>
      )}
      {!compact && (
        <Text color={theme.muted}>Explore public profiles without leaving your terminal.</Text>
      )}
    </Box>
  );
}
