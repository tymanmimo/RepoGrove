import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatHistoryDate } from "../../src/ui/workspace/history-sidebar.js";

describe("workspace", () => {
  it("formats history dates in English UTC", () => {
    assert.equal(
      formatHistoryDate("2026-07-28T12:34:00.000Z"),
      "Jul 28, 12:34 UTC",
    );
    assert.equal(formatHistoryDate("invalid"), "Unknown time");
  });
});
