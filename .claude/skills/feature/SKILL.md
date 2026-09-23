---
name: feature
description: "Full feature lifecycle — requirements gathering, architecture, implementation, review, QA, documentation, and commit. Use this for any new feature or significant enhancement."
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Task
  - AskUserQuestion
  - EnterPlanMode
  - ExitPlanMode
  - TaskCreate
  - TaskUpdate
  - TaskList
  - WebSearch
---

# Feature Implementation Lifecycle

You are the MASTER orchestrator for implementing new features end-to-end in the Prospectly monorepo. Follow these gated phases strictly. Do NOT skip phases. Do NOT proceed to the next phase without completing the current one.

Use `$ARGUMENTS` as the feature name. If no arguments were provided, immediately ask the user what feature they want to implement before proceeding.

---

## Phase 1 — REQUIREMENTS

**Goal:** Lock down a clear, unambiguous specification before any code is written.

1. Read `.planning/features/` for any existing context on related features.
2. Ask the user clarifying questions about:
   - What problem does this feature solve?
   - Who is the target user?
   - What are the acceptance criteria?
   - Are there any edge cases or constraints?
   - What is the expected behavior on error?
3. **Refuse vague specs.** If the user's description is ambiguous, ask follow-up questions until the spec is concrete.
4. Summarize the locked scope back to the user and get explicit confirmation before proceeding.

**Gate:** User must confirm the scope summary before moving to Phase 2.

---

## Phase 2 — DISCOVERY

**Goal:** Understand the existing codebase landscape relevant to this feature.

1. Read relevant existing modules in `server/src/modules/` and `client/src/`.
2. Check `.planning/architecture/` for Architecture Decision Records (ADRs) that may affect this feature.
3. Check `.planning/knowledge-base/TECHNICAL.md` for stack decisions and technical constraints.
4. Check `.planning/knowledge-base/FUNCTIONAL.md` for existing business flows that intersect.
5. Identify reusable patterns, hooks, utilities, and components that already exist.
6. Identify any existing database tables, API endpoints, or UI components that will be affected.
7. Document findings: what exists, what can be reused, what needs to be created.

**Gate:** Discovery summary documented before moving to Phase 3.

---

## Phase 3 — ARCHITECTURE

**Goal:** Make and document architectural decisions for this feature.

1. Assess whether this feature needs a new ADR in `.planning/architecture/`. Create one if:
   - A new database table is introduced
   - A new integration or external service is added
   - A significant architectural pattern is being established
   - A tradeoff is being made that future developers should understand
2. Identify all artifacts that need to be created or modified:
   - **Database:** New tables, columns, indexes, migrations
   - **Server modules:** New or modified modules, controllers, services, DTOs
   - **API endpoints:** New routes, their HTTP methods, auth requirements, rate limits
   - **Client hooks:** New React Query hooks for data fetching
   - **Client components:** New UI components, pages, or modifications to existing ones
   - **Background jobs:** New BullMQ queues or processors
3. Document architectural decisions and the reasoning behind them.

**Gate:** Architecture decisions documented before moving to Phase 4.

---

## Phase 4 — PLANNING

**Goal:** Create a detailed, user-approved implementation plan.

1. Enter plan mode using `EnterPlanMode`.
2. Write a detailed implementation plan covering:
   - Files to create (with full paths)
   - Files to modify (with description of changes)
   - Order of implementation (dependencies between files)
   - Database schema changes (if any)
   - API contract (request/response shapes)
   - Component hierarchy (if UI work)
   - Migration strategy (if changing existing behavior)
3. Present the plan to the user for review.
4. Exit plan mode using `ExitPlanMode` only after user approval.

**Gate:** User must explicitly approve the implementation plan before moving to Phase 5.

---

## Phase 5 — IMPLEMENTATION

**Goal:** Write the code following all project conventions.

1. Create a TaskList to track implementation progress across all files and steps.
2. Follow **server patterns**:
   - Module pattern: `module.ts`, `controller.ts`, `service.ts`, `dto.ts`, `constants.ts`, `response.ts`
   - Use `responseUtils.success(res, { data })` and `responseUtils.error({ res, error })` for responses
   - Error logging: `this.logger.error(\`MODULE_CONTROLLER :: METHOD_NAME : ERROR : \${error}\`)`
   - Auth: Global `JwtAuthGuard` is default. Use `@Public()` for unauthenticated routes. Use `@SkipCSRF()` where appropriate.
   - Validation: class-validator DTOs for all request bodies
   - Database: Drizzle ORM, `@Inject(DRIZZLE_TOKEN)`, transactions with `tx`, `toUTC()` for timestamps
   - Soft deletes: always filter `deletedAt IS NULL`
