# Connector Resume Upload

**Version:** 1.5
**Created:** 2026-04-11
**Last Updated:** 2026-09-03
**Status:** Implemented

## Overview

Allows connectors to upload candidate resumes directly from the Job Marketplace for specific jobs. This enables referrals for candidates who are not already in the connector's contact network. After AI processing (resume extraction + JD-vs-resume evaluation via Gemini), candidates appear in the connector's Inbox alongside network-matched candidates. The existing consent flow then applies identically.

## User Flow

1. Connector visits Job Marketplace (`/recruiting/job-marketplace`)
2. Clicks "Upload Resume" on a job card (or opens via `?job=jobId&action=upload` URL)
3. Single-step modal: selects one or more PDF resume files (drag-drop, max 10 files, max 10MB each); each file appears as a row with a mandatory candidate email input below the filename
4. Confirms PII consent checkbox and clicks Upload & Process
5. Files upload to S3; for each file the server creates a `media` row plus a `recruitment_upload_jobs` tracking row (`status='queued'`) inside a single transaction, then enqueues the BullMQ job
6. Modal closes and the client auto-navigates to `/recruiting/refer-candidates`
7. The inbox immediately renders placeholder "Uploaded" cards keyed by filename (queued → processing → completed/failed); the user manually refreshes via the existing refresh button to see transitions
8. BullMQ processor handles async per upload job: mark processing → download+validate PDF → AI extract → validate contact info → create/find contact → create pool match → evaluate against JD → update match with score → mark upload job completed with `poolMatchId` link
9. On failure, the upload job row is marked `failed` with a failure reason; the placeholder card shows the reason plus Retry (max 3) and Dismiss actions
10. Standard consent flow continues once the upload completes into a real pool match

## Key Decisions

