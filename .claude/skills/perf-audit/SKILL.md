---
name: perf-audit
description: Performance analysis across client and server. Reviews bundle size, lazy loading, database queries, Redis caching, BullMQ queues, and API response patterns.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Performance Audit

Analyze performance across client and server layers, identifying bottlenecks and optimization opportunities.

## Steps

1. **Identify scope from $ARGUMENTS** (client, server, or both). If no argument is provided, audit both.

2. **Client performance:**
   - Check for large component bundles that should be lazy loaded (`React.lazy`). Scan `client/src/pages/` and `client/src/components/` for heavy components imported synchronously in route definitions.
   - Check React Query cache/stale time configuration in hooks under `client/src/hooks/`. Look for missing `staleTime`, `cacheTime`, or overly aggressive refetch settings (`refetchOnWindowFocus`, `refetchInterval`).
   - Check for unnecessary re-renders: missing dependency arrays in `useEffect`/`useMemo`/`useCallback`, inline object creation in JSX props, and components that should be memoized with `React.memo`.
   - Check image optimization: look for `<img>` tags missing `loading="lazy"`, images without explicit width/height, and large unoptimized assets in `client/public/`.
   - Review `client/vite.config.ts` for build optimization settings: code splitting, tree shaking, chunk size limits, and minification configuration.

3. **Server performance:**
   - Identify N+1 query patterns in service files under `server/src/modules/*/`. Look for database queries executed inside `for` loops, `.map()`, `.forEach()`, or `.reduce()` callbacks.
   - Check Redis caching usage in `server/src/config/redis-config.ts` and across services. Are frequently accessed data (user profiles, settings, feature flags) cached? Are cache TTLs reasonable?
   - Review BullMQ queue configurations in `server/src/worker/` for bottlenecks: concurrency settings, retry policies, job timeout values, and queue priorities.
   - Check pagination on all list endpoints: grep for `.findMany()`, `.select()` queries in services and verify they accept and enforce `limit`/`offset` parameters. Is the maximum limit capped to prevent abuse?
   - Check for missing database indexes on frequently queried columns. Read schema files in `server/src/database/schema/` and cross-reference with WHERE clauses in service queries.

4. **API performance:**
   - Are responses appropriately sized? Check for endpoints that return entire objects when only a subset of fields is needed (over-fetching).
   - Are all list endpoints paginated? Grep controllers for GET endpoints that return arrays.
   - Are expensive operations (email sending, PDF generation, data enrichment, bulk operations) offloaded to BullMQ queues rather than handled synchronously in request handlers?

5. **Output:** Generate a performance report formatted as a table with these columns:
   - **Severity**: Critical / High / Medium / Low
   - **Location**: File path and line number
   - **Finding**: Description of the performance issue
   - **Recommended Fix**: Specific actionable suggestion

   Sort findings by severity (Critical first). Summarize total counts per severity at the top of the report.
