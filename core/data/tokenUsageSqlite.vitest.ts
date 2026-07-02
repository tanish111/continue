import fs from "fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTokenUsageSqlitePath } from "../util/paths.js";

import { TokenUsageSqliteDb } from "./tokenUsageSqlite.js";

const TEST_MODEL = "test-model";
const TEST_PROVIDER = "test-provider";

describe("TokenUsageSqliteDb", () => {
  beforeAll(async () => {
    await TokenUsageSqliteDb.resetUsage(TEST_MODEL, TEST_PROVIDER);
  });

  afterAll(async () => {
    await TokenUsageSqliteDb.resetUsage(TEST_MODEL, TEST_PROVIDER);
  });

  it("creates the sqlite database file", async () => {
    await TokenUsageSqliteDb.get();
    expect(fs.existsSync(getTokenUsageSqlitePath())).toBe(true);
  });

  it("returns zero usage for an unknown (model, provider)", async () => {
    const usage = await TokenUsageSqliteDb.getUsage(
      "unknown-model",
      "unknown-provider",
    );
    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    });
  });

  it("accumulates usage across multiple addUsage calls", async () => {
    await TokenUsageSqliteDb.addUsage(TEST_MODEL, TEST_PROVIDER, 100, 50, 10);
    await TokenUsageSqliteDb.addUsage(TEST_MODEL, TEST_PROVIDER, 25, 5, 0);

    const usage = await TokenUsageSqliteDb.getUsage(TEST_MODEL, TEST_PROVIDER);
    expect(usage).toEqual({
      inputTokens: 125,
      outputTokens: 55,
      cachedTokens: 10,
    });
  });

  it("tracks usage separately per (model, provider)", async () => {
    await TokenUsageSqliteDb.addUsage(TEST_MODEL, "other-provider", 7, 8, 9);

    const other = await TokenUsageSqliteDb.getUsage(
      TEST_MODEL,
      "other-provider",
    );
    expect(other).toEqual({ inputTokens: 7, outputTokens: 8, cachedTokens: 9 });

    const original = await TokenUsageSqliteDb.getUsage(
      TEST_MODEL,
      TEST_PROVIDER,
    );
    expect(original).toEqual({
      inputTokens: 125,
      outputTokens: 55,
      cachedTokens: 10,
    });

    await TokenUsageSqliteDb.resetUsage(TEST_MODEL, "other-provider");
  });

  it("resets usage for a (model, provider)", async () => {
    await TokenUsageSqliteDb.resetUsage(TEST_MODEL, TEST_PROVIDER);

    const usage = await TokenUsageSqliteDb.getUsage(TEST_MODEL, TEST_PROVIDER);
    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    });
  });
});
