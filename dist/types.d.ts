/**
 * Type definitions for client-sqlite procedures
 */
/**
 * Default database path for CLI logs
 */
export declare const DEFAULT_DB_PATH: string;
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
export declare const LOG_LEVELS: readonly LogLevel[];
export interface DbQueryInput {
    /** SQL query to execute */
    sql: string;
    /** Query parameters */
    params?: unknown[];
    /** Database path (defaults to CLI log database) */
    dbPath?: string;
}
export interface DbQueryOutput<T = Record<string, unknown>> {
    /** Column names */
    columns: string[];
    /** Query results */
    rows: T[];
}
export interface DbExecuteInput {
    /** SQL statement to execute (INSERT, UPDATE, DELETE, etc.) */
    sql: string;
    /** Statement parameters */
    params?: unknown[];
    /** Database path (defaults to CLI log database) */
    dbPath?: string;
}
export interface DbExecuteOutput {
    /** Number of rows affected */
    changes: number;
}
export interface LogsStoreInput {
    /** Log level */
    level: LogLevel;
    /** Log message */
    message: string;
    /** Session ID for grouping logs */
    sessionId?: string;
    /** Command that generated this log */
    command?: string;
    /** Additional context (e.g., package name) */
    context?: string;
    /** Additional structured data */
    data?: Record<string, unknown>;
    /** Error stack trace if applicable */
    errorStack?: string;
    /** Database path (defaults to CLI log database) */
    dbPath?: string;
}
export interface LogsStoreOutput {
    /** ID of the inserted log row */
    id: number;
}
export interface LogsQueryInput {
    /** Filter by session ID */
    sessionId?: string;
    /** Filter by command */
    command?: string;
    /** Filter by log level(s) */
    level?: LogLevel | LogLevel[];
    /** Maximum number of logs to return */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
    /** Order by (default: timestamp DESC) */
    orderBy?: "asc" | "desc";
    /** Database path (defaults to CLI log database) */
    dbPath?: string;
}
export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
    data: Record<string, unknown> | null;
    sessionId: string | null;
    command: string | null;
    context: string | null;
    errorStack: string | null;
}
export interface LogsQueryOutput {
    /** Log entries matching the query */
    logs: LogEntry[];
    /** Total count (if limit was applied) */
    total?: number;
}
//# sourceMappingURL=types.d.ts.map