import * as React from "react";
import { Box, Text } from "ink";

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="blueBright">
        GITHUB ANALYZER
      </Text>
      <Text color="gray">Explore public profiles without leaving your terminal.</Text>
    </Box>
  );
}
