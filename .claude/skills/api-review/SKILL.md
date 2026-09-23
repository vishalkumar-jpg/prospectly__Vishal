---
name: api-review
description: Backend API design review. Validates REST conventions, auth guards, DTOs, error handling, pagination caps, and rate limiting.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Backend API Design Review

## Steps

1. Identify changed or target controller files from `$ARGUMENTS` or by running a recent git diff on `server/src/modules/`.

2. For each endpoint, check the following:

   - **Auth**: Is `@Public()` used intentionally? Should the endpoint be protected? Verify JWT guard coverage.
   - **DTOs**: Are request bodies validated with class-validator DTOs? Are query parameters validated?
   - **Pagination**: Is `limit` capped with `Math.min(requested, 100)` to prevent abuse?
   - **Response format**: Uses `responseUtils.success()` and `responseUtils.error()` from `server/src/utils/response.utils.ts`?
   - **Error handling**: Uses the logging format `this.logger.error('MODULE :: METHOD : ERROR : ${error}')`?
   - **Rate limiting**: Do sensitive endpoints (login, signup, password reset, email send) have `@Throttle()` decorators?
   - **CSRF**: Do webhook endpoints use `@SkipCSRF()`? Do mutation endpoints NOT skip CSRF?

3. Check that service methods use transactions for multi-step operations:
   - Wrapped in `db.transaction(async (tx) => { ... })`
   - Uses `tx` (not `db`) inside the transaction callback

4. Check that all queries filter `deletedAt IS NULL` for soft-deleted records.

5. Output findings in this format for each check:

   ```
   [PASS|WARN|FAIL] <check-name> — <description>
   File: <file-path>:<line-number>
   Details: <explanation and fix if needed>
   ```
