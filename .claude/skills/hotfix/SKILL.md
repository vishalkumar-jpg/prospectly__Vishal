---
name: hotfix
description: "Production bug fix lifecycle — root cause analysis, scoped fix, regression check, security verification, documentation update, and commit."
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
---

# Hotfix Lifecycle

You are the hotfix handler for production bug fixes in the Prospectly monorepo. This is a lightweight, focused lifecycle. The goal is a minimal, correct fix with no scope creep.

Use `$ARGUMENTS` as the bug description or error context. If no arguments were provided, immediately ask the user to describe the bug, including any error messages, stack traces, or reproduction steps.

---

## Phase 1 — ROOT CAUSE

**Goal:** Identify the exact source of the bug.

1. Read the error context from `$ARGUMENTS` — error messages, stack traces, user reports.
2. Trace the code path from the symptom to the root cause:
   - For server errors: trace from the controller through the service to the database query.
   - For client errors: trace from the component through the hook to the API call.
   - For background job errors: trace from the processor through the service layer.
3. Identify the **exact file(s) and line(s)** where the bug originates.
4. Understand **why** the bug occurs — is it a logic error, missing validation, race condition, incorrect assumption, or data issue?
5. Document the root cause clearly before proceeding.

**Gate:** Root cause identified and documented before moving to Phase 2.

---

## Phase 2 — SCOPE CHECK

**Goal:** Determine if this is a simple fix or a systemic issue.

Ask these questions:
- Is this a **1-file fix** (typo, missing null check, wrong condition)?
- Or is this a **systemic issue** (broken pattern used in multiple places, architectural flaw, data corruption)?

**If systemic:** STOP. Flag this to the user and recommend using `/feature` or `/refactor` instead. A hotfix is not the right tool for systemic problems — it will create technical debt.

**If scoped:** Proceed to Phase 3.

**Gate:** Confirmed as a scoped fix before proceeding.

---

## Phase 3 — FIX

**Goal:** Implement the minimal correct fix.

1. Fix only the identified root cause. Do NOT:
   - Refactor surrounding code
   - Add new features
   - "Clean up" unrelated issues
   - Change code style or formatting beyond the fix
2. Follow project conventions:
   - Server: `responseUtils`, error logging format, DTOs, guards
   - Client: React Query patterns, hook patterns, Radix UI
   - Database: `toUTC()` for timestamps, soft delete filters, transactions where needed
3. The fix should be as small as possible while being correct and complete.

---

## Phase 4 — REGRESSION

**Goal:** Ensure the fix does not break anything else.

1. Identify all callers and dependents of the changed code:
   - Search for imports of the modified file(s)
   - Search for usages of the modified function(s) or method(s)
   - Check if the modified code is used in background jobs, scheduled tasks, or webhooks
2. For each caller/dependent, verify:
   - The fix does not change the expected behavior for that caller
   - The fix does not change any return types or response shapes
   - The fix does not break any existing error handling
3. If any regression risk is found, document it and inform the user.

**Gate:** Regression analysis complete before moving to Phase 5.

---

## Phase 5 — SECURITY

**Goal:** Verify the fix does not introduce vulnerabilities.

Check the following for the changed code:
- [ ] Auth guards still properly applied (not accidentally removed or bypassed)
- [ ] Input validation still enforced (DTOs, Zod schemas)
- [ ] No new XSS vectors introduced (user content properly sanitized with DOMPurify)
- [ ] No SQL injection vectors (parameterized queries via Drizzle, no raw SQL with interpolation)
- [ ] CSRF protection not weakened
- [ ] Rate limiting not removed
- [ ] Soft delete filters not bypassed
- [ ] No sensitive data exposed in error messages or logs

If any security concern is found, fix it before proceeding.

**Gate:** Security verification passed before moving to Phase 6.

---

## Phase 6 — DOCUMENTATION

**Goal:** Update documentation if behavior changed.

1. If the fix changes observable behavior (API response shape, UI behavior, error messages):
   - Update `.planning/features/<affected-feature>.md` with the behavior change
   - Note the bug and its fix for future reference
2. If no observable behavior changed (internal logic fix, null check, etc.):
   - No documentation update needed — skip this phase

---

## Phase 7 — COMMIT

**Goal:** Create a clean, conventional commit.

1. Run `source ~/.nvm/nvm.sh && nvm use stable` before any git operations.
2. Follow the project's commit conventions:
   - Format: `fix(scope): description`
   - Type: always `fix` for hotfixes
   - Scope: the primary module affected (e.g., `auth`, `contacts`, `emails`, `credits`, `marketplace`, `ui`)
   - Subject: lowercase, imperative, no period, max 100 chars
3. Stage only the files changed by this fix (not unrelated changes).
4. Create the commit.
5. Report the final commit hash to the user.