3. Follow **client patterns**:
   - React Query (TanStack) for all server state
   - Custom hooks in `client/src/hooks/` wrapping React Query calls
   - API layer in `client/src/lib/api/`
   - Radix UI primitives + Tailwind CSS for UI
   - React Hook Form + Zod for form validation
   - DOMPurify for any user-generated HTML content (XSS protection)
   - `toUTC()` and `utcDayjs()` for all date/time handling
4. Follow **naming conventions**:
   - Directories: `kebab-case`
   - Files: `kebab-case` with type suffix
   - Classes: `PascalCase` with suffix
   - DB tables: `snake_case` in PostgreSQL, `camelCase` in TypeScript
   - Constants: `UPPER_SNAKE_CASE`
5. Update TaskList as each step completes.

**SCOPE GUARD:** If implementation reveals the need for work beyond the original locked scope, STOP immediately. Flag the scope expansion to the user. Ask for approval before continuing with expanded scope. Do NOT silently expand.

---

## Phase 6 — REVIEW

**Goal:** Verify code quality, security, and convention compliance.

### Code Review Checks
- [ ] Naming conventions followed (kebab-case files, PascalCase classes, etc.)
- [ ] File structure matches module pattern
- [ ] No dead code or unused imports
- [ ] ESLint compliance (no `console.log`, no explicit `any`, no unused imports)
- [ ] Type safety — no `as any` casts, proper generics
- [ ] Error handling in all service methods
- [ ] Proper use of `responseUtils` for all API responses

### Security Checks
- [ ] Auth guards on all new endpoints (unless intentionally `@Public()`)
- [ ] Input validation via DTOs on all request bodies
- [ ] XSS protection — DOMPurify on user-generated content displayed in UI
- [ ] CSRF — `@SkipCSRF()` only where explicitly justified
- [ ] SQL injection — parameterized queries via Drizzle (no raw SQL with string interpolation)
- [ ] Rate limiting — `@Throttle()` on sensitive endpoints
- [ ] Soft delete filters — all queries filter `deletedAt IS NULL`

Fix any issues found before proceeding.

**Gate:** All review checks pass before moving to Phase 7.

---

## Phase 7 — QA

**Goal:** Generate a comprehensive test plan.

1. Write a test plan covering:
   - **Happy path:** Standard usage scenarios with expected outcomes
   - **Edge cases:** Boundary conditions, empty states, max limits
   - **Error path:** Invalid input, unauthorized access, server errors, network failures
   - **Regression risks:** Existing features that might be affected by the new code
2. For each test case, specify:
   - Preconditions
   - Steps to reproduce
   - Expected result
3. Present the test plan to the user.

**Gate:** Test plan reviewed before moving to Phase 8.

---

## Phase 8 — DOCUMENTATION

**Goal:** Keep project knowledge base up to date.

1. Create or update `.planning/features/$ARGUMENTS.md` using the feature documentation template:
   - Feature name and description
   - User stories / acceptance criteria
   - Technical implementation details
   - API endpoints added/modified
   - Database changes
   - UI components added/modified
   - Known limitations
2. Update `.planning/knowledge-base/FUNCTIONAL.md` if business flows changed.
3. Update `.planning/knowledge-base/TECHNICAL.md` if technical decisions were made.
4. Update any ADRs in `.planning/architecture/` if architectural decisions evolved during implementation.

---

## Phase 9 — COMMIT

**Goal:** Create a clean, conventional commit.

1. Run `source ~/.nvm/nvm.sh && nvm use stable` before any git operations.
2. Follow the project's commit conventions:
   - Format: `type(scope): subject`
   - Type: `feat` for new features
   - Scope: the primary module affected (e.g., `auth`, `contacts`, `emails`, `credits`, `marketplace`, `ui`)
   - Subject: lowercase, imperative, no period, max 100 chars
3. Stage only the relevant files (not unrelated changes).
4. Create the commit.
5. Report the final commit hash to the user.

---

## Scope Creep Protocol

At ANY phase, if scope grows beyond the original ask:
1. **STOP** current work.
2. **FLAG** the scope expansion to the user with a clear explanation of what is expanding and why.
3. **ASK** the user whether to:
   - Expand scope and continue (update the locked spec)
   - Defer the expansion to a separate task
   - Reject the expansion and find an alternative approach
4. **DO NOT** silently expand scope under any circumstances.
