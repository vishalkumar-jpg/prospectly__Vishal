# ADR-004: Recruitment Access Resolver (Permission-Driven Authorization)

**Status:** Accepted
**Date:** 2026-06-24
**Author:** Recruitment team

## Context
Recruitment authorization was enforced ad-hoc: every read/action re-checked
`job.requesterId === userId` inline inside ~10 services (candidates, candidate-
workflow, payout, jobs). Adding the Collaboration feature (co-workers who manage a
job's candidates, with a future need for per-stage / per-action roles) on top of
those scattered checks would have meant editing each call site and re-implementing
the same owner-OR-collaborator logic repeatedly — error-prone and a security risk.

We needed one place that answers "can user U perform action A on job J?", with the
owner as an implicit superuser and collaborators limited to admin-defined role
permissions, plus per-request revocation (removal or leaving the organisation).

## Decision
Introduce a single `RecruitmentAccessService` resolver that all recruitment
actions route through:

- `resolveJobAccess(userId, jobId)` → loads the job (404 if missing); owner
  (`requesterId`) gets **all permissions**; otherwise requires an active
  collaborator row **and** re-verifies shared verified-org membership, then loads
  the role's permissions from `role_permission` (module `recruiting_collaboration`).
- `assertPermission(userId, jobId, permission)` / `assertCandidatePermission(...)`
  throw `ForbiddenException` unless the resolved permission set contains the string.

Every action declares the permission it needs (`candidate.shortlist`,
`candidate.hire`, `payout.release`, `job.edit`, `collaborator.manage`, …). No
action is hardcoded "owner-only" — behavior is pure data: roles + permissions are
admin-managed master data. v1 seeds one `candidate_manager` role.

## Consequences

### Positive
- One audited security boundary; IDOR/cross-org/revocation enforced uniformly.
- Behavior-preserving for owners (they hold every permission).
- Future per-stage/per-action roles need **zero code change** — admin edits roles.
- Frontend gates generically off the `permissions` array returned per job.

### Negative
- A small extra job lookup per action (indexed PK; negligible).
- Permission strings must stay in sync between server constants and the client
  mirror (`lib/recruitment-permissions.ts`).

### Neutral
- Reuses the existing generic `roles` + `role_permission` tables rather than a
  bespoke RBAC system.

## Alternatives Considered

### Alternative 1: Per-service collaborator checks
- **Pros:** No new abstraction.
- **Cons:** Duplicated logic across ~10 services; easy to miss a call site; hard to
  evolve toward granular permissions.
- **Why rejected:** Security-critical logic must live in one place.

### Alternative 2: A NestJS guard on routes
- **Pros:** Declarative at the controller layer.
- **Cons:** Many actions are candidate-scoped (need a candidate→job lookup) and
  permission depends on the specific action; a guard would still defer to a
  service. Service-layer resolution keeps the job/candidate data fetch co-located.
- **Why rejected:** Service-layer resolver fits the existing pattern better.

## References
- Feature: [recruitment-collaboration.md](../features/recruitment-collaboration.md)
- `server/src/modules/recruitment/collaboration/services/recruitment-access.service.ts`