- **No score threshold** — all uploaded candidates shown regardless of match score
- **Contact created immediately** — connector becomes the importer on upload
- **Name optional** — if AI can't extract name, uses anonymous label pattern
- **Connector email is canonical (v1.2)** — AI no longer extracts email from the resume; the connector-supplied email is the only source and is injected directly into contact creation. If the upload matches an existing contact, the existing contact's email is preserved.
- **Contact info required** — phone or linkedin may still be extracted from the resume for enrichment, but the connector email always backs the contact record
- **Same consent & claim rules** — upload never blocked, but consent sending follows existing cross-connector lock
- **Single BullMQ orchestrator job** per resume file

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/recruitment/connector-upload` | JWT | Upload resumes for processing. Returns `uploadCount` + `uploadJobIds` |
| POST | `/api/recruitment/connector-upload/replace-resume` | JWT | Replace an existing connector-uploaded resume on a pool match (or referred candidate) and re-run AI analysis |
| POST | `/api/recruitment/connector-upload/:uploadJobId/retry` | JWT | Re-enqueue a failed upload (max 3 retries per upload job) |
| DELETE | `/api/recruitment/connector-upload/:uploadJobId` | JWT | Soft-delete a failed or completed upload job row |

### Resume replace (`POST /replace-resume`)

**Actor:** the owning connector on the Refer Candidates job board.

**Body:** `matchId` *or* `candidateId`, S3 resume fields (same shape as apply), `piiConsent: true`.

**Allowed while:**
- Pool match is `pending` (Qualified / Not Qualified) or `consent_pending`
- Pool match is `consent_accepted` **and** the linked recruiter application is still `in_review`, `not_qualified`, or `processing`
- Referral has `source = connector_uploaded` (or an existing `resumeMediaId`)

**Blocked when:**
- Pool match is `consent_declined`, `consent_superseded`, `connector_declined`, or `failed`
- Another upload/replace job is already `queued` or `processing` for the match
- Recruiter stage is `shortlisted` or later (including interview / hired / rejected)
- Job is closed or caller is not the owning connector

**Post-analysis movement (same 50% threshold as initial upload):**

| State before replace | Score ≥ 50 | Score < 50 | Consent email |
|----------------------|------------|------------|---------------|
| Qualified / Not Qualified (`pending`) | Auto-send consent → Consent Pending | Stay Not Qualified | Yes (send) |
| Consent Pending | Stay Consent Pending | Drop to Not Qualified; invalidate `consentToken` | Yes (resend; old link dies) |
| Consent Accepted + app `in_review` / `not_qualified` | Move between `in_review` ↔ `not_qualified` on existing application | Same | **No** — candidate already accepted |

After consent accept, failed assessment answers still force `not_qualified` even when the new resume scores ≥ 50% (`determinePipelineStageKey`).

**Not supported:** marketplace batch re-upload for the same email (`ALREADY_REFERRED_BY_YOU` remains); replace is the only path for an existing referral.

**Queue job:** `replace-connector-resume` on `connector-resume-upload` (separate from `process-connector-resume`).

## Database Changes

- `recruitment_job_pool_matches.source` — `varchar(30)`, default `'ai_matched'`, values: `ai_matched`, `connector_uploaded`
- `recruitment_job_pool_matches.failure_reason` — `varchar(500)`, nullable
- `recruitment_job_pool_matches.resume_media_id` — `uuid`, FK to `media.id`, nullable
- New status values: `processing`, `failed`
- **New table `recruitment_upload_jobs`** (v1.1) — tracks in-flight and failed uploads as first-class entities so placeholder cards can render on the inbox before (or instead of) a pool match row:
  - `id` uuid PK
  - `job_id` uuid FK → `recruitment_jobs.id` ON DELETE CASCADE
  - `connector_user_id` uuid FK → `users.id` ON DELETE CASCADE
  - `resume_media_id` uuid FK → `media.id` NOT NULL
  - `file_name` varchar(255) NOT NULL
  - `status` varchar(30) NOT NULL default `'queued'` — one of `queued | processing | failed | completed`
  - `failure_reason` varchar(500) nullable — one of `no_contact_info | invalid_pdf | file_too_large | ai_extraction_failed | contact_creation_failed | evaluation_failed | unknown`
  - `retry_count` integer NOT NULL default 0 (max 3 via `MAX_UPLOAD_JOB_RETRIES`)
  - `pool_match_id` uuid FK → `recruitment_job_pool_matches.id` ON DELETE SET NULL (populated on success)
  - `created_at`, `updated_at`, `deleted_at` (soft delete)
  - Indexes: `(connector_user_id, status)`, `(job_id)`, unique `(job_id, resume_media_id)` to dedup re-uploads of the same media
  - **No migration file was generated in v1.1** — schema-only change; the DB will be synced through the project's normal schema-apply workflow
- **v1.2:** One new nullable column on `recruitment_upload_jobs`:
  - `candidate_email_hash` — `varchar(64)` — SHA-256 of the normalized candidate email (matches `contact_sensitive_data.normalizedEmailHash`) for audit and cross-referencing. Plaintext email is never persisted in this table.
  - Schema-only change; migration applied manually.
  - Retry flow no longer needs the email on the row: the BullMQ job is enqueued with `jobId = uploadJobId`, so the user-initiated retry endpoint calls `job.retry()` on the original failed job, replaying the same Redis-stored payload (including the connector-supplied email).

## Module Structure

```
server/src/modules/recruitment/connector-upload/
├── connector-upload.module.ts
├── connector-upload.controller.ts
├── connector-upload.dto.ts
├── connector-upload.constants.ts
├── connector-upload-queue.service.ts
├── connector-upload-queue.processor.ts
├── connector-upload-replace.dto.ts
├── connector-upload-replace.constants.ts
├── connector-upload-replace.types.ts
├── connector-upload-replace-queue.processor.ts
└── services/
    ├── connector-upload.service.ts
    ├── connector-upload-contact.service.ts
    ├── connector-upload-replace.service.ts
    ├── connector-upload-replace-target.service.ts
    ├── connector-upload-replace-eligibility.service.ts
    ├── connector-upload-replace-persist.service.ts
    ├── connector-upload-replace-movement.service.ts
    ├── connector-upload-replace-post-accept.service.ts
    ├── connector-upload-pdf.service.ts
    ├── connector-upload-evaluation.service.ts
    └── connector-upload-match-results.service.ts
