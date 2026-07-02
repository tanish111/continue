import fs from "fs";

import { open } from "sqlite";
import sqlite3 from "sqlite3";

import { DatabaseConnection } from "../indexing/refreshIndex.js";

import { getTokenUsageSqlitePath } from "../util/paths.js";

export interface TokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

/**
 * Persistent, cumulative token usage per (model, provider).
 * Used to enforce per-model token caps (maxInputTokens, maxOutputTokens,
 * maxCachedTokens) across restarts.
 */
export class TokenUsageSqliteDb {
  static db: DatabaseConnection | null = null;

  private static async createTables(db: DatabaseConnection) {
    await db.exec(
      `CREATE TABLE IF NOT EXISTS token_usage_totals (
            model TEXT NOT NULL,
            provider TEXT NOT NULL,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            cached_tokens INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (model, provider)
        )`,
    );
  }

  public static async addUsage(
    model: string,
    provider: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number,
  ): Promise<void> {
    const db = await TokenUsageSqliteDb.get();
    await db?.run(
      `INSERT INTO token_usage_totals (model, provider, input_tokens, output_tokens, cached_tokens)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(model, provider) DO UPDATE SET
          input_tokens = input_tokens + excluded.input_tokens,
          output_tokens = output_tokens + excluded.output_tokens,
          cached_tokens = cached_tokens + excluded.cached_tokens,
          updated_at = CURRENT_TIMESTAMP`,
      [model, provider, inputTokens, outputTokens, cachedTokens],
    );
  }

  public static async getUsage(
    model: string,
    provider: string,
  ): Promise<TokenUsageTotals> {
    const db = await TokenUsageSqliteDb.get();
    const row = await db?.get(
      `SELECT input_tokens as inputTokens, output_tokens as outputTokens, cached_tokens as cachedTokens
        FROM token_usage_totals
        WHERE model = ? AND provider = ?`,
      [model, provider],
    );
    return {
      inputTokens: row?.inputTokens ?? 0,
      outputTokens: row?.outputTokens ?? 0,
      cachedTokens: row?.cachedTokens ?? 0,
    };
  }

  public static async resetUsage(
    model: string,
    provider: string,
  ): Promise<void> {
    const db = await TokenUsageSqliteDb.get();
    await db?.run(
      "DELETE FROM token_usage_totals WHERE model = ? AND provider = ?",
      [model, provider],
    );
  }

  static async get() {
    const tokenUsageSqlitePath = getTokenUsageSqlitePath();
    if (TokenUsageSqliteDb.db && fs.existsSync(tokenUsageSqlitePath)) {
      return TokenUsageSqliteDb.db;
    }

    TokenUsageSqliteDb.db = await open({
      filename: tokenUsageSqlitePath,
      driver: sqlite3.Database,
    });

    await TokenUsageSqliteDb.db.exec("PRAGMA busy_timeout = 3000;");

    await TokenUsageSqliteDb.createTables(TokenUsageSqliteDb.db);

    return TokenUsageSqliteDb.db;
  }
}
