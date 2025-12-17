/**
 * client-sqlite
 *
 * SQLite database operations via client procedures.
 * Enables database queries and logging via client.call().
 *
 * @example
 * ```typescript
 * import { Client } from "client";
 *
 * const client = new Client(...);
 *
 * // Execute a query
 * const result = await client.call(["db", "query"], {
 *   sql: "SELECT * FROM logs WHERE level = ?",
 *   params: ["error"]
 * });
 * console.log(result.rows);
 *
 * // Store a log entry
 * await client.call(["logs", "store"], {
 *   level: "info",
 *   message: "Task completed",
 *   sessionId: "20241215-143052-a7b3",
 *   command: "lib.refresh"
 * });
 *
 * // Query logs
 * const { logs } = await client.call(["logs", "query"], {
 *   sessionId: "20241215-143052-a7b3",
 *   level: ["error", "warn"],
 *   limit: 100
 * });
 * ```
 */
export { DEFAULT_DB_PATH, LOG_LEVELS } from "./types.js";
// =============================================================================
// Registration
// =============================================================================
export { registerSqliteProcedures } from "./register.js";
// =============================================================================
// Re-export docker-sqlite utilities for direct use
// =============================================================================
export { withConnection, createConnection, query, execute, execMultiple, lastInsertRowId, tableExists, getMigrationStatus, runMigrations, rollbackMigration, createMigration, } from "@mark1russell7/docker-sqlite";
//# sourceMappingURL=index.js.map