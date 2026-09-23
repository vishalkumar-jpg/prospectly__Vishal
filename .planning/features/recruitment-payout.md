# Feature: Recruitment Connector Payout

**Version:** 1.2 (Phase 1)
**Status:** Superseded (connector flow)
**Last Updated:** 2026-06-03

> **⚠️ Superseded (2026-06-03, see [recruitment-success-fee-payout.md](./recruitment-success-fee-payout.md) Phase 3 / v1.6):** The 25-hour-after-interview-completed connector auto-pay described below has been **removed for all jobs**. Connector payout is now a single Hire-anchored, manually-released flow gated by the connector waiting period (`connector_payout_wait_days`), regardless of `hasSuccessFee`. The `RECRUITMENT_PAYOUT_DELAY_HOURS` constant and `queueDelayedPayout` no longer exist. Marking an interview **Completed** now only advances the stage; connectors are paid by moving the candidate to **Hired** and clicking **Release Payout**. The interview-outcome marking, payment capture, Stripe Connect transfer, credit, and onboarding-pending mechanics below remain accurate.

## Overview
When a recruitment job candidate progresses through the pipeline and their interview is marked as "completed" by the recruiter, the connector (referrer) who facilitated the hire receives a bounty payout via Stripe Connect. The platform retains a commission. Credits can offset the platform's commission.

### Payout Split
| Recipient | Percentage |
|-----------|-----------|
| Connector | 80% |
| Platform | 20% |

Commission percentages are owned by `RecruitmentFeeConfigService` in `server/src/modules/recruitment/fee-config/`. Every consumer (marketplace API, payout creation, payout-queue processor, public-job response) reads from the service so a single change propagates everywhere. The in-code defaults live in `recruitment-fee-config.constants.ts`; the service body will swap to a DB-backed admin config in a future phase without changing call sites.

## End-to-End Flow

```
1. Candidate books interview → payment captured → payout record created (status: pending)
2. After meetingDate passes → recruiter marks outcome via kanban "Mark Outcome" button
3. "Completed" → candidate moves to interview_completed stage
   → delayed BullMQ job queued (delay = meetingDate + 25h - now)
   "No-Show"/"Cancelled" → candidate moves to rejected stage, payout cancelled
4. After delay expires → processor picks up job
5. Processor: validates captured payment → checks Stripe account → calculates credits → Stripe transfer → DB update
6. If no Stripe account → onboarding_pending → processed when account.updated webhook fires
```

### 25-Hour Dispute Window
- Payout processes 25 hours after the **actual interview date** (meetingDate), not when the interview was booked
- Delay is calculated as `MAX(0, meetingDate + 25h - now)` when recruiter marks "completed"
- This window exists to allow future dispute functionality (Phase 2+)

### How the Connector is Identified
- **Direct apply via shared link:** `recruitment_job_candidates.connector_user_id` set from `recruitment_job_shares.sharer_id` (see `candidates-mutation.service.ts` ~line 165)
- **Consent flow:** `recruitment_job_candidates.connector_user_id` set from `recruitment_job_pool_matches.connector_user_id` (see `consent-mutation.service.ts` ~line 384)
- Phase 1: Always one connector per candidate (unique constraint on `candidateId + jobId + connectorUserId`)

## Server Module
**Path:** `server/src/modules/recruitment/payout/` and `server/src/modules/recruitment/payout-queue/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/recruitment/payout/:candidateId/interview-outcome` | Yes (recruiter) | Mark interview outcome (completed/no_show/cancelled) |

### Key Services

#### Payout Module (`server/src/modules/recruitment/payout/`)
- **RecruitmentPayoutCreateService** (`services/recruitment-payout-create.service.ts`) -- Creates pending payout record inside the interview booking confirm transaction. Snapshots bounty amount, calculates 80/20 split.
- **RecruitmentPayoutOutcomeService** (`services/recruitment-payout-outcome.service.ts`) -- Handles marking interview outcome. For "completed": transitions candidate to interview_completed stage, queues delayed payout job. For "no_show"/"cancelled": cancels payout, moves candidate to rejected.
- **RecruitmentPayoutController** (`recruitment-payout.controller.ts`) -- PATCH endpoint for marking outcomes.

