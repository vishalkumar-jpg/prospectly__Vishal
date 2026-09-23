# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install all dependencies (both client and server)
bun run install:all

# Run everything (client + server + worker concurrently)
bun run dev

# Server only (port 5001, auto-reload)
cd server && bun run dev

# Client only (port 5000, proxies /api to server)
cd client && bun run dev

# Worker process (background jobs, port 5002)
cd server && bun run worker:dev

# Production build
bun run build                        # builds both client and server
cd server && bun run build:prod      # server only (includes tsc-alias)

# Lint & format
cd server && bun run lint            # ESLint check
cd server && bun run format          # Prettier format all
cd client && bun run lint:fix        # ESLint with auto-fix

# Database
cd server && bunx bunx drizzle-kit generate --name "created_xyz_table"   # generate migration from schema changes
cd server && bunx drizzle-kit migrate    # apply migrations
cd server && bun run seed                # seed database
```

## Commit Convention

Enforced via commitlint (conventional commits). Pre-commit hooks run `prettier --write` + `eslint --fix` on staged files automatically.

```
type(scope): subject
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`
- **scope** (optional): `auth`, `contacts`, `emails`, `credits`, `marketplace`, `ui`, etc.
- **subject**: lowercase, imperative, no period, max 100 chars

## Architecture

### Monorepo Layout

- **`server/`** — NestJS 11 backend (Express 5, TypeScript, port 5001 dev / 5000 prod)
- **`client/`** — React 18 frontend (Vite + SWC, Tailwind CSS, port 5000 dev)
- Runtime: **Bun** (use `bun` not `npm`). Node v22.16.0 (see `.nvmrc`).

### Server Architecture

**Module pattern** — all features live in `server/src/modules/<feature>/`. Each module is self-contained:
```
module-name.module.ts      # module definition (register in app.module.ts)
module-name.controller.ts  # routes only — no business logic
module-name.service.ts     # all business logic and DB queries
module-name.dto.ts         # class-validator DTOs for request validation
module-name.constants.ts   # module constants
module-name.response.ts    # response type definitions (optional)
```

**Database** — Drizzle ORM with PostgreSQL. Schema defined in `server/src/database/schema/`. Migrations output to `server/src/migrations/`. Inject database via `@Inject(DRIZZLE_TOKEN)`.

**Auth flow** — JWT in httpOnly cookies. Global `JwtAuthGuard` protects all routes by default. Use `@Public()` to make a route unauthenticated. CSRF guard validates `X-CSRF-Token` header (skips GET/OPTIONS/webhooks).

**Background jobs** — BullMQ queues with Redis. Processors registered in `server/src/worker/worker.module.ts`. Separate worker entry point: `server/src/worker.ts`.

**Key global guards** (registered in `app.module.ts`):
- `JwtAuthGuard` — JWT cookie auth, skip with `@Public()`
- `CsrfGuard` — CSRF double-submit, skip with `@SkipCSRF()`
- `ThrottlerGuard` — rate limiting, override with `@Throttle()`

**Path aliases** (tsconfig): `config/*`, `constants/*`, `database/*`, `decorators/*`, `guards/*`, `modules/*`, `services/*`, `shared/*`, `utils/*`, etc. all resolve from `server/src/`.

### Client Architecture

**State management** — TanStack React Query for server state. Context API for auth (`AuthContext`) and import progress. No Redux/Zustand.

**API layer** — Manual service modules in `client/src/lib/api/`. Core request handler in `core.ts` handles automatic token refresh on 401, CSRF injection, and error handling. Unified export via `api` object in `index.ts`.

**Custom hooks** — 50+ hooks in `client/src/hooks/` wrap React Query calls for data fetching (e.g., `useCurrentUser`, `useDashboardStats`, `useMarketplaceBrowse`).

**UI** — Radix UI primitives + Tailwind CSS. Shared components in `client/src/components/ui/`. Forms use React Hook Form + Zod validation.
**Coding Style:** [e.g., Use functional components, prefer Tailwind classes].

**Mobile** — Capacitor (iOS + Android), configured in `client/capacitor.config.ts`.

**Path aliases**: `@/*` → `src/*`, `@shared/*` → `../server/src/database/schema/*`

## Critical Conventions

### Date/Time Handling
**Always UTC.** Never use `new Date()` for storage or API payloads.

- **Server**: `import { toUTC, utcDayjs } from "utils/dayjs"`
  - `toUTC()` — returns UTC `Date` for database insert/update
  - `utcDayjs()` — returns dayjs object for calculations/formatting
- **Client**: `import { toUTC, utcDayjs } from "@/lib/dayjs"`
  - Same API — `toUTC()` for API payloads, `utcDayjs()` for display/calculations

### Server Response Format
Use `responseUtils.success(res, { data })` and `responseUtils.error({ res, error })` from `server/src/utils/response.utils.ts`.

### Error Logging Format
```typescript
this.logger.error(`MODULE_CONTROLLER :: METHOD_NAME : ERROR : ${error}`);
```

### Naming
- Directories: `kebab-case`
- Files: `kebab-case` with type suffix (`.controller.ts`, `.service.ts`, `.dto.ts`)
- Classes: `PascalCase` with suffix (`UserService`, `CreateUserDto`)
- DB tables: `snake_case` in PostgreSQL, `camelCase` in TypeScript
- Constants: `UPPER_SNAKE_CASE`

### Database Schema Rules
- All tables include: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`
- Soft deletes: filter `deletedAt IS NULL` in all queries
- Use `db.transaction(async (tx) => { ... })` for multi-step operations — use `tx` not `db` inside
- Timestamps: always use `toUTC()`, never `new Date()`

### ESLint Rules (server)
- `no-console`: error (use NestJS `Logger` instead)
- `no-explicit-any`: error in production, warn in dev
- `unused-imports/no-unused-imports`: error


**Orchestrators (end-to-end):**
- Plan Mode Default
  - Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
  - Use plan mode for verification steps, not just building.
  - Write detailed specs upfront to reduce ambiguity.

- Self-Improvement Loop
  - Write rules for yourself that prevent the same mistake.

- Verification Before Done
  - Never mark a task complete without proving it works.
  - Ask yourself: “Would a staff engineer approve this?”
  - Skip this for simple, obvious fixes — don’t over-engineer.
  - Challenge your own work before presenting it

- Core Principles
  - Make every change as simple as possible. Impact minimal code.
  - Find root causes. No temporary fixes. Senior developer standards.
  - Changes should only touch what’s necessary. Avoid introducing bugs.

## Development Principles

**Priority: Quality > Stability > Speed**

- Never assume or interpret vaguely — always ask clarifying questions before proceeding
- Do not guess requirements — if something is unclear, stop and ask
- Keep the knowledge base (`.planning/`) updated after every significant change
- Think smart — prefer elegant solutions over brute-force traditional approaches
- Cover the basics first, then innovate based on project scale
- Do not over-engineer — match complexity to actual requirements
- Every feature change must update its doc in `.planning/features/`
- Scope control: flag scope creep immediately, confirm before expanding beyond the original ask

## Available Skills (Slash Commands)

Run `/` in Claude Code to see all available commands. Key workflows:

**Orchestrators (end-to-end):**
- `/feature <name>` — full feature lifecycle: requirements → architecture → implement → review → QA → docs → commit
- `/hotfix <desc>` — production bug fix lifecycle: root cause → fix → regression check → commit
- `/refactor <scope>` — refactoring lifecycle: analyze → plan → implement → verify → commit

**Specialists (targeted use):**
- `/commit` — conventional commit with lint checks
- `/architect` — architecture review before major changes
- `/api-review` — backend API design review
- `/db-review` — database schema & query optimization review
- `/security-audit` — end-to-end security audit (uses Trail of Bits plugins)
- `/frontend-review` — React code quality & performance
- `/ux-review` — UI/UX patterns & accessibility
- `/perf-audit` — performance analysis
- `/qa` — QA test plan generation
- `/code-review` — coding standards enforcement
- `/pre-deploy` — production readiness checklist
- `/feature-doc` — create/update feature documentation
- `/change-request` — change request with scope control
