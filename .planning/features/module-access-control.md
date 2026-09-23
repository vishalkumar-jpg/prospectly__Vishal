# Feature: Organisation Module Access Control

**Version:** 1.2
**Status:** Active
**Last Updated:** 2026-06-11

## Overview
Restricts top-level application modules to organisations that have been granted
access. Prospecting is open to every authenticated user; Recruitment is gated —
only users with a verified membership in an organisation that holds the
`recruiting` grant may use it. Enforcement is applied at the API layer first
(authoritative) and mirrored in the UI (sidebar hidden, routes guarded, friendly
"access restricted" page). Access grants are managed on the admin side.

## Server Module
**Path:** `server/src/modules/module-access/`

### Key Services
- **ModuleAccessService** -- Single source of truth for module access.
  - `getAccessibleModules(userId)` -- distinct list of granted modules (used by `/auth/me`).
  - `hasModuleAccess(userId, module)` -- boolean check (used by the guard).
  - One JOIN query: `organisation_users` (verified, not deleted) → `organisation`
    (active, not deleted) → `organisation_module_access` (not deleted). A user
    qualifies through **any** of their qualifying memberships. No caching —
    revocation takes effect on the next request.

### Enforcement
- **`@RequireModule(module)`** decorator (`server/src/decorators/require-module.decorator.ts`)
  marks a controller/handler as requiring a module. Applied at class level to all
  authenticated recruitment controllers under `server/src/modules/recruitment/**`
  (employer and connector surfaces). The public job-share controller is
  intentionally not annotated.
  - **Carve-out — My Applications:** the `my-applications` controller
    (`GET /recruitment/my-applications`) is intentionally **not** annotated. It is
    the job-seeker's own view and must be available to any authenticated user, like
    Prospecting. `JwtAuthGuard` still enforces authentication, and the service
    filters results to the requesting user's own applications, so there is no data
    exposure.
  - **Carve-out — Candidate Bonus:** the `candidate-bonus` controller
    (`GET /recruitment/candidate-bonus` + `/:id`) is intentionally **not** annotated,
    so a candidate can see their own bonus from My Applications even without recruiting
    access. Every query is scoped to `recipient_id = the authenticated user` (+
    `payout_type = 'candidate'`), and detail returns 404 on a miss, so a candidate can
    only ever read their own bonus and ids cannot be enumerated. The candidate's bonus
    (id, amount, status) is also LEFT-JOINed into the `my-applications` response so each
    application card can show a "View Bonus" button.
  - **Carve-out — Candidate Apply:** the two candidate-facing apply controllers are
    **mixed** (they also host recruiter-only routes), so instead of dropping the class-level
    gate, `@RequireModule("recruiting")` is moved **down to the recruiter routes only**:
    - `consent` controller — `consentApply` (`POST /recruitment/consent/apply`) is open;
      the recruiter `sendConsent` (`PATCH /recruitment/consent/:id/send`) keeps the decorator.
      `verify`/`decline` remain `@Public()`.
    - `candidates` controller — `apply` (`POST /recruitment/candidates/apply`) and
      `checkApplication` (`GET /recruitment/candidates/check`) are open; the recruiter
      `getJobCandidates` (`GET /job/:jobId`) and `getCandidateDetail` (`GET /:candidateId`)
      keep the decorator.
    All open routes stay JWT-protected and self-scoped: `consentApply` is bound to the
    consent token's recipient email (mismatch → 403), and `candidates/apply` writes
    `candidateUserId/createdBy/updatedBy = the authenticated user` (DTO carries no user id).
    This lets a job-seeker without recruiting access actually apply (resume + LinkedIn) instead
    of hitting "no recruiting permission" on submit.
- **`ModuleAccessGuard`** (`server/src/guards/module-access.guard.ts`), registered
  globally as `APP_GUARD` after `JwtAuthGuard`. Skips `OPTIONS`, un-annotated
  routes, and `@Public()`/`@PublicIgnoreJwt()` routes (so token-based candidate
  links keep working). On denial it throws HTTP 403 with a machine-readable
  `code: "MODULE_ACCESS_DENIED"`.
- **AllExceptionsFilter** surfaces the `code` field in the JSON error body when an
  exception carries one.

### Database Tables
| Table | Purpose |
|-------|---------|
| organisation_module_access | Which modules each organisation has been granted (`module` enum, soft-deletable, unique per org+module) |
| organisation_users | Links users to organisations (membership, `is_verified`) — read to resolve a user's organisations |

## Client
### Pages
- **ModuleAccessDenied** -- `client/src/pages/ModuleAccessDenied.tsx` -- friendly
  "access restricted" screen with CTAs to Dashboard / Prospecting.

### Components / Routing
- **ModuleAccessRoute** -- `client/src/components/ModuleAccessRoute.tsx` -- wraps the
  `/recruiting/*` route group; renders the access-denied page when the module isn't
  in `accessibleModules`. Nested inside `ProtectedRoute` in `client/src/App.tsx`.
  `/recruiting/my-applications` is registered **outside** this group so it stays
  reachable for everyone.
- **AppSidebar** -- hides the Recruiting section unless `recruiting` is accessible.
  When recruiting is **not** accessible, "My Applications" is shown as a standalone
  item directly after the Prospecting section; when it **is** accessible, the item
  lives inside the Recruiting section ("For Job Seeker") and is not duplicated.
- **CandidateApplicationsPage** -- empty state is access-aware: a "Browse Jobs" CTA
  (to the gated marketplace) is shown only to users with recruiting access;
  everyone else sees a neutral "applications will appear here" message. Each
  application card with a bonus shows a "View Bonus · $amount" button that opens the
  reused `CandidateBonusModal` (`components/finance/recruitment/`), so candidates can
  see their payout without reaching the gated Transactions view.
- **FinancesNew** (`/transactions`) -- the recruitment section/tab is hidden and a
  forced `?section=recruitment` deep link falls back to prospecting.

### Shared Helper
- `client/src/lib/modules.ts` -- `APP_MODULES` map + `hasModuleAccess(...)`.
  Used by the sidebar, route guard, and transactions page (no magic strings).

### Auth
- `AuthContext` `User` now includes `accessibleModules?: string[]`, populated from
  `/auth/me`.

## Business Logic
- Prospecting is always available and is never represented in `accessibleModules`.
- **My Applications is always available** (like Prospecting), regardless of recruiting
  access — it is the job-seeker's own application tracker. Note: because applying is
  still gated, a user without recruiting access will only have applications here if
  they were granted access at the time they applied.
- A user is granted Recruitment access via a verified, non-deleted membership in an
  active organisation that holds a non-deleted `recruiting` grant.
- Server enforcement is authoritative; the UI is a convenience layer. A direct API
  hit by a non-authorised user returns 403 `MODULE_ACCESS_DENIED`.
- UI access state is read at session load from `/auth/me`; mid-session grant/revoke
  takes effect immediately at the API layer and in the UI on the next session/refresh.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-10 | Initial documentation — Recruitment module gating | jitendra_officebeacon |
| 1.3 | 2026-06-12 | Candidate Apply carve-out: ungate `consent/apply` + `candidates/apply` (+ `candidates/check`) by moving `@RequireModule` down to the recruiter routes on both mixed controllers | jitendra_officebeacon |