#### Payout Queue Module (`server/src/modules/recruitment/payout-queue/`)
- **RecruitmentPayoutQueueService** (`recruitment-payout-queue.service.ts`) -- Manages BullMQ queue: `queuePayoutJob(data, delayMs?)`, `processDeferredPayoutsForConnector(connectorId)`.
- **RecruitmentPayoutQueueProcessor** (`services/recruitment-payout-queue.processor.ts`) -- Thin orchestrator: idempotency check with row lock, re-verifies captured payment, checks Stripe Connect account, delegates to calculator and stripe handler, updates DB atomically.
- **RecruitmentPayoutCalculatorService** (`services/recruitment-payout-calculator.service.ts`) -- Commission/credit calculation: computes 80/20 split, applies credit offsets via `CreditUsageHelper`.
- **RecruitmentPayoutStripeHandlerService** (`services/recruitment-payout-stripe-handler.service.ts`) -- Stripe operations: executes transfer to connected account, attempts best-effort payout to bank.

### Database Tables

| Table | Purpose |
|-------|---------|
| `recruitment_payout_history` | Main payout tracking table with snapshot amounts, Stripe IDs, processing status, credit fields. `connector_user_id` is non-nullable. Has unique index on (candidateId, jobId, connectorUserId). |
| `recruitment_interview_meetings` (modified) | Added columns: `interview_outcome`, `interview_outcome_comment`, `interview_outcome_marked_at`, `interview_outcome_marked_by` |

#### `recruitment_payout_history` Key Columns
- `candidate_id`, `job_id`, `connector_user_id`, `recruiter_id` -- relationships
- `interview_transaction_id`, `interview_meeting_id` -- references to payment & meeting
- `gross_amount`, `connector_amount`, `platform_amount` -- snapshot at creation
- `status` -- `pending` | `completed` | `cancelled` | `failed`
- `processing_status` -- `pending` | `queued` | `processing` | `completed` | `failed` | `onboarding_pending`
- `stripe_transfer_id`, `stripe_payout_id` -- Stripe references
- `credits_applied`, `credits_remaining_after`, `commission_after_credits` -- credit tracking
- `queue_job_id` -- BullMQ job reference

#### Schema file
`server/src/database/schema/recruitment-payout-history.ts`

### Constants
`server/src/modules/recruitment/payout/recruitment-payout.constants.ts`:
- `RECRUITMENT_PAYOUT_QUEUE_NAME` = `"recruitment-payout-queue"`
- `RECRUITMENT_PAYOUT_DELAY_HOURS` = `25`
- `INTERVIEW_OUTCOMES` = `{ COMPLETED, NO_SHOW, CANCELLED }`
- `RECRUITMENT_PAYOUT_STATUS` = `{ PENDING, COMPLETED, CANCELLED, FAILED }`
- `RECRUITMENT_PROCESSING_STATUS` = `{ PENDING, QUEUED, PROCESSING, COMPLETED, FAILED, ONBOARDING_PENDING }`

`server/src/modules/recruitment/fee-config/recruitment-fee-config.constants.ts` (read via `RecruitmentFeeConfigService` — never imported directly outside the fee-config module):
- `RECRUITMENT_FEE_CONFIG_DEFAULTS.CONNECTOR_PERCENT` = `80` — share of gross that goes to the connector pool (rest to platform)
- `RECRUITMENT_FEE_CONFIG_DEFAULTS.PLATFORM_PERCENT` = `20`
- `RECRUITMENT_FEE_CONFIG_DEFAULTS.CANDIDATE_SUCCESS_FEE_RECIPIENT_PERCENT` = `100`
- `RECRUITMENT_FEE_CONFIG_DEFAULTS.CANDIDATE_SUCCESS_FEE_PLATFORM_PERCENT` = `0`
- `RECRUITMENT_FEE_CONFIG_DEFAULTS.SPLIT_CONNECTOR_SHARE_PERCENT` = `50` — per-recipient share inside the connector pool when a candidate has two connectors (claimer + sharer); written to `recruitment_candidate_connectors.share_percent` and used to compute "As Sharer" earnings shown on the public job page (`50% of 80% = 40%` of gross by default)

Service helpers worth knowing:
- `splitAmount(amount, percent): string` — returns `(amount * percent / 100).toFixed(2)`. Used by listing/detail APIs that need a 2-decimal string.
- `getSharerPayoutAmount(grossAmount): string` — convenience for the public-job DTO; equivalent to `splitAmount(connectorPool, splitConnectorSharePercent)`.

### Types
`server/src/modules/recruitment/payout/recruitment-payout.types.ts`:
- `RecruitmentPayoutJobData` -- job payload (payoutId, candidateId, jobId, connectorUserId, grossAmount, triggeredAt)
- `RecruitmentPayoutJobResult` -- job result (success, transferId, amounts)

## Client

### Components
- **InterviewOutcomeDialog** -- `client/src/components/recruitment/InterviewOutcomeDialog.tsx` -- Uses React Hook Form + Zod (`client/src/schemas/interview-outcome.schema.ts`) + Shadcn Form components. Select dropdown with Completed/No-Show/Cancelled options, comment field (required for no-show/cancelled).

