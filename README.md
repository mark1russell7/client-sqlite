# @mark1russell7/client-sqlite

SQLite database operations via client procedures. Execute queries and store logs via `client.call()`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application                                     │
│                                                                              │
│   await client.call(["db", "query"], { sql: "SELECT * FROM logs" })         │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           client-sqlite                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           Procedures                                    │ │
│  │                                                                         │ │
│  │   ┌───────────────────────────────────────────────────────────────┐   │ │
│  │   │                     Database (db.*)                            │   │ │
│  │   │                                                                │   │ │
│  │   │   db.query    - Execute SELECT queries, return rows           │   │ │
│  │   │   db.execute  - Execute INSERT/UPDATE/DELETE, return changes  │   │ │
│  │   └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  │   ┌───────────────────────────────────────────────────────────────┐   │ │
│  │   │                      Logs (logs.*)                             │   │ │
│  │   │                                                                │   │ │
│  │   │   logs.store  - Store a log entry with level, message, data   │   │ │
│  │   │   logs.query  - Query logs by session, level, time range      │   │ │
│  │   └───────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       docker-sqlite                                     │ │
│  │                    (Connection + Query Layer)                           │ │
│  │                                                                         │ │
│  │   withConnection()  - Managed connection lifecycle                     │ │
│  │   query()           - Execute SELECT                                   │ │
│  │   execute()         - Execute mutations                                │ │
│  │   runMigrations()   - Apply database migrations                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │      sql.js         │
                    │   (SQLite WASM)     │
                    └─────────────────────┘
```

## Installation

```bash
npm install github:mark1russell7/client-sqlite#main
```

## Quick Start

```typescript
import { Client } from "@mark1russell7/client";

const client = new Client({ /* transport */ });

// Execute a query
const { rows } = await client.call(["db", "query"], {
  sql: "SELECT * FROM logs WHERE level = ?",
  params: ["error"],
});

// Store a log entry
await client.call(["logs", "store"], {
  level: "info",
  message: "Task completed",
  sessionId: "20241215-143052-a7b3",
  command: "lib.refresh",
});

// Query logs
const { logs } = await client.call(["logs", "query"], {
  sessionId: "20241215-143052-a7b3",
  level: ["error", "warn"],
  limit: 100,
});
```

## Procedures

### Database Operations

| Path | Input | Output | Description |
|------|-------|--------|-------------|
| `db.query` | `DbQueryInput` | `DbQueryOutput` | Execute SELECT queries |
| `db.execute` | `DbExecuteInput` | `DbExecuteOutput` | Execute mutations |

```typescript
interface DbQueryInput {
  sql: string;
  params?: (string | number | null)[];
  dbPath?: string;  // Default: ~/.mark/mark.db
}

interface DbQueryOutput {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}
```

### Log Operations

| Path | Input | Output | Description |
|------|-------|--------|-------------|
| `logs.store` | `LogsStoreInput` | `LogsStoreOutput` | Store a log entry |
| `logs.query` | `LogsQueryInput` | `LogsQueryOutput` | Query log entries |

```typescript
interface LogsStoreInput {
  level: "trace" | "debug" | "info" | "warn" | "error";
  message: string;
  sessionId?: string;
  command?: string;
  data?: Record<string, unknown>;
}

interface LogsQueryInput {
  sessionId?: string;
  level?: LogLevel | LogLevel[];
  command?: string;
  from?: string;  // ISO timestamp
  to?: string;
  limit?: number;
  offset?: number;
}
```

## Direct Database Access

For lower-level access, use re-exported utilities from `docker-sqlite`:

```typescript
import {
  withConnection,
  query,
  execute,
  runMigrations,
} from "@mark1russell7/client-sqlite";

// Managed connection
await withConnection({ dbPath: "./data/app.db" }, (db) => {
  execute(db, "INSERT INTO users (name) VALUES (?)", ["Alice"]);
  const result = query(db, "SELECT * FROM users");
  console.log(result.rows);
});
```

## Migrations

```typescript
import { runMigrations, createMigration } from "@mark1russell7/client-sqlite";

const migrations = [
  createMigration({
    version: 1,
    description: "Create logs table",
    up: `
      CREATE TABLE logs (
        id INTEGER PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    down: "DROP TABLE logs",
  }),
];

await withConnection({ dbPath: "./data/app.db" }, (db) => {
  runMigrations(db, migrations);
});
```

## Package Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          @mark1russell7/client                               │
│                         (Core RPC framework)                                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        @mark1russell7/client-sqlite                          │
│                       (Procedure definitions)                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        @mark1russell7/docker-sqlite                          │
│                    (Connection + Query utilities)                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │       sql.js        │
                          │   (SQLite in WASM)  │
                          └─────────────────────┘
```

## License

MIT