```

## Client Components

- `ConnectorResumeUploadModal.tsx` — multi-file marketplace upload wizard
- `ConnectorReplaceResumeModal.tsx` — single-file replace on Refer Candidates board (`Update resume` on pool + referred cards)
- `useConnectorUpload.ts` — React Query mutation hook (invalidates job-pool-matches query on success)
- `useReplaceConnectorResume.ts` — mutation for `POST /replace-resume`; invalidates job board + connector pipeline queries
- `useRetryUploadJob.ts` — mutation hook that hits `POST /recruitment/connector-upload/:uploadJobId/retry`
- `useDismissUploadJob.ts` — mutation hook that hits `DELETE /recruitment/connector-upload/:uploadJobId`
- `InboxTab.tsx` — renders a `UploadJobCard` placeholder for items with `type='upload_job'` (filename title, queued/processing/failed badge, Retry/Dismiss actions for failures). Real candidates continue to render with the existing pool-match card.
- `ConnectorRecruitmentPipeline.tsx` — transformer now preserves the `type` discriminator when mapping API payload to `InboxItem` union
- `lib/api/recruitment.ts` — `connectorUpload` response typed with `uploadJobIds`, new `retryUploadJob` and `dismissUploadJob` methods, new `JobPoolUploadJobItem` type added to the candidates union
- Modified: `JobCard.tsx` (upload button), `JobMarketplace.tsx` (modal + URL params)

## Background Queue

- **Queue name:** `connector-resume-upload`
- **Job name:** `process-connector-resume`
- **Retry:** 3 attempts, exponential backoff (15s initial)

## Score Display

- Green badge: match >= 70%
- Amber badge: match 40-69%
- Red badge: match < 40%
- Sorted by score descending in Inbox

## Inbox Response Shape (v1.1)

The `GET /api/recruitment/job-pool-matches` response now returns a discriminated union inside each job's `candidates` array:

```ts
type InboxItem =
  | { type: "pool_match"; matchId: string; candidateName: string; matchScore: string; /* ... existing fields */ }
  | { type: "upload_job"; uploadJobId: string; fileName: string; status: "queued" | "processing" | "failed"; failureReason: string | null; retryCount: number; createdAt: string; updatedAt: string };
