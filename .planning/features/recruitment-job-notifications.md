# Feature: Recruitment Job-Post Notifications

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-05-14

## Overview
Lets a recruiter email every active member of selected organisations about a job
post — either at creation time (via a checkbox + organisation multi-select in the
Post-Job wizard) or later from the My Job Posts listing page. The bulk send runs
in the background (BullMQ + Redis) using the Resend Batch API, with paginated
recipient reads so 10k+ users never load into memory at once. A job can be
notified **exactly once**, enforced by a DB unique index.

## Server Module
**Path:** `server/src/modules/recruitment/notifications/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/organisations | Yes | Searchable, paginated list of active organisations with active-member counts |
| GET | /recruitment/jobs/:id/notify/preview | Yes | Distinct recipient count for the given `organisationIds` (owner-only) |
| POST | /recruitment/jobs/:id/notify | Yes | Manually dispatch the notification for a job (owner-only, active, not already notified) |

Job creation (`POST /recruitment/jobs`) is also extended with optional
`notifyUsers` / `organisationIds` fields on `CreateRecruitmentJobDto`.

### Key Services
- **RecruitmentNotificationsService** -- `getOrganisations`, `getRecipientCount`,
  `getNotifyPreview`, `sendJobNotification`, and the shared `dispatchNotification`
  (validates ownership/status, upserts settings, creates a tracked share row,
  inserts the pending notification row, enqueues the send).
- **RecruitmentNotificationQueueService** -- enqueues the BullMQ job with a
  deterministic `jobId` (`notify-<notificationId>`) for queue-level idempotency.
- **RecruitmentNotificationQueueProcessor** -- worker: paginates recipients
  (page size 1000), sends via `EmailsService.sendBatch()` in chunks of 100 with a
  delay between chunks, accumulates counts, sets the final status. Registered in
  `server/src/worker/worker.module.ts`.
- **EmailsService.sendBatch()** -- new method using the Resend Batch API.

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_job_settings | Generic 1:1-with-job settings. Holds `notifyOnCreate` (the wizard checkbox) and `organisationIds` (jsonb). Home for future per-job config. |
| recruitment_notifications | Generic per-job notification dispatch log: `type`, `status`, `totalRecipients`, `sentCount`, `failedCount`, `error`, `completedAt`. UNIQUE `(jobId, type)` is the hard double-send guard. |

## Client
### Pages
- **PostJobWizard** -- `client/src/pages/recruitment/PostJobWizard.tsx` -- gains a
  new "Notify" step (`post-job-wizard/NotifyStep.tsx`) before Confirm.
- **MyJobPostings** -- `client/src/pages/recruitment/MyJobPostings.tsx` -- 3-dot
  menu gains "Send Notification" (active + not-yet-notified jobs only); a
  `Notified · N sent` badge shows once dispatched.

### Components
- `client/src/pages/recruitment/components/OrgMultiSelect.tsx` -- searchable
  multi-select of organisations with member counts (server-side debounced search).
- `client/src/pages/recruitment/components/SendNotificationModal.tsx` -- listing
  trigger modal: pick orgs, see recipient-count preview, confirm.

### Hooks
- `useOrganisations(search)` -- organisation list for the selector.
- `useNotifyPreview(jobId, orgIds)` -- recipient-count preview.
- `useSendJobNotification()` -- mutation for the manual trigger.
- File: `client/src/hooks/useJobNotifications.ts`.

### API Module
- `client/src/lib/api/recruitment.ts` -- adds `getOrganisations`,
  `getNotifyPreview`, `sendJobNotification`; extends `CreateRecruitmentJobPayload`
  and `RecruitmentJobListItem` (`notification` field).

## External Integrations
- **Resend** -- bulk email delivery via the Batch API (`resend.batch.send`, 100/call).
- **Redis / BullMQ** -- `recruitment-notification` queue; reuses the existing
  shared connection and worker process. Gated by the `ENABLE_QUEUES` env flag.
- **Email template** -- `email_templates` row, slug `recruitment_new_job_post`
  (seeded in `email-templates.seeder.ts`).

## Business Logic
- A job can be notified **exactly once** — UNIQUE `(jobId, type)` index plus a
  status pre-check guard against double-sends (double-click, or checkbox + manual).
- Recipients = active, non-deleted members of the selected organisations,
  **excluding the job poster**; cross-org duplicates are collapsed (DISTINCT).
- The email links to the authenticated marketplace at
  `/recruiting/job-marketplace?job=:jobId&ref=:sharerCode` via a system-created
  `recruitment_job_shares` row (`platform = email_notification`). The
  marketplace page auto-opens the job-detail drawer, which calls
  `GET /recruitment/jobs/public/:jobId?ref=&includeClosed=true` so the server
  still stamps a `view` event in `recruitment_job_share_events` (same pipeline
  the public page uses). Non-logged-in recipients are bounced to
  `/signin?returnTo=...` by `ProtectedRoute`; the OAuth flow's existing
  returnTo round-trip lands them back on the marketplace with the params
  intact, and the drawer opens once they sign in. Closed/cancelled/filled
  roles still render in the drawer with an amber "This role is no longer
  accepting applications" banner; the Apply CTA is hidden for inactive jobs.
  Other share platforms (LinkedIn, Twitter, copy-link) continue to use the
  public `/jobs/:jobId?ref=:code` page — unchanged.
- Status lifecycle: `pending → sending → sent | partially_failed | failed`. The
  job is locked from `pending` onward; failed individual sends are retried inside
  `sendWithRetry` but the notification is never manually re-triggered.
- A notification failure during job creation does **not** fail the job creation.
- `recruitment_job_settings.notifyOnCreate` distinguishes creation-triggered
  (true) vs listing-triggered (false) — no separate column needed.

### Out of Scope (deferred)
- Per-recipient delivery tracking (aggregate counts only).
- Unsubscribe / opt-out filtering (no compliance handling this iteration).
- Restricting which organisations a recruiter may target (any active org allowed).
- Re-sending, notifying closed jobs, or notifying on job edit.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-14 | Initial documentation | jitendra_officeveacon |
| 1.1 | 2026-05-18 | Switched email CTA from public job page to authenticated marketplace deep link (`/recruiting/job-marketplace?job=&ref=`); `ProtectedRoute` now captures `returnTo` for the OAuth round-trip; drawer renders closed jobs with an inactive banner. | Pdalal |
