/**
 * Type definitions for client-sqlite procedures
 */
import { homedir } from "node:os";
import { join } from "node:path";
// =============================================================================
// Configuration
// =============================================================================
/**
 * Default database path for CLI logs
 */
export const DEFAULT_DB_PATH = join(homedir(), "logs", "cli", "cli.db");
export const LOG_LEVELS = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
];
//# sourceMappingURL=types.js.map