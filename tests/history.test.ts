import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { createHistoryStore } from "../src/history.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "github-analyzer-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe("history store", () => {
  it("returns an empty history when the file does not exist", async () => {
    const directory = await createTemporaryDirectory();
    const store = createHistoryStore(join(directory, "data", "history.json"));

    assert.deepEqual(await store.load(), []);
  });

  it("stores unique usernames with the newest search first", async () => {
    const directory = await createTemporaryDirectory();
    let day = 1;
    const store = createHistoryStore(
      join(directory, "history.json"),
      () => new Date(`2026-07-${String(day++).padStart(2, "0")}T12:00:00Z`),
    );

    await store.add("Octocat");
    await store.add("GitHub");
    const entries = await store.add("octocat");

    assert.deepEqual(
      entries.map((entry) => entry.username),
      ["octocat", "GitHub"],
    );
    assert.equal(entries[0]?.searchedAt, "2026-07-03T12:00:00.000Z");
  });

  it("limits history to ten entries", async () => {
    const directory = await createTemporaryDirectory();
    const store = createHistoryStore(join(directory, "history.json"));

    for (let index = 1; index <= 11; index += 1) {
      await store.add(`user-${index}`);
    }

    const entries = await store.load();
    assert.equal(entries.length, 10);
    assert.equal(entries[0]?.username, "user-11");
    assert.equal(entries[9]?.username, "user-2");
  });

  it("clears history and handles corrupted JSON", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "history.json");
    const store = createHistoryStore(filePath);
    await writeFile(filePath, "not-json", "utf8");

    assert.deepEqual(await store.load(), []);

    await store.add("octocat");
    assert.match(await readFile(filePath, "utf8"), /octocat/);

    await store.clear();
    assert.deepEqual(await store.load(), []);
  });
});
