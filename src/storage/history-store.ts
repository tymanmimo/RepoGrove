import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const historyLimit = 10;

export class HistoryDataError extends Error {
  constructor() {
    super("Search history is corrupted.");
    this.name = "HistoryDataError";
  }
}

export interface SearchHistoryEntry {
  username: string;
  searchedAt: string;
}

export interface HistoryStore {
  load(): Promise<SearchHistoryEntry[]>;
  add(username: string): Promise<SearchHistoryEntry[]>;
  clear(): Promise<void>;
}

function getDataDirectory(): string {
  if (process.platform === "win32") {
    return join(
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
      "github-analyzer",
    );
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "github-analyzer");
  }

  return join(
    process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
    "github-analyzer",
  );
}

function parseHistory(value: unknown): SearchHistoryEntry[] {
  if (!Array.isArray(value)) {
    throw new HistoryDataError();
  }

  return value
    .filter(
      (entry): entry is SearchHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SearchHistoryEntry).username === "string" &&
        (entry as SearchHistoryEntry).username.trim().length > 0 &&
        typeof (entry as SearchHistoryEntry).searchedAt === "string" &&
        Number.isFinite(Date.parse((entry as SearchHistoryEntry).searchedAt)),
    )
    .map((entry) => ({
      username: entry.username.trim(),
      searchedAt: entry.searchedAt,
    }))
    .slice(0, historyLimit);
}

export function createHistoryStore(
  filePath = join(getDataDirectory(), "history.json"),
  now: () => Date = () => new Date(),
): HistoryStore {
  let mutationQueue: Promise<void> = Promise.resolve();

  const loadFile = async () => {
    try {
      const content = await readFile(filePath, "utf8");
      return parseHistory(JSON.parse(content));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }

      if (error instanceof SyntaxError) {
        throw new HistoryDataError();
      }

      throw error;
    }
  };

  const write = async (entries: SearchHistoryEntry[]) => {
    const directory = dirname(filePath);
    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await mkdir(directory, { recursive: true, mode: 0o700 });

    try {
      await writeFile(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }

    await rm(temporaryPath, { force: true }).catch(() => {});
  };

  const mutate = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationQueue.then(operation, operation);
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    async load() {
      await mutationQueue;
      return loadFile();
    },
    add(username) {
      return mutate(async () => {
        const normalizedUsername = username.trim();

        if (!normalizedUsername) {
          throw new HistoryDataError();
        }

        const entries = await loadFile();
        const updatedEntries = [
          {
            username: normalizedUsername,
            searchedAt: now().toISOString(),
          },
          ...entries.filter(
            (entry) =>
              entry.username.toLowerCase() !== normalizedUsername.toLowerCase(),
          ),
        ].slice(0, historyLimit);
        await write(updatedEntries);
        return updatedEntries;
      });
    },
    clear() {
      return mutate(async () => {
        await rm(filePath, { force: true });
      });
    },
  };
}

export const localHistoryStore = createHistoryStore();
