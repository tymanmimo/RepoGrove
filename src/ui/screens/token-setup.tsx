import * as React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";

import { formatError } from "../../github/errors.js";
import type { TokenStore } from "../../storage/token-store.js";

const { useEffect, useRef, useState } = React;
const operationTimeout = 15_000;

type TokenScreen = "loading" | "choice" | "input" | "validating" | "deleting";
type TokenChoice = "use" | "replace" | "delete" | "anonymous" | "back";

interface TokenSetupProps {
  environmentToken: string | null;
  tokenStore: TokenStore;
  validateToken: (token: string, signal?: AbortSignal) => Promise<void>;
  onComplete: (token: string | null) => void;
  onTokenChange?: (token: string | null) => void;
  onCancel?: () => void;
}

function BusyScreen({
  message,
  cancellable = true,
}: {
  message: string;
  cancellable?: boolean;
}) {
  return (
    <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
      <Text color="blueBright">
        <Spinner type="dots" /> {message}
      </Text>
      {cancellable && <Text dimColor>Esc cancel</Text>}
    </Box>
  );
}

export function TokenSetup({
  environmentToken,
  tokenStore,
  validateToken,
  onComplete,
  onTokenChange,
  onCancel,
}: TokenSetupProps) {
  const [screen, setScreen] = useState<TokenScreen>("loading");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [storageError, setStorageError] = useState("");
  const mountedRef = useRef(true);
  const operationIdRef = useRef(0);
  const operationControllerRef = useRef<AbortController | null>(null);
  const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();

      if (mountedRef.current) {
        setStorageError("Secure credential storage is unavailable.");
        setScreen("choice");
      }
    }, operationTimeout);
    operationControllerRef.current = controller;

    tokenStore
      .getToken(controller.signal)
      .then((token) => {
        if (mountedRef.current && !controller.signal.aborted) {
          setSavedToken(token?.trim() || null);
          setScreen("choice");
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setStorageError("Secure credential storage is unavailable.");
          setScreen("choice");
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;
      operationControllerRef.current?.abort();
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
      }
      clearTimeout(timeout);
    };
  }, [tokenStore]);

  useInput(
    (_input, key) => {
      if (screen === "input" && key.escape) {
        setTokenInput("");
        setTokenError("");
        setScreen("choice");
      }

      if (screen === "choice" && key.escape) {
        onCancel?.();
      }

      if ((screen === "validating" || screen === "deleting") && key.escape) {
        operationIdRef.current += 1;
        operationControllerRef.current?.abort();
        if (operationTimeoutRef.current) {
          clearTimeout(operationTimeoutRef.current);
          operationTimeoutRef.current = null;
        }
        busyRef.current = false;
        setTokenError("");
        setScreen("choice");
      }
    },
    {
      isActive:
        screen === "input" ||
        screen === "choice" ||
        screen === "validating" ||
        screen === "deleting",
    },
  );

  const normalizedSavedToken = savedToken?.trim() || null;
  const normalizedEnvironmentToken = environmentToken?.trim() || null;
  const availableToken = normalizedSavedToken ?? normalizedEnvironmentToken;
  const tokenSource = normalizedSavedToken
    ? "saved"
    : normalizedEnvironmentToken
      ? "environment"
      : null;
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

  const deleteToken = async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    const operationId = ++operationIdRef.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();

      if (mountedRef.current && operationId === operationIdRef.current) {
        operationIdRef.current += 1;
        busyRef.current = false;
        setStorageError("Token deletion timed out.");
        setScreen("choice");
      }
    }, operationTimeout);
    operationTimeoutRef.current = timeout;
    operationControllerRef.current = controller;
    setScreen("deleting");

    try {
      await tokenStore.deleteToken(controller.signal);

      if (
        mountedRef.current &&
        operationId === operationIdRef.current &&
        !controller.signal.aborted
      ) {
        setSavedToken(null);
        setStorageError("");
        onTokenChange?.(normalizedEnvironmentToken);
        setScreen("choice");
      }
    } catch {
      if (mountedRef.current && operationId === operationIdRef.current) {
        setStorageError("Could not delete the token from secure storage.");
        setScreen("choice");
      }
    } finally {
      clearTimeout(timeout);
      if (operationTimeoutRef.current === timeout) {
        operationTimeoutRef.current = null;
      }
      if (operationId === operationIdRef.current) {
        busyRef.current = false;
      }
    }
  };

  const selectMode = (choice: TokenChoice) => {
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

    void deleteToken();
  };

  const saveToken = async (value: string) => {
    const normalizedToken = value.trim();

    if (!normalizedToken || busyRef.current) {
      return;
    }

    busyRef.current = true;
    const operationId = ++operationIdRef.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();

      if (mountedRef.current && operationId === operationIdRef.current) {
        operationIdRef.current += 1;
        busyRef.current = false;
        setTokenError("Token operation timed out.");
        setScreen("input");
      }
    }, operationTimeout);
    operationTimeoutRef.current = timeout;
    operationControllerRef.current = controller;
    setTokenInput("");
    setTokenError("");
    setScreen("validating");

    try {
      await validateToken(normalizedToken, controller.signal);

      if (
        !mountedRef.current ||
        operationId !== operationIdRef.current ||
        controller.signal.aborted
      ) {
        return;
      }

      await tokenStore.saveToken(normalizedToken, controller.signal);

      if (
        mountedRef.current &&
        operationId === operationIdRef.current &&
        !controller.signal.aborted
      ) {
        setStorageError("");
        onTokenChange?.(normalizedToken);
        onComplete(normalizedToken);
      }
    } catch (operationError) {
      if (mountedRef.current && operationId === operationIdRef.current) {
        setTokenError(
          controller.signal.aborted
            ? "Token operation timed out."
            : formatError(operationError),
        );
        setScreen("input");
      }
    } finally {
      clearTimeout(timeout);
      if (operationTimeoutRef.current === timeout) {
        operationTimeoutRef.current = null;
      }
      if (operationId === operationIdRef.current) {
        busyRef.current = false;
      }
    }
  };

  if (screen === "loading") {
    return <BusyScreen message="Checking secure credentials" cancellable={false} />;
  }

  if (screen === "validating") {
    return <BusyScreen message="Validating and saving token" />;
  }

  if (screen === "deleting") {
    return <BusyScreen message="Deleting saved token" />;
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