### Modified Pages
- **KanbanCandidateCard** -- `client/src/pages/recruitment/job-kanban/KanbanCandidateCard.tsx` -- Added "Mark Outcome" button in interview_scheduled stage, disabled before meetingDate (uses `utcDayjs()` for timezone-aware comparison)
- **JobDetailWithKanban** -- `client/src/pages/recruitment/JobDetailWithKanban.tsx` -- Wired up InterviewOutcomeDialog, added outcome handler that calls API and invalidates queries

### Modified Types
- **KanbanCandidate** -- `client/src/pages/recruitment/job-kanban/types.ts` -- Added `meetingDate?` and `interviewOutcome?` fields

### API Module
- `client/src/lib/api/recruitment.ts` -- Added `markInterviewOutcome(candidateId, payload)` method and `MarkInterviewOutcomePayload` type. Added `interview` and `interviewOutcome` fields to `JobCandidateItem`.

## External Integrations

### Stripe Connect
- **Transfer:** `stripeService.createTransfer(amountCents, 'usd', connectorStripeAccountId, metadata)` -- moves funds to connector's connected account
- **Payout:** `stripeService.createPayoutForConnectedAccount(amountCents, 'usd', connectorAccountId, metadata)` -- triggers bank transfer (best-effort)
- **Deferred payouts:** When connector has no Stripe account, payout status = `onboarding_pending`. When `account.updated` webhook fires (account ready), all deferred payouts are queued via `account-updated.handler.ts`

### Credit System
- Uses `CreditUsageHelper.calculateCreditApplicationForUser()` to calculate credits against platform commission
- Uses `CreditBalanceHelper.deductCredits()` + direct `user_credit_history` insert (with `introductionRequestId: null`, `payoutHistoryId: null`, context in `evidence` JSONB)
- Credits can only offset the platform's 20% commission, never the connector's 80%

## Integration Points (Modified Existing Files)

| File | Change |
|------|--------|
| `server/src/database/schema/recruitment-interview-meetings.ts` | Added 4 interview outcome columns |
| `server/src/database/schema/index.ts` | Export new schema |
| `server/src/modules/recruitment/interview-booking/services/interview-booking-confirm.service.ts` | Calls `payoutCreateService.createPayoutRecord()` in booking transaction (step g). Uses path alias import for payout service. |
| `server/src/modules/recruitment/interview-booking/interview-booking.module.ts` | Imports RecruitmentPayoutModule |
| `server/src/modules/recruitment/recruitment.module.ts` | Imports RecruitmentPayoutModule + RecruitmentPayoutQueueModule |
| `server/src/modules/webhooks/stripe/handlers/account-updated.handler.ts` | Processes recruitment deferred payouts alongside introduction payouts |
| `server/src/worker/worker.module.ts` | Registers recruitment-payout-queue, processor, calculator, stripe handler, and queue service |

## Pre-Payout Validations
1. **Recruiter payment captured:** Re-verifies `recruitment_interview_transactions.status = 'captured'` at processing time
2. **Amount from database only:** Bounty snapshot from `recruitment_job_prices.bounty_amount` at record creation
3. **No duplicate payouts:** Unique DB index on (candidateId, jobId, connectorUserId) + row-level lock + stripeTransferId idempotency check
4. **Stripe account check:** If connector has no stripeConnectAccountId, defers payout to `onboarding_pending`
5. **Interview outcome check:** Only queues payout when recruiter marks "completed"
6. **Meeting date check:** Recruiter cannot mark outcome before meetingDate has passed

## What's NOT in Phase 1
- No email/in-app notifications for payouts
- No connector or recruiter visibility into payout status
- No refund logic for no-show/cancelled
- No outcome deadline / auto-complete for recruiters who never mark
- No multi-connector split (Phase 2 -- will use multiple payout records per transaction)
- No dispute system (window is built, feature is future)
- No cron job -- fully event-driven via delayed BullMQ jobs

## Phase 2 Considerations
- **Multi-connector split:** Multiple connectors can be associated with a hire. Each gets their own `recruitment_payout_history` record linked to the same `recruitment_interview_transactions` record. No extra columns needed.
- **Dispute system:** Recruiter can dispute within the 25h window. Needs new dispute table + UI.
- **Refunds:** Handle no-show/cancelled payment refunds back to recruiter.
- **Notifications:** Email + in-app for payout earned, processed, Stripe connect reminder.
- **Connector dashboard:** Show recruitment payouts on finances/earnings page.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-09 | Phase 1 implementation: payout record creation, interview outcome marking, delayed queue processing, Stripe transfer, credit integration, deferred payouts | Claude |
