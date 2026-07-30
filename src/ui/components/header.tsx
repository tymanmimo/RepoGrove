import * as React from "react";
import { Box, Text } from "ink";

import { theme } from "../theme.js";

const pixelLogo = [
  "       ░░░       ",
  "        ┃        ",
  "  ▒▒▒━━▒▒▒━━▒▒▒  ",
  "   ┃    ┃    ┃   ",
  "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "  ▒▒▒▒▒▒▒▒▒▒▒▒▒  ",
  "    ╵  ▓▓▓  ╵    ",
  "   ███━▓▓▓━███   ",
  "  █    ▓▓▓    █  ",
];

type HeaderProps = {
  compact?: boolean;
  showLogo?: boolean;
};

export function Header({
  compact = false,
  showLogo = false,
}: HeaderProps) {
  return (
    <Box
      width="100%"
      flexDirection="column"
      alignItems="center"
      marginBottom={compact ? 0 : 1}
    >
      {showLogo && !compact && (
        <>
          <Box flexDirection="column" alignItems="center">
            {pixelLogo.map((line, index) => (
              <Text key={index} bold color={theme.accent}>
                {line}
              </Text>
            ))}
          </Box>

          <Box marginTop={1} marginBottom={1}>
            <Text bold color={theme.bright}>
              REPOGROVE
            </Text>
          </Box>
        </>
      )}

      {(!showLogo || compact) && (
        <Text bold color={theme.bright}>
          REPOGROVE
        </Text>
      )}

      {!compact && (
        <Text color={theme.muted}>
          Explore public profiles without leaving your terminal.
        </Text>
      )}
    </Box>
  );
}