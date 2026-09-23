---
name: db-review
description: Database schema and query optimization review. Checks conventions, indexes, N+1 queries, migration safety, and transaction usage.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Database Schema & Query Optimization Review

## Steps

1. Read target schema files in `server/src/database/schema/` identified from `$ARGUMENTS` or recent changes.

2. For schema changes, check:
   - **Required columns**: Every table must include `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`.
   - **Timestamps**: Default values use `toUTC()`, never `new Date()`.
   - **Foreign keys**: Have proper references with appropriate `onDelete` behavior.
   - **Indexes**: Exist for frequently queried columns (foreign keys, status fields, date ranges, unique constraints).

3. For query changes, check:
   - **Soft delete filter**: All WHERE clauses include `deletedAt IS NULL`.
   - **N+1 patterns**: Are related entities loaded inside loops? Suggest joins or batch queries with `IN` clauses instead.
   - **Transactions**: Multi-step operations are wrapped in `db.transaction(async (tx) => { ... })`.
   - **Transaction usage**: `tx` is used inside the transaction callback, not `db`.

4. For migrations, check:
   - **Reversibility**: Is the migration reversible? Can it be rolled back safely?
   - **Table locking**: Does it lock tables for too long on large datasets? Prefer `ALTER TABLE ... ADD COLUMN` with defaults over backfills in the same migration.
   - **Data migrations**: Are there data migrations needed alongside schema changes? Should they be separate?

5. Output findings as a structured report with severity levels:

   ```
   [CRITICAL] <finding> — <description>
   File: <file-path>:<line-number>
   Remediation: <how to fix>

   [HIGH] <finding> — <description>
   File: <file-path>:<line-number>
   Remediation: <how to fix>

   [MEDIUM] <finding> — <description>
   File: <file-path>:<line-number>
   Remediation: <how to fix>

   [LOW] <finding> — <description>
   File: <file-path>:<line-number>
   Remediation: <how to fix>
   ```
