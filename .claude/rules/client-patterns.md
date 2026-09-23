---
paths:
  - "client/**"
---

# Client-Side Patterns (React)

## State Management

- **Server state**: TanStack React Query ONLY — no Redux, Zustand, or other state libraries
- **Auth state**: `AuthContext` via `useAuth()` hook
- **Import progress**: `ImportProgressContext`
- **Local UI state**: React `useState` / `useReducer`

## API Layer

- ALL API calls go through service modules in `client/src/lib/api/`
- Never use raw `fetch` or `axios` directly in components or hooks
- Core request handler in `core.ts` handles token refresh, CSRF, and error handling
- Unified export via `api` object in `index.ts`
- Example: `api.contacts.list(params)`, `api.auth.me()`

## Custom Hooks

- All data-fetching hooks live in `client/src/hooks/`
- Naming: `use` prefix (e.g., `useCurrentUser`, `useDashboardStats`)
- Hooks wrap React Query calls (`useQuery`, `useMutation`)
- Return structured data, not raw query results

## UI Components

- Radix UI primitives from `client/src/components/ui/`
- Tailwind CSS for styling — no CSS modules or styled-components
- Forms use React Hook Form + Zod validation schemas
- Schemas live in `client/src/schemas/`

## Date/Time

- Display: `utcDayjs()` from `@/lib/dayjs`
- API payloads: `toUTC()` from `@/lib/dayjs`
- Never use raw `new Date()` for display or API calls

## File Structure

- Pages in `client/src/pages/`
- Reusable components in `client/src/components/`
- Feature-specific components in `client/src/components/<feature>/`
- Hooks in `client/src/hooks/`
- API services in `client/src/lib/api/`
- Utilities in `client/src/utils/`
- Type definitions in `client/src/types/`

## Security

- Use `DOMPurify.sanitize()` before any `dangerouslySetInnerHTML`
- Never store tokens in localStorage — auth uses httpOnly cookies
- CSRF token is automatically injected by the API core layer

## Path Aliases

- `@/*` resolves to `src/*`
- `@shared/*` resolves to `../server/src/database/schema/*`
