---
name: frontend-review
description: Frontend code quality and performance review. Checks React patterns, state management, component structure, bundle impact, and accessibility.
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Frontend Code Quality & Performance Review

## Steps

1. Identify target files from `$ARGUMENTS` or recent changes in `client/src/`.

2. Check React patterns:
   - **Server state**: Uses React Query (TanStack) for server state, not local `useState` for API data.
   - **API calls**: Go through `client/src/lib/api/` service modules, not direct `fetch` or `axios` calls.
   - **Custom hooks**: Hooks in `client/src/hooks/` follow the `use<Name>` naming convention and wrap React Query calls.
   - **Re-renders**: Proper dependency arrays in `useEffect`, `useMemo`, and `useCallback`. No missing or unnecessary dependencies.

3. Check component structure:
   - **UI primitives**: Uses components from `components/ui/` (Radix UI based), not raw HTML elements for interactive components.
   - **Forms**: Uses React Hook Form with Zod validation schemas, not uncontrolled forms or manual validation.
   - **Dates**: Uses `utcDayjs()` for display formatting and `toUTC()` for API payloads. Never uses raw `new Date()`.

4. Check security:
   - Any usage of `dangerouslySetInnerHTML` must wrap content in `DOMPurify.sanitize()`.
   - No sensitive data (tokens, keys, user PII) logged to the browser console.

5. Check performance:
   - Large page-level components should use `React.lazy()` with `Suspense` for code splitting.
   - React Query `staleTime` and `gcTime` (formerly `cacheTime`) are set to appropriate values (not defaulting to 0 for stable data).
   - No excessive API calls on mount (e.g., multiple `useQuery` calls that could be consolidated or batched).

6. Output findings per file in this format:

   ```
   ## <file-path>

   **Pattern Compliance**
   - [PASS|WARN|FAIL] <check> — <details>

   **Performance Notes**
   - [PASS|WARN|FAIL] <check> — <details>

   **Security Notes**
   - [PASS|WARN|FAIL] <check> — <details>
   ```
