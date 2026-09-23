# Feature: Recruitment Collaboration (Co-workers on Job Posts)

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-06-24

## Overview
A job owner can add co-workers ("collaborators") from their own organisation to
help **manage candidates** on a specific job post. Collaborators see the shared
job in their "My Job Posts" list (badged **Collaborator**), can open its pipeline
and act on candidates per their assigned role, but **cannot edit job details or
manage collaborators**. The model is fully permission-driven and future-proof for
per-stage / per-action roles — roles + permissions are admin-managed master data,
so new capabilities need no code change.

## Authorization Model
Every job/candidate action is gated by a **permission string**, resolved per
request by a single `RecruitmentAccessService` (see
[ADR-004](../architecture/ADR-004-recruitment-access-resolver.md)):

- **Owner** (`recruitment_jobs.requesterId`) = implicit all-permissions.
- **Collaborator** = exactly the permissions on their admin-assigned role, and
  only while they remain a **verified member of an organisation shared with the
  owner** (re-checked every request, so org-exit or removal revokes instantly).

### v1 seeded role — `candidate_manager` (module `recruiting_collaboration`)
Permissions: `candidate.view`, `candidate.shortlist`, `candidate.reject`,
`candidate.interview_invite`, `candidate.mark_outcome`, `candidate.hire`,
`candidate.classify`, `payout.release`. **Excludes** `job.edit`, `job.close`,
`collaborator.manage` (owner-only). Seeded idempotently via `bun run seed`.

## Server Module
**Path:** `server/src/modules/recruitment/collaboration/`

### API Endpoints (owner-only — gated by `collaborator.manage`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /recruitment/jobs/:jobId/collaborators | Active collaborator roster |
| GET | /recruitment/jobs/:jobId/collaborators/eligible | Searchable org members eligible to add |
| POST | /recruitment/jobs/:jobId/collaborators | Add `{ userId, roleId?, notify }` (roleId defaults to candidate_manager) |
| DELETE | /recruitment/jobs/:jobId/collaborators/:collaboratorUserId | Soft-remove a collaborator |

### Key pieces
- `RecruitmentAccessService` — the resolver (`resolveJobAccess`, `assertPermission`,
  `assertCandidatePermission`, `usersShareVerifiedOrg`). Exported so candidates,
  candidate-workflow, payout, and jobs modules route every action through it.
- `CollaboratorAdd/Remove/List` services (one per action), notifier service for the
  opt-in email.
- Existing candidate/payout/job services now call `assertPermission(...)` instead of
  inline `requesterId` checks — behavior-preserving for owners.

## Data Model
`recruitment_job_collaborators` (insert-only + soft-delete, partial unique index on
`(job_id, collaborator_user_id) WHERE deleted_at IS NULL`): `jobId`,
`collaboratorUserId`, `roleId` → `roles`, `status` (active|removed), `invitedBy`,
`notifiedAt`, standard audit columns. Roles reuse the existing `roles` +
`role_permission` tables.

> **Migration:** the schema file is authored; the migration is generated/applied
> manually (`drizzle-kit generate` + `migrate`).

## Notifications
Opt-in only: when the owner ticks "Email the collaborator", an email
(`recruitment_collaborator_added` template, Resend) is sent on add and `notifiedAt`
is stamped. No in-app notification system.

## Client
- **My Job Posts** (`MyJobPostings.tsx`): `Collaborator` badge on shared cards;
  owner-only menu items (Edit / Manage Collaborators / Close) hidden for
  collaborators, who see only "View Candidates".
- **Manage Collaborators** (`ManageCollaboratorsModal.tsx`, owner-only): roster +
  org-member search/add with notify checkbox + `AlertDialog` remove confirmation.
- Job detail response carries `accessRole` + `permissions`; the edit wizard
  redirects collaborators (no `job.edit`) to the pipeline.
- Hooks: `useJobCollaborators` (list/eligible/add/remove); permission catalog
  mirror in `lib/recruitment-permissions.ts`.

## Interview Scheduling (calendar identity)
The interview is run by **whoever sent the invite** — collaborator or owner —
tracked on `recruitment_interview_meetings.recruiterId` (stamped at send; reassigned
on resend to the latest sender). The candidate booking flow keys all calendar
identity off this user, not the job owner:
- **Slots/availability** are generated from the sender's working hours + live busy
  times (`interview-booking-availability.service.ts`).
- **The booked event** is created on the sender's calendar, making them the
  **organizer** (`interview-booking-confirm.service.ts`).
- When a **collaborator** sent the invite, the **job owner is added as a required
  attendee** so the meeting also appears on the owner's calendar. When the owner
  sent it themselves, no duplicate attendee is added (they're already the organizer).

When the owner performs everything (no collaborator), `recruiterId` equals the
owner, so behavior is identical to before this change.

## Security
IDOR-safe (every endpoint resolves access server-side; UI hiding is not the
boundary), cross-org isolation enforced at add-time **and** per request, least
privilege by role, full audit via `createdBy`/`invitedBy`. See ADR-004.
