import * as React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";

import type { TokenStore } from "./credentials.js";
import { formatError } from "./errors.js";

const { useEffect, useState } = React;

type TokenScreen = "loading" | "choice" | "input" | "validating";
type TokenChoice = "use" | "replace" | "delete" | "anonymous" | "back";

export interface TokenSetupProps {
  environmentToken: string | null;
  tokenStore: TokenStore;
  validateToken: (token: string) => Promise<string>;
  onComplete: (token: string | null) => void;
  onCancel?: () => void;
}

export function TokenSetup({
  environmentToken,
  tokenStore,
  validateToken,
  onComplete,
  onCancel,
}: TokenSetupProps) {
  const [screen, setScreen] = useState<TokenScreen>("loading");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let mounted = true;

    tokenStore
      .getToken()
      .then((token) => {
        if (mounted) {
          setSavedToken(token);
          setScreen("choice");
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError("Secure credential storage is unavailable.");
          setScreen("choice");
        }
      });

    return () => {
      mounted = false;
    };
  }, [tokenStore]);

  useInput((_input, key) => {
    if (screen === "input" && key.escape) {
      setTokenInput("");
      setTokenError("");
      setScreen("choice");
    }

    if (screen === "choice" && key.escape) {
      onCancel?.();
    }
  });

  const availableToken = savedToken ?? environmentToken;
  const tokenSource = savedToken ? "saved" : environmentToken ? "environment" : null;
  const tokenItems: Array<{ label: string; value: TokenChoice }> = tokenSource
    ? [
        {
          label: `Use ${tokenSource} token`,
          value: "use",
        },
        {
          label: tokenSource === "saved" ? "Replace saved token" : "Save a new token",
          value: "replace",
        },
        ...(tokenSource === "saved"
          ? [
              {
                label: "Delete saved token",
                value: "delete" as const,
              },
            ]
          : []),
        {
          label: "Continue without a token",
          value: "anonymous",
        },
      ]
    : [
        {
          label: "Add a GitHub token",
          value: "replace",
        },
        {
          label: "Continue without a token",
          value: "anonymous",
        },
      ];
  const items = [
    ...tokenItems,
    ...(onCancel
      ? [
          {
            label: "Back to main menu",
            value: "back" as const,
          },
        ]
      : []),
  ];

  const selectMode = async (choice: TokenChoice) => {
    if (choice === "back") {
      onCancel?.();
      return;
    }

    if (choice === "use") {
      onComplete(availableToken);
      return;
    }

    if (choice === "replace") {
      setTokenInput("");
      setTokenError("");
      setScreen("input");
      return;
    }

    if (choice === "anonymous") {
      onComplete(null);
      return;
    }

    try {
      await tokenStore.deleteToken();
      setSavedToken(null);
      setStorageError("");
    } catch {
      setStorageError("Could not delete the token from secure storage.");
    }

    setScreen("choice");
  };

  const saveToken = async (value: string) => {
    const normalizedToken = value.trim();

    if (!normalizedToken) {
      return;
    }

    setScreen("validating");
    setTokenError("");

    try {
      await validateToken(normalizedToken);
    } catch (validationError) {
      setTokenInput("");
      setTokenError(formatError(validationError));
      setScreen("input");
      return;
    }

    try {
      await tokenStore.saveToken(normalizedToken);
      setTokenInput("");
      setStorageError("");
      onComplete(normalizedToken);
    } catch {
      setTokenInput("");
      setTokenError("Could not save the token in secure credential storage.");
      setScreen("input");
    }
  };

  if (screen === "loading") {
    return (
      <Box borderStyle="round" borderColor="blue" paddingX={1}>
        <Text color="blueBright">
          <Spinner type="dots" /> Checking secure credentials
        </Text>
      </Box>
    );
  }

  if (screen === "validating") {
    return (
      <Box borderStyle="round" borderColor="blue" paddingX={1}>
        <Text color="blueBright">
          <Spinner type="dots" /> Validating and saving token
        </Text>
      </Box>
    );
  }

  if (screen === "input") {
    return (
      <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
        <Text bold color="magentaBright">
          Enter GitHub token
        </Text>
        <Text dimColor>The token is validated before it is saved.</Text>
        <Box marginTop={1}>
          <Text color="blueBright">{">"} </Text>
          <TextInput
            value={tokenInput}
            onChange={setTokenInput}
            onSubmit={saveToken}
            placeholder="github_pat_..."
            mask="*"
          />
        </Box>
        {tokenError && <Text color="redBright">{tokenError}</Text>}
        <Box marginTop={1}>
          <Text dimColor>Enter validate and save  Esc back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
      <Text bold color="magentaBright">
        GitHub authentication
      </Text>
      <Text dimColor>A token increases the API limit and is stored securely.</Text>
      {storageError && <Text color="yellow">{storageError}</Text>}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={(item) => selectMode(item.value)} />
      </Box>
    </Box>
  );
}
