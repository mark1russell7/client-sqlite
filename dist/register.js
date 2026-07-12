/**
 * Procedure Registration for SQLite
 *
 * Registers database and logging procedures with the client system.
 * This file is referenced by package.json's client.procedures field.
 */
import { createProcedure, registerProcedures, outputSchema } from "@mark1russell7/client";
import { withConnection, query, execute, lastInsertRowId, runMigrations, } from "@mark1russell7/docker-sqlite";
import { DEFAULT_DB_PATH, LOG_LEVELS, } from "./types.js";
// =============================================================================
// Schemas
// =============================================================================
const dbQueryInputSchema = outputSchema();
const dbQueryOutputSchema = outputSchema();
const dbExecuteInputSchema = outputSchema();
const dbExecuteOutputSchema = outputSchema();
const logsStoreInputSchema = outputSchema();
const logsStoreOutputSchema = outputSchema();
const logsQueryInputSchema = outputSchema();
const logsQueryOutputSchema = outputSchema();
// =============================================================================
// Log Table Migrations
// =============================================================================
const LOG_MIGRATIONS = [
    {
        version: 1,
        description: "Create logs table",
        up: `
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        level TEXT NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error')),
        message TEXT NOT NULL,
        data TEXT,
        session_id TEXT,
        command TEXT,
        context TEXT,
        error_stack TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_logs_session ON logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_command ON logs(command);
    `,
        down: "DROP TABLE IF EXISTS logs;",
    },
];
/**
 * Ensure the logs table exists
 */
async function ensureLogsTable(dbPath) {
    await withConnection({ dbPath }, (db) => {
        runMigrations(db, LOG_MIGRATIONS);
    });
}
// =============================================================================
// db.query Procedure
// =============================================================================
const dbQueryProcedure = createProcedure()
    .path(["db", "query"])
    .input(dbQueryInputSchema)
    .output(dbQueryOutputSchema)
    .meta({ description: "Execute a SQL SELECT query" })
    .handler(async (input) => {
    const dbPath = input.dbPath ?? DEFAULT_DB_PATH;
    const params = input.params ?? [];
    return withConnection({ dbPath }, (db) => {
        const result = query(db, input.sql, params);
        return {
            columns: result.columns,
            rows: result.rows,
        };
    });
})
    .build();
// =============================================================================
// db.execute Procedure
// =============================================================================
const dbExecuteProcedure = createProcedure()
    .path(["db", "execute"])
    .input(dbExecuteInputSchema)
    .output(dbExecuteOutputSchema)
    .meta({ description: "Execute a SQL statement (INSERT, UPDATE, DELETE)" })
    .handler(async (input) => {
    const dbPath = input.dbPath ?? DEFAULT_DB_PATH;
    const params = input.params ?? [];
    return withConnection({ dbPath }, (db) => {
        const result = execute(db, input.sql, params);
        return { changes: result.changes };
    });
})
    .build();
// =============================================================================
// logs.store Procedure
// =============================================================================
const logsStoreProcedure = createProcedure()
    .path(["logs", "store"])
    .input(logsStoreInputSchema)
    .output(logsStoreOutputSchema)
    .meta({ description: "Store a log entry in the database" })
    .handler(async (input) => {
    const dbPath = input.dbPath ?? DEFAULT_DB_PATH;
    // Validate log level
    if (!LOG_LEVELS.includes(input.level)) {
        throw new Error(`Invalid log level: ${input.level}`);
    }
    // Ensure table exists
    await ensureLogsTable(dbPath);
    return withConnection({ dbPath }, (db) => {
        const dataJson = input.data ? JSON.stringify(input.data) : null;
        execute(db, `INSERT INTO logs (level, message, data, session_id, command, context, error_stack)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            input.level,
            input.message,
            dataJson,
            input.sessionId ?? null,
            input.command ?? null,
            input.context ?? null,
            input.errorStack ?? null,
        ]);
        const id = lastInsertRowId(db);
        return { id };
    });
})
    .build();
// =============================================================================
// logs.query Procedure
// =============================================================================
/**
 * Validate a value as a non-negative integer before it is interpolated into
 * SQL. The input schema is a pass-through, so `limit`/`offset` can arrive as
 * arbitrary values; interpolating them directly is a SQL injection / syntax
 * hazard. Throws on anything that is not a finite, non-negative integer.
 */
function toNonNegativeInt(value, field) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid ${field}: expected a non-negative integer, got ${JSON.stringify(value)}`);
    }
    return value;
}
const logsQueryProcedure = createProcedure()
    .path(["logs", "query"])
    .input(logsQueryInputSchema)
    .output(logsQueryOutputSchema)
    .meta({ description: "Query log entries from the database" })
    .handler(async (input) => {
    const dbPath = input.dbPath ?? DEFAULT_DB_PATH;
    // Ensure table exists
    await ensureLogsTable(dbPath);
    return withConnection({ dbPath }, (db) => {
        const conditions = [];
        const params = [];
        if (input.sessionId !== undefined) {
            conditions.push("session_id = ?");
            params.push(input.sessionId);
        }
        if (input.command !== undefined) {
            conditions.push("command = ?");
            params.push(input.command);
        }
        if (input.level !== undefined) {
            const levels = Array.isArray(input.level) ? input.level : [input.level];
            const placeholders = levels.map(() => "?").join(", ");
            conditions.push(`level IN (${placeholders})`);
            params.push(...levels);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const orderDir = input.orderBy === "asc" ? "ASC" : "DESC";
        let limitClause = input.limit !== undefined
            ? `LIMIT ${toNonNegativeInt(input.limit, "limit")}`
            : "";
        let offsetClause = "";
        if (input.offset !== undefined) {
            offsetClause = `OFFSET ${toNonNegativeInt(input.offset, "offset")}`;
            // SQLite's grammar only allows OFFSET as part of a LIMIT clause; an
            // OFFSET with no LIMIT is a syntax error. Use "LIMIT -1" (unbounded)
            // so an offset-only query remains valid.
            if (input.limit === undefined) {
                limitClause = "LIMIT -1";
            }
        }
        const sql = `
        SELECT id, timestamp, level, message, data, session_id, command, context, error_stack
        FROM logs
        ${whereClause}
        ORDER BY timestamp ${orderDir}
        ${limitClause}
        ${offsetClause}
      `;
        const result = query(db, sql, params);
        const logs = result.rows.map((row) => ({
            id: row.id,
            timestamp: row.timestamp,
            level: row.level,
            message: row.message,
            data: row.data ? JSON.parse(row.data) : null,
            sessionId: row.session_id,
            command: row.command,
            context: row.context,
            errorStack: row.error_stack,
        }));
        // Total number of rows matching the filters, ignoring LIMIT/OFFSET, so
        // callers can paginate. `params` holds only the WHERE-clause bindings.
        const countResult = query(db, `SELECT COUNT(*) AS total FROM logs ${whereClause}`, params);
        const total = countResult.rows[0]?.total ?? 0;
        return { logs, total };
    });
})
    .build();
// =============================================================================
// Registration
// =============================================================================
export function registerSqliteProcedures() {
    registerProcedures([
        dbQueryProcedure,
        dbExecuteProcedure,
        logsStoreProcedure,
        logsQueryProcedure,
    ]);
}
// Auto-register when this module is loaded
registerSqliteProcedures();
//# sourceMappingURL=register.js.map