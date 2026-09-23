---
name: refactor
description: "Code refactoring lifecycle — pattern analysis, API contract verification, architecture review, planned implementation, regression verification, and commit."
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
---

# Refactor Lifecycle

You are the refactoring handler for the Prospectly monorepo. Refactoring means changing code structure without changing behavior. Follow these gated phases strictly.

Use `$ARGUMENTS` as the refactoring target or description. If no arguments were provided, immediately ask the user what code they want to refactor and why.

---

## Phase 1 — ANALYZE

**Goal:** Understand the current code and the motivation for refactoring.

1. Read the current code being targeted for refactoring.
2. Understand the existing patterns, data flow, and dependencies.
3. Answer these questions:
   - **What** is being refactored? (specific files, modules, patterns)
   - **Why** is this refactoring needed? (code smell, performance, maintainability, consistency)
   - **What patterns** does the current code follow or violate?
   - **Who calls this code?** (dependents, consumers, importers)
4. Document the current state and the desired end state.

**Gate:** Analysis complete and documented before moving to Phase 2.

---

## Phase 2 — CONTRACT CHECK

**Goal:** Determine if public API contracts are affected.

Check whether the refactoring changes any of these:
- **Server API endpoints:** URL paths, HTTP methods, request/response shapes, status codes
- **Hook return types:** Return value shapes of React Query hooks
- **Component props:** Prop interfaces of shared components
- **Database schema:** Table structure, column types, indexes
- **Module exports:** Public exports of shared utilities or services

**If contracts change:**
- This is NOT a pure refactoring — it includes a migration.
- Document exactly which contracts change and how.
- Plan a migration strategy (backward compatibility, versioning, or coordinated update).
- Flag this to the user and get approval to proceed with contract changes.

**If contracts are unchanged:**
- This is a pure internal refactoring. Proceed normally.

**Gate:** Contract impact assessed before moving to Phase 3.

---

## Phase 3 — ARCHITECTURE

**Goal:** Determine if architectural decisions need to be recorded.

1. Check `.planning/architecture/` for existing ADRs related to the code being refactored.
2. Assess whether this refactoring:
   - Establishes a new pattern that other code should follow
   - Deprecates an old pattern in favor of a new one
   - Changes how a significant subsystem is structured
3. If yes to any of the above, create or update an ADR in `.planning/architecture/`.
4. If this is a localized refactoring with no broader architectural implications, skip the ADR.

**Gate:** Architecture review complete before moving to Phase 4.

---

## Phase 4 — PLAN

**Goal:** Create a detailed, user-approved refactoring plan.

1. Enter plan mode using `EnterPlanMode`.
2. Write a refactoring plan covering:
   - Files to modify (with description of changes in each)
   - Files to create or delete (if restructuring)
   - Order of changes (to keep the codebase functional at each step)
   - What should NOT change (behavior, contracts, external interfaces)
3. **No scope creep.** Only refactor what was asked. If you discover other code that "should also be refactored," note it but do NOT include it in this plan. Recommend it as a follow-up task.
4. Present the plan to the user for review.
5. Exit plan mode using `ExitPlanMode` only after user approval.

**Gate:** User must explicitly approve the refactoring plan before moving to Phase 5.

---

## Phase 5 — IMPLEMENT

**Goal:** Execute the refactoring following project conventions.

1. Make changes following the approved plan.
2. Follow project conventions:
   - **Naming:** kebab-case files, PascalCase classes, UPPER_SNAKE_CASE constants
   - **Server patterns:** module pattern, responseUtils, error logging format, guards, DTOs
   - **Client patterns:** React Query hooks, Radix UI, Tailwind CSS, React Hook Form + Zod
   - **Database:** Drizzle ORM, toUTC(), soft deletes, transactions
3. Keep each change atomic — the codebase should be functional after each individual modification where possible.
4. Do NOT change behavior unless the user explicitly approved it in the plan.
5. Do NOT "fix" unrelated issues discovered during refactoring. Note them for follow-up.

**Scope guard:** If implementation reveals the need for changes beyond the approved plan, STOP. Inform the user. Get approval before expanding.

---

## Phase 6 — VERIFY

**Goal:** Confirm that behavior is unchanged (unless intentional).

1. Run linting to verify code quality:
   - Server: `cd server && bun run lint`
   - Client: `cd client && bun run lint:fix`
2. Verify no behavior has changed:
   - Check that all API endpoints return the same response shapes
   - Check that all hook return types are unchanged
   - Check that all component props are unchanged
   - Check that all database queries produce the same results
3. Search for any broken imports or references caused by file moves or renames.
4. Search for any hardcoded paths or strings that reference old file/module names.
5. Fix any issues found.

**Gate:** Verification passed before moving to Phase 7.

---

## Phase 7 — DOCUMENTATION

**Goal:** Update knowledge base if patterns changed.

1. If the refactoring establishes or changes patterns:
   - Update `.planning/knowledge-base/TECHNICAL.md` with the new patterns
   - Update any affected ADRs in `.planning/architecture/`
2. If the refactoring changes file structure or module organization:
   - Update `.planning/knowledge-base/TECHNICAL.md` with the new structure
3. If no patterns or structures changed (e.g., internal variable renaming, logic simplification):
   - No documentation update needed — skip this phase

---

## Phase 8 — COMMIT

**Goal:** Create a clean, conventional commit.

1. Run `source ~/.nvm/nvm.sh && nvm use stable` before any git operations.
2. Follow the project's commit conventions:
   - Format: `refactor(scope): description`
   - Type: always `refactor` for refactoring
   - Scope: the primary module affected (e.g., `auth`, `contacts`, `emails`, `credits`, `marketplace`, `ui`)
   - Subject: lowercase, imperative, no period, max 100 chars
3. Stage only the files changed by this refactoring (not unrelated changes).
4. Create the commit.
5. Report the final commit hash to the user.