```

- The query service unions job ids from `recruitment_job_pool_matches` (existing inbox statuses) AND `recruitment_upload_jobs` (statuses `queued | processing | failed`), deduplicates, and orders by most recent activity.
- Jobs that only have upload jobs (no pool matches yet) still render, since job + pricing info is fetched independently for each paginated job id.
- Upload jobs are pinned above pool matches inside each job group.
- Completed upload jobs are filtered out of the inbox because the real pool match row renders in their place (they are retained in the DB for audit).

## Processor Lifecycle (v1.1)

`ConnectorUploadQueueProcessor` at `server/src/modules/recruitment/connector-upload/connector-upload-queue.processor.ts`:

1. Start: `setUploadJobStatus(uploadJobId, 'processing')`
2. `downloadAndValidate()` — throws `UnrecoverableError` on `FILE_TOO_LARGE` / `INVALID_PDF`; caught at the bottom which marks upload job failed with the matching reason
3. `resumeAi.extractFromResumeFileWithContactInfo()` — wrapped in try/catch that marks upload job failed with `ai_extraction_failed`
4. Contact info validation — marks upload job failed with `no_contact_info` and returns early
5. `contactService.createOrFindContact()` — wrapped; marks upload job failed with `contact_creation_failed`
6. `createProcessingMatch()` — inserts the pool match row with `status='processing'`
7. `runEvaluation()` — wrapped; marks upload job failed with `evaluation_failed`
8. `updateMatchWithResults()` — updates pool match to `pending` with final score
9. `resumeMutation.saveExtraction()` — persists extraction data
10. `markUploadJobCompleted(uploadJobId, matchId)` — sets `status='completed'` and stores `poolMatchId`

Retries: BullMQ's own retry (3 attempts, exponential backoff 15s) handles transient errors. The upload job is only marked `failed` on either (a) an `UnrecoverableError`, (b) a recognized failure category, or (c) the final BullMQ attempt. User-driven retries (via the retry endpoint) reset `status='queued'`, clear `failureReason`, increment `retryCount`, and re-enqueue the same job.

## Key UX Decisions (v1.1)

- **Auto-redirect on submit** — modal closes immediately after S3 + enqueue succeeds; user is navigated to `/recruiting/refer-candidates` so they land on the page that shows processing state.
- **No polling** — the inbox query does not refetch on an interval. Users click the existing refresh button to see status transitions. This avoids new realtime infra for a flow that takes 5–30s per resume.
- **Placeholder card title = filename** — until contact info is extracted, the card shows the uploaded PDF's filename instead of "Unknown candidate".
- **Failure visibility** — before v1.1, failures were only logged on the media row and invisible to the user. Now, every failure creates a visible, actionable card in the inbox with a humanized reason and Retry/Dismiss actions.
- **Retry cap = 3** — `MAX_UPLOAD_JOB_RETRIES` enforced both client-side (disabled button) and server-side (400 error). Applies to all failure categories, not just `no_contact_info`.
- **Dismiss is soft-delete** — dismissed upload jobs are hidden from inbox queries via `deletedAt IS NULL` but retained for audit.

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-11 | Initial implementation |
| 1.1 | 2026-04-14 | Add `recruitment_upload_jobs` tracking table; placeholder cards in inbox for queued/processing/failed uploads; retry (max 3) + dismiss endpoints; processor marks upload job state transitions at every lifecycle step; client auto-navigates to `refer-candidates` on submit |
| 1.3 | 2026-04-14 | Consent-apply reuses the connector-supplied resume, match score, matched/missing skills for `source='connector_uploaded'` pool matches: skips the resume upload UI, skips the `resume-extraction` and `candidate-evaluation` BullMQ queues, inherits the pool match's score/signals onto the candidate row, and lands the candidate directly in `in_review` (≥50%) or `jd_mismatched` (<50%). LinkedIn is only prompted if neither `user.linkedinUrl` nor `contacts.linkedin` is set; otherwise the consent modal auto-submits. `GET /consent/verify/:token` now returns `source` and `contactHasLinkedin` so the client can decide whether to render the modal or auto-apply. |
| 1.2 | 2026-04-14 | Collapse upload modal to a single step using React Hook Form + Zod; candidate email is now mandatory per resume and supplied by the connector (never extracted by AI); AI prompt updated to stop requesting email; `candidate_email_hash` column added to `recruitment_upload_jobs` (hashed only — plaintext email never persisted); BullMQ job id bound to uploadJobId so the retry endpoint replays the original Redis-stored payload via `job.retry()`; `no_contact_info` failure branch removed from the processor (existing contact matching by email/phone/linkedin still applies, but existing contact emails are never overwritten); disposable-domain block list + per-batch email dedup validation added on both client and server |
| 1.4 | 2026-05-07 | Consent-apply now backfills `contact_resumes.candidateId` inside its transaction for the `connector_uploaded` branch (matched by `mediaId`, gated on `candidateId IS NULL`). The upload processor saves the parsed resume before any candidate row exists, so the row was previously orphaned (`candidateId=null`); the recruiter's kanban card and candidate-detail modal both JOIN `contact_resumes` on `candidateId`, so without this link they rendered empty Job Title / Years of Experience / resume metadata. Fix-forward only — pre-existing orphaned rows are not retro-linked. |
| 1.5 | 2026-09-03 | Connector resume replace on Refer Candidates board: `POST /connector-upload/replace-resume` + `replace-connector-resume` BullMQ job. Connectors can swap a PDF while Qualified, Not Qualified, Consent Pending, or after accept (until recruiter shortlists). Re-runs extract + JD eval; resends consent when still pre-accept; post-accept only rescored the existing application (no second consent email). |
