import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const historyLimit = 10;

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
    return [];
  }

  return value
    .filter(
      (entry): entry is SearchHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SearchHistoryEntry).username === "string" &&
        typeof (entry as SearchHistoryEntry).searchedAt === "string",
    )
    .slice(0, historyLimit);
}

export function createHistoryStore(
  filePath = join(getDataDirectory(), "history.json"),
  now: () => Date = () => new Date(),
): HistoryStore {
  const load = async () => {
    try {
      const content = await readFile(filePath, "utf8");
      return parseHistory(JSON.parse(content));
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        return [];
      }

      throw error;
    }
  };

  const write = async (entries: SearchHistoryEntry[]) => {
    const directory = dirname(filePath);
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await mkdir(directory, { recursive: true, mode: 0o700 });

    try {
      await writeFile(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryPath, filePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  };

  return {
    load,
    async add(username) {
      const normalizedUsername = username.trim();
      const entries = await load();
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
    },
    async clear() {
      await rm(filePath, { force: true });
    },
  };
}

export const localHistoryStore = createHistoryStore();
