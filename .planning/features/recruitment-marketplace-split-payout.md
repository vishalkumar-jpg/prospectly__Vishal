# Feature: Recruitment Multi-Connector (Marketplace Split) Payout

**Version:** 1.0 (Phase 2)
**Status:** Active
**Last Updated:** 2026-04-14
**Builds on:** [recruitment-payout.md](./recruitment-payout.md) (Phase 1 single-connector payout)

## Overview

Extends the single-connector payout (80% connector / 20% platform) with a **50/50 split** between two connectors for a narrow, high-intent funnel: a brand-new Prospectly user who lands on a public job page via `?ref={sharerCode}`, clicks **"I Have a Candidate"**, signs up, and then contributes a candidate that eventually gets hired for that **same origin job**.

For every other scenario — existing Prospectly user clicking a ref link, claimer adding candidates to a different job, claimer using their own share link, direct-apply flow, etc. — the existing single-connector flow runs unchanged.

### Payout Split (marketplace deal)

| Recipient       | Percentage of gross |
|-----------------|---------------------|
| Claimer connector | 40% |
| Sharer connector  | 40% |
| Platform          | 20% |

Each 40% sub-payout is processed as its own self-contained payout row with its own per-recipient credit offset math. The existing `RECRUITMENT_PAYOUT_COMMISSION.CONNECTOR_PERCENT = 80` is preserved — the 80% connector pool is simply split 50/50 when the row is created.

### Key terms

- **Sharer** — the connector whose share link brought the claimer to Prospectly. Resolved via `recruitment_connector_origins.shareId → recruitment_job_shares.sharerId`.
- **Claimer** — the newly-onboarded connector who signed up via the public job page and added the candidate.
- **Origin job** — the job that was attached to the ref link when the claimer signed up. Stored in `recruitment_connector_origins.jobId`.
- **Marketplace deal** — a payout pair that is split 50/50 between sharer + claimer. Flagged by `recruitment_payout_history.is_marketplace_deal = true` on both rows.

## Eligibility rules

A candidate produces a split payout pair **only if ALL of the following hold** at candidate creation time:

1. The candidate is created via the **consent apply** flow (Path A — connector-uploaded resume — or Path B — AI-matched contact). Direct-apply candidates never split.
2. The connector attached to the `recruitment_job_pool_matches` row has an origin row (`recruitment_connector_origins`) — i.e. they are a "new connector" that onboarded via a public job page.
3. The origin row's `jobId` **equals** the job this candidate is being added to.
4. The origin row's resolved `sharerId` is not null **and** is not equal to the claimer's own id (self-attribution guard).

If any of these fail, the candidate collapses to a single-connector (primary) attribution and a normal 80/20 payout is produced.

### Paths that trigger a split

- ✅ Manual connector resume upload via `/recruiting/job-marketplace?job={originJobId}&action=upload` → feeds into the existing `POST /recruitment/connector-upload` endpoint → pool_match → consent flow → **candidate row created** (split decision happens here).
- ✅ AI-matched from uploaded contacts → pool_match → consent email → consent accepted → **candidate row created** (split decision happens here).

### Paths that DO NOT trigger a split

- ❌ Existing Prospectly user clicks a ref link (no origin row written at signup).
- ❌ Claimer adds a candidate to a job that is **not** their origin job.
- ❌ Claimer reshares a job themselves and a candidate applies via their own share link (direct apply path is always single-connector).
- ❌ Any direct-apply flow (`POST /recruitment/candidates/apply`).

## End-to-end flow

```
 Sharer (connector A)
   │ creates share   (recruitment_job_shares: sharerCode, sharerId)
   ▼
 Public job page /jobs/{jobId}?ref={sharerCode}
   │ clicks "I Have a Candidate"
   ▼
 OAuth signup with state { originJobId, originRef=sharerCode }
   │ server resolves (jobId, sharerCode) → recruitment_job_shares
   │ if resolved AND sharerId != newUser.id:
   │   insert recruitment_connector_origins(userId, jobId, shareId)
   ▼
 Welcome popup ── close ─▶ Post-welcome popup
                              ├── [Primary] Upload Resume for this job
                              │       → /recruiting/job-marketplace?job={originJobId}&action=upload
                              │         (existing contract; auto-opens upload modal)
                              └── [Secondary] Upload Contacts
                                      → /recruiting/getting-started

 ── Candidate creation: split decision happens here ──
   Path A: Manual upload
     POST /recruitment/connector-upload
     → connector-upload queue creates
       recruitment_job_pool_matches { connectorUserId=claimer, source='connector_uploaded' }
     → recruiter approves → consent email → consent accepted →
       POST /recruitment/consent/apply → candidate row created

   Path B: AI-matched
     pool-matches-compute creates match { connectorUserId=claimer, source='ai_matched' }
     → consent flow → POST /recruitment/consent/apply → candidate row created

   Inside consent-mutation.service.ts (SAME tx as candidate insert):
     RecruitmentPayoutSplitService.resolveConnectorsForNewCandidate({ claimerId, jobId })
       │ if origin row exists for claimer AND origin.jobId == jobId AND sharerId != claimerId
       │   → { mode: 'split', recipients: [claimer 50%, sharer 50%] }
       │ else
       │   → { mode: 'single', recipients: [claimer 100%] }
       ▼
     CandidateConnectorsService.addSplit(tx, candidateId, claimerId, sharerId)
       OR
     CandidateConnectorsService.addPrimary(tx, candidateId, claimerId)

 ── Candidate → Interview → Payout ──
   Recruiter shortlists → Stripe auth
   Candidate books interview → Stripe capture
     │
     ▼
   RecruitmentPayoutCreateService.createPayoutRecord()
     │ reads recruitment_candidate_connectors for this candidate
     │ isSplit = any row has role ∈ { 'claimer', 'sharer' }
     │
     ├─ SPLIT: insert 2 recruitment_payout_history rows
     │         same (candidateId, jobId), different recipientId,
     │         each recipientAmount = gross × 40%,
     │         each platformAmount  = gross × 10%,
     │         is_marketplace_deal = true on both
     │
     └─ SINGLE: insert 1 row
         recipientAmount = gross × 80%,
         platformAmount  = gross × 20%,
         is_marketplace_deal = false

   Recruiter marks outcome = completed
     │
     ▼
   RecruitmentPayoutOutcomeService.markOutcome()
     │ fetches ALL non-deleted payout rows for the candidate
     │ asserts all are in status = 'pending'
     │ fans out → one BullMQ job per row (independent, same 25h delay)

   Recruiter marks outcome = no_show | cancelled
     │
     ▼
   Cancel ALL rows for this candidate (split pair is cancelled atomically)

 ── 25h dispute window expires ──
   Per-row BullMQ processor fires:
     1. Lock payout row, check idempotency
     2. Re-verify payment captured
     3. Mark processing
     4. SPLIT RECONCILER: if is_marketplace_deal and sibling row's user has
        users.deleted_at set → cancel sibling, top THIS row up from 40% → 80%
     5. Check recipient Stripe Connect account
        → if missing: processing_status = 'onboarding_pending' (existing mechanism)
     6. Calculator applies credits against THIS row's own platform slice
     7. Stripe transfer
     8. Atomic DB update + credit deduction
```

## Data model changes

### New table: `recruitment_connector_origins`

Tracks which job/share brought a brand-new connector into Prospectly. First-click-at-signup wins; one row per user.

| column    | type              | notes                                                |
|-----------|-------------------|------------------------------------------------------|
| id        | uuid PK           |                                                      |
| user_id   | uuid FK → users    | **UNIQUE** — one origin per user                    |
| job_id    | uuid FK → recruitment_jobs | origin job                                   |
| share_id  | uuid FK → recruitment_job_shares | origin share (→ sharerId for split)   |
| created_at | timestamptz      | toUTC()                                              |
| created_by | uuid              | = user_id                                            |

Schema file: `server/src/database/schema/recruitment-connector-origins.ts`

### New table: `recruitment_candidate_connectors`

Normalizes candidate ↔ connector from 1-to-1 to 1-to-many. Replaces the removed `recruitment_job_candidates.connector_user_id` column. Insert-only (soft-delete and re-insert if the mapping ever needs to change — never updated in place).

| column            | type                                  | notes                                       |
|-------------------|---------------------------------------|---------------------------------------------|
| id                | uuid PK                               |                                             |
| candidate_id      | uuid FK → recruitment_job_candidates   | cascade on delete                          |
| connector_user_id | uuid FK → users                        | indexed                                    |
| role              | varchar(20) `'primary' \| 'claimer' \| 'sharer'` | 'primary' for single, others for split |
| share_percent     | numeric(5,2)                          | 100.00 (primary) or 50.00 (split)          |
| created_at        | timestamptz                           | toUTC()                                    |
| created_by        | uuid                                  |                                             |
| deleted_at        | timestamptz NULL                      | soft delete                                |

Unique index: `(candidate_id, connector_user_id) WHERE deleted_at IS NULL`. No `updated_at/updated_by` — rows are insert-only.

Schema file: `server/src/database/schema/recruitment-candidate-connectors.ts`

### Modified table: `recruitment_job_candidates`

Removed the `connector_user_id` column. All connector attribution now lives in `recruitment_candidate_connectors`.

### Modified table: `recruitment_payout_history`

Added one column:

| column              | type                   | notes                                                                                      |
|---------------------|------------------------|--------------------------------------------------------------------------------------------|
| is_marketplace_deal | boolean NOT NULL DEFAULT false | `true` on both rows of a split pair. Set at insert time, never mutated. Listing-screen indicator. |

No other schema change on `recruitment_payout_history`. The existing unique index `(candidateId, jobId, recipientId) WHERE deleted_at IS NULL` already permits two rows with different recipients, which is exactly what split needs. Everything else (co-recipient, share %, split pair) is derivable from the sibling row on the same `(candidateId, jobId)`.

## Server modules

### New module: `connector-origins/`

Path: `server/src/modules/recruitment/connector-origins/`

- **ConnectorOriginsService**
  - `createOriginIfNew(tx, userId, jobId, sharerCode)` — called from auth service after a new user row is created. Validates `(jobId, sharerCode)` against `recruitment_job_shares`, skips silently on any mismatch (never fails signup), guards against self-attribution.
  - `getOriginForUser(db, userId)` — returns `{ userId, jobId, shareId, sharerId }` or `null`. Used by the split service at candidate creation time.
- Internal-only (no controller). Exports the service to `AuthModule`, `ConsentModule`, and `RecruitmentPayoutSplitModule`.

### New module: `candidate-connectors/`

Path: `server/src/modules/recruitment/candidate-connectors/`

- **CandidateConnectorsService**
  - `addPrimary(tx, candidateId, connectorUserId)` — single-connector case (100%).
  - `addSplit(tx, candidateId, claimerUserId, sharerUserId)` — split case, inserts two rows (50/50).
  - `getConnectorsByCandidate(db, candidateId)` — returns all non-deleted mapping rows.
  - `getPrimaryConnector(db, candidateId)` — returns the "acting" connector (primary or claimer), for places that still need a single value.
- Exposes `CANDIDATE_CONNECTOR_ROLE` constants (`'primary' | 'claimer' | 'sharer'`).
- Internal-only (no controller). Used by `CandidatesModule`, `ConsentModule`, and `RecruitmentPayoutModule`.

### New module: `payout/recruitment-payout-split.module.ts`

Path: `server/src/modules/recruitment/payout/`

- Standalone module that owns `RecruitmentPayoutSplitService`. Separated from the main payout module to avoid circular imports — both `ConsentModule` and `RecruitmentPayoutModule` import it.

- **RecruitmentPayoutSplitService**
  - `resolveConnectorsForNewCandidate(tx, { claimerId, jobId })` — returns `{ mode: 'single' | 'split', recipients: [...] }`. Called inside the consent-mutation transaction when a candidate row is being created. This is the **single authoritative split decision point**.

### Modified: `payout/services/recruitment-payout-create.service.ts`

- Reads `recruitment_candidate_connectors` instead of the removed `recruitment_job_candidates.connector_user_id` column.
- Builds one `recruitment_payout_history` row per mapping entry:
  - Single → 1 row (80% / 20%, `is_marketplace_deal = false`)
  - Split → 2 rows (40% / 10% each, `is_marketplace_deal = true` on both)
- Per-row amounts are cent-exact so the connector slices + platform slices always sum to gross. Odd cents land in the platform slice (connectors are never shorted).

### Modified: `payout-queue/services/recruitment-payout-calculator.service.ts`

- New signature: `calculate(recipientId, recipientBaseCents, platformBaseCents)`.
- No longer hard-codes 80/20 — the caller passes the base amounts read from the locked payout row. This lets the same calculator handle single payouts (gross × 80/20) and split payouts (gross × 40/10) uniformly.
- Credit logic unchanged: credits offset up to this row's own platform slice, with the offset amount added to the connector as a "bonus".

### Modified: `payout-queue/services/recruitment-payout-queue.processor.ts`

- Reads `recipientAmount` and `platformAmount` from the locked payout row (not recomputed from gross) and passes them to the calculator.
- New **split reconciler step** (`maybeAbsorbDeletedSibling`) runs before the calculator. If `payout.is_marketplace_deal = true` AND the sibling row's recipient has `users.deleted_at` set, the sibling row is cancelled (`error_message = 'sharer_deleted'`) and THIS row is topped up from its 40% allocation to the full 80% (CONNECTOR_PERCENT) of gross. Platform slice grows correspondingly.
- Credit evidence JSON now includes `isMarketplaceDeal` for auditability.

### Modified: `payout/services/recruitment-payout-outcome.service.ts`

- Fetches **all** non-deleted payout rows for the candidate (split pair) instead of just one.
- On **completed** outcome: fans out to one BullMQ job per payout row (independent jobs, same 25h delay). Failures/onboarding_pending on one recipient don't block the other.
- On **no_show / cancelled** outcome: cancels **all** rows for the candidate in one UPDATE.
- Fixed pre-existing bug: the queued job now carries the real `jobId` (previously passed `""`).

### Modified: `candidates/services/candidates-mutation.service.ts`

- Direct apply flow. Stops writing the removed `connector_user_id` column. Adds a `CandidateConnectorsService.addPrimary(tx, candidateId, share.sharerId)` call inside the same candidate-insert transaction. **Direct apply is always single-connector** (never a split).

### Modified: `consent/services/consent-mutation.service.ts`

- **The split decision point.** Inside the candidate-insert transaction:
  1. Calls `RecruitmentPayoutSplitService.resolveConnectorsForNewCandidate(tx, { claimerId: match.connectorUserId, jobId: payload.jobId })`.
  2. If mode is `'split'` → `CandidateConnectorsService.addSplit(tx, candidateId, claimerId, sharerId)`.
  3. Otherwise → `CandidateConnectorsService.addPrimary(tx, candidateId, match.connectorUserId)`.
- Stops writing the removed `connector_user_id` column on the candidate row.
- Applies to both Path A (connector-uploaded resume via `/recruitment/connector-upload`) and Path B (AI-matched) since both funnel through this service when the candidate row is actually created.

### Modified: reads of the removed column

Refactored to join `recruitment_candidate_connectors` filtering `role IN ('primary', 'claimer')`:

- `server/src/modules/recruitment/candidates/services/candidates-query.service.ts` — `getCandidateDetail` connector info on the detail pane.
- `server/src/modules/recruitment/interview-cost/shortlist-breakdown.service.ts` — connector name on the shortlist breakdown.
- `server/src/modules/recruitment/candidate-workflow/services/candidate-workflow-shortlist.service.ts` — denormalized `recruitment_interview_transactions.connectorUserId` snapshot at shortlist time (stores the "acting" connector).
- `server/src/modules/recruitment/connector-pipeline/services/connector-pipeline-candidates.service.ts` — connector pipeline list. A connector "owns" a candidate if they appear on that candidate's mapping in any role.

### Modified: signup flow

- **`server/src/modules/auth/auth.types.ts`** — new `OriginContext { jobId?, sharerCode? }` carried on `LoginGoogleUser` and `LoginMicrosoftUser`.
- **`server/src/modules/auth/auth.service.ts`** — injects `ConnectorOriginsService` + `DRIZZLE_TOKEN`. In `loginWithGoogle` and `loginWithMicrosoft`, after a new user is created, calls `connectorOriginsService.createOriginIfNew(db, user.id, jobId, sharerCode)` if `originContext` is present. Best-effort — never fails signup.
- **`server/src/modules/auth/auth.controller.ts`** — extracts `originJobId` and `originRef` from the OAuth `state` query string on both Google and Microsoft callbacks; forwards to the auth service as `originContext`.
- **`server/src/modules/auth/auth.module.ts`** — imports `ConnectorOriginsModule`.

### Module registration

- **`server/src/modules/recruitment/recruitment.module.ts`** — imports `RecruitmentPayoutSplitModule`, `ConnectorOriginsModule`, `CandidateConnectorsModule`.
- **`server/src/modules/recruitment/candidates/candidates.module.ts`** — imports `CandidateConnectorsModule`.
- **`server/src/modules/recruitment/consent/consent.module.ts`** — imports `CandidateConnectorsModule` + `RecruitmentPayoutSplitModule`.
- **`server/src/modules/recruitment/payout/recruitment-payout.module.ts`** — imports `CandidateConnectorsModule` + `RecruitmentPayoutSplitModule`.

## Security: ref carriage through signup

- `sharerCode` is **already public** (it's in every share URL by design). Passing it through OAuth state introduces no new exposure.
- Server validates `(jobId, sharerCode)` against `recruitment_job_shares` at signup time. Malformed or unresolved combos are silently skipped — signup never fails over origin tracking.
- Self-attribution guard: if the resolved `sharerId` equals the newly-created user's id, no origin row is written (shouldn't happen in practice, but defends against replay / hand-crafted URLs).
- The only theoretical abuse vector is a user hand-crafting a URL to credit a different sharer. This is self-harming (the attacker pays money to a stranger), so no cryptographic binding is needed.
- Do not log full signup URLs at INFO level — log `ref_present: true/false` if diagnostics are needed.

## Example use cases

All examples use a job with a $100 bounty. Commission pool = $80 connector / $20 platform in the single case, split 50/50 in the marketplace-deal case ($40/$40 connector, $10/$10 platform).

### Case 1 — Happy split path (manual upload)

1. Bob shares job J via sharerCode X. Alice (brand new) lands on `/jobs/J?ref=X`, clicks "I Have a Candidate", signs up.
   → origin row inserted: `{ alice, J, shareId(X) }`.
2. Post-welcome popup fires. Alice clicks "Upload Resume for This Job" → `/recruiting/job-marketplace?job=J&action=upload` auto-opens the existing ConnectorResumeUploadModal. She uploads Carol's resume.
3. `connector-upload` queue creates a pool_match `{ alice, J, carol, source='connector_uploaded' }`. Recruiter approves → consent email → Carol accepts → `POST /recruitment/consent/apply` creates the candidate row. Inside that tx:
   - `payoutSplitService.resolveConnectorsForNewCandidate({ claimerId: alice, jobId: J })` → split (origin matches).
   - `candidate_connectors = [{ alice, claimer, 50 }, { bob, sharer, 50 }]`.
4. Recruiter shortlists Carol → payment auth → Carol books interview → payment captured.
5. `createPayoutRecord` inserts two `recruitment_payout_history` rows, same `(candidateId, jobId)`, different `recipientId`, gross $100, each `recipientAmount=$40` / `platformAmount=$10`, `is_marketplace_deal=true`.
6. Recruiter marks outcome completed → two independent BullMQ jobs queued, each with a 25h delay.
7. Both processors fire: each calculator applies that recipient's own credits (up to $10 each), Stripe transfers $40 (+ bonus if credits) to each connector.

### Case 2 — Claimer has $8 credits, Bob has $15 credits

- Alice's sub-payout: base $40 + credit offset $8 (cap = MIN($8 balance, $10 platform slice) = $8). Stripe transfer = $48. Platform keeps $2. Alice balance: $8 → $0.
- Bob's sub-payout: base $40 + credit offset $10 (cap = MIN($15 balance, $10 platform slice) = $10 — the platform slice is the binding cap, not the balance). Stripe transfer = $50. Platform keeps $0. Bob balance: $15 → $5.
- Platform total this deal: $2. Gross preserved: $48 + $50 + $2 = $100. ✓

### Case 2b — Both Alice AND Bob have $50 credits each (heavy-credit scenario)

The key insight: **credits only offset up to this row's own platform slice, which is $10 in a split.** Extra balance rolls forward.

Walkthrough, gross $100:

- Each sub-payout has `baseRecipientCents = 4000` ($40) and `basePlatformCents = 1000` ($10).
- Alice's credit calc:
  - `creditBalanceCents = 5000` ($50)
  - `creditsToApplyCents = MIN(5000, 1000) = 1000` ($10)
  - `connectorBonusCents = 1000` ($10)
  - `effectiveRecipientCents = 4000 + 1000 = 5000` ($50)
  - `effectivePlatformCents = 1000 - 1000 = 0`
  - `newBalance = $50 - $10 = $40`
- Bob's credit calc: identical math (same balance, same $10 platform slice).
  - Gets $50, platform keeps $0, balance → $40.

Outcome:

| party    | Stripe transfer | credits burned | credit balance after |
|----------|-----------------|----------------|----------------------|
| Alice    | $50             | $10            | $40                  |
| Bob      | $50             | $10            | $40                  |
| Platform | —               | —              | $0                   |
| **Total**| **$100**        |                |                      |

Gross preserved: $50 + $50 + $0 = $100. ✓

**Why only $10 is burned per connector even though each has $50:** in a split payout, each connector is only responsible for half of the platform fee ($10), so their credits can only "buy down" that $10. The remaining $40 of their balance is **untouched** and available for their next payout.

Contrast with a **single-connector** payout of the same gross: the connector owns the full $20 platform slice, so a $20 credit burn is possible and they'd walk away with a bigger bonus ($100 Stripe transfer, $0 platform, $20 credits burned → $30 balance remaining out of $50). Split payouts consume credits more slowly per connector — this is a natural property of the design and is worth surfacing in any user-facing credit-mechanics copy.

### Case 2c — Only Alice has credits, Bob has $0

- Alice: base $40 + credit offset $10 → $50 Stripe transfer, balance -$10.
- Bob: base $40, no credits → $40 Stripe transfer, platform keeps $10.
- Platform total: $10. Alice's credits do **not** cover Bob's platform slice. Credits are strictly scoped to each connector's own sub-payout (matches the "each applied to their own sub-payout independently" decision).

### Case 3 — Alice's candidate hired on a DIFFERENT job

- Alice uploaded Carol's resume for job K (not her origin job J). Carol hired on K.
- Split decision: `origin.jobId (J) != this job (K)` → single payout to Alice. Bob gets nothing. Normal 80/20.

### Case 4 — Alice was already a Prospectly user before clicking the ref link

- Signup sees existing user → `createOriginIfNew` is a no-op. No origin row created. All future candidates Alice adds = single payout. Matches the "existing account = no split" rule.

### Case 5 — Alice reshares J via her OWN share link → candidate Dan applies directly

- Dan's candidate row is created by `candidates-mutation.service.ts` (direct apply). That path always calls `addPrimary(tx, candidateId, share.sharerId)` — **never a split**, regardless of origin rows. Alice gets the full 80%. Matches the "if claimer shares and candidate directly applies, no splitting" rule.

### Case 6 — 3-way chain

- Alice claimed J via Bob. Later Eve signs up via Alice's share of J and uploads a candidate that gets hired on J.
- Per the rule, the split is between whoever shared (Alice) and whoever claimed (Eve) — Bob is **not** included. Implementation: Eve's origin row points at Alice's share, not Bob's. Lookup is always `origin.shareId → sharerId` for that specific signup event, so Bob is naturally excluded. The chain does not propagate — max two recipients per payout, always.

### Case 7 — No-show / cancelled outcome

- Recruiter marks interview `no_show` or `cancelled`.
- `handleFailedOutcome` issues one UPDATE cancelling **all** non-deleted payout rows for the candidate → both split rows move to `cancelled` atomically. Candidate moves to `rejected` stage.

### Case 8 — Only Alice has completed Stripe onboarding; Bob has not

- Alice's BullMQ job runs, finds her Stripe account, pays her $40. Done.
- Bob's BullMQ job runs, finds no `stripe_connect_account_id`, sets his row's `processing_status = 'onboarding_pending'`.
- When Bob later completes Stripe onboarding, the existing `webhooks/stripe/handlers/account-updated.handler.ts` invokes `processDeferredPayoutsForRecipient(bob)` → his row is re-queued with no delay → processor runs → Bob gets paid.
- Money flows to the ready connector immediately; the unready connector is parked without blocking anything.

### Case 9 — Bob deleted his account by the time the 25h window elapses

- Alice's BullMQ job fires. Processor's split reconciler queries for sibling row on `(candidateId, jobId)`, finds Bob's row, joins to `users` and sees `users.deleted_at IS NOT NULL`.
- Reconciler cancels Bob's row (`status='cancelled', error_message='sharer_deleted'`) and updates Alice's row's `recipient_amount` and `platform_amount` from ($40, $10) → ($80, $20). Marketplace-deal flag is preserved as a historical marker.
- Calculator then runs on Alice's topped-up row. Alice is paid the full 80% ($80 base + any credit bonus). Platform keeps $20. Total for the deal matches a normal single-connector payout.

### Case 10 — Self-attribution collapse

- Edge: `origin.sharerId === claimerId` (e.g., replay / hand-crafted URL).
- `RecruitmentPayoutSplitService.resolveConnectorsForNewCandidate` detects this and returns `mode: 'single'`. `addPrimary` is used. No duplicate payment to the same user.

## Client

### New components (planned)

- **PostWelcomePopup** — shown immediately after the existing welcome popup closes, only for users whose session indicates an origin job. Two CTAs:
  - **Primary (filled):** "Upload Resume for This Job" → navigates to `/recruiting/job-marketplace?job={originJobId}&action=upload` (existing URL contract from `recruitment-connector-resume-upload.md` — auto-opens `ConnectorResumeUploadModal`).
  - **Secondary (outline):** "Upload Contacts" → navigates to `/recruiting/getting-started`.
  - Popup is **skipped entirely** if the origin job is no longer active (fall back to default connector onboarding).

### Modified pages (planned)

- **Public job page** — the "I Have a Candidate" button forwards `ref` (and the job id) into the OAuth state when kicking off signup so the server can consume them on callback.
- **Signup/OAuth initiation** — state param includes `originJobId` and `originRef`.
- **`/recruiting/job-marketplace`** — **no change**; the existing `?job={jobId}&action=upload` contract already auto-opens the upload modal. The post-welcome popup just navigates to that URL.

## Pre-payout validations (unchanged from Phase 1)

All six validations from the Phase 1 single-connector flow continue to apply to every payout row, including both rows of a split pair:

1. Recruiter payment captured.
2. Amount from database only (bounty snapshot at row creation).
3. No duplicate payouts (unique index `(candidateId, jobId, recipientId) WHERE deleted_at IS NULL` + row lock + `transferId` idempotency).
4. Stripe account check → defer to `onboarding_pending`.
5. Interview outcome check → only queues on `completed`.
6. Meeting date check → outcome cannot be marked before `meetingDate`.

Plus one new check that runs **inside** the processor:

7. **Split reconciler** — if `is_marketplace_deal` and the sibling's recipient is `users.deleted_at IS NOT NULL`, cancel the sibling and top this row up to the full 80%.

## Edge cases explicitly covered

- Existing user clicks ref → no origin row → no split.
- Claimer adds candidate to non-origin job → single payout.
- Claimer's own share link → direct apply → single payout (source exclusion in `candidates-mutation`).
- Sharer account deleted at payout time → claimer absorbs full 80% via reconciler.
- One recipient Stripe-unfonboarded at fire time → partial pay now, other parked as `onboarding_pending` and resumed via existing `account-updated.handler`.
- Self-attribution (`sharerId === claimerId`) → collapse to single.
- No-show / cancelled outcome → all split rows cancelled together.
- Cent-exact rounding — `platformAmount = gross - sum(recipientAmounts)`; odd cents land in the platform slice.
- Invalid / spoofed ref at signup → server validates against `recruitment_job_shares`; on failure, origin row is silently skipped and signup succeeds.
- Retrying signup cannot create duplicate origin rows (unique constraint on `user_id`).
- Split decision is made **exactly once, at candidate creation time**, and frozen into `recruitment_candidate_connectors`. Later changes to origin or share rows do not retroactively re-split existing candidates.

## What's NOT in this phase

- No payout listing / history UI changes (follow-up plan).
- No admin/reconciliation endpoints for split payouts.
- No analytics dashboards for marketplace deals.
- No multi-origin per user (one origin row per user, first click wins).
- No N-way chaining (max 2 recipients per payout, always).
- No notifications to sharer when a claimer they referred earns a payout.

## Integration points (modified existing files)

| File | Change |
|------|--------|
| `server/src/database/schema/recruitment-job-candidates.ts` | Removed `connector_user_id` column + its index |
| `server/src/database/schema/recruitment-payout-history.ts` | Added `is_marketplace_deal` boolean column |
| `server/src/database/schema/index.ts` | Exports `recruitment-connector-origins` and `recruitment-candidate-connectors` |
| `server/src/modules/recruitment/recruitment.module.ts` | Imports split/origin/connectors modules |
| `server/src/modules/recruitment/candidates/services/candidates-mutation.service.ts` | Writes `addPrimary` mapping; removed column write |
| `server/src/modules/recruitment/candidates/candidates.module.ts` | Imports `CandidateConnectorsModule` |
| `server/src/modules/recruitment/consent/services/consent-mutation.service.ts` | Split decision + `addPrimary`/`addSplit` write; removed column write |
| `server/src/modules/recruitment/consent/consent.module.ts` | Imports `CandidateConnectorsModule` + `RecruitmentPayoutSplitModule` |
| `server/src/modules/recruitment/payout/services/recruitment-payout-create.service.ts` | Fans out to N payout_history rows per mapping |
| `server/src/modules/recruitment/payout/services/recruitment-payout-outcome.service.ts` | Fetches all rows; fans out queue jobs; cancels all rows on failure |
| `server/src/modules/recruitment/payout/recruitment-payout.module.ts` | Imports `CandidateConnectorsModule` + `RecruitmentPayoutSplitModule` |
| `server/src/modules/recruitment/payout-queue/services/recruitment-payout-calculator.service.ts` | Accepts `(recipientBaseCents, platformBaseCents)` pair |
| `server/src/modules/recruitment/payout-queue/services/recruitment-payout-queue.processor.ts` | Reads per-row amounts; sharer-deleted reconciler |
| `server/src/modules/recruitment/candidates/services/candidates-query.service.ts` | Joins mapping table for connector info |
| `server/src/modules/recruitment/interview-cost/shortlist-breakdown.service.ts` | Joins mapping table for connector name |
| `server/src/modules/recruitment/candidate-workflow/services/candidate-workflow-shortlist.service.ts` | Joins mapping table for txn snapshot |
| `server/src/modules/recruitment/connector-pipeline/services/connector-pipeline-candidates.service.ts` | "My candidates" list uses mapping table |
| `server/src/modules/auth/auth.types.ts` | Added `OriginContext` |
| `server/src/modules/auth/auth.service.ts` | Accepts `originContext`, writes origin row after new user creation |
| `server/src/modules/auth/auth.controller.ts` | Extracts `originJobId` + `originRef` from OAuth state |
| `server/src/modules/auth/auth.module.ts` | Imports `ConnectorOriginsModule` |

## Verification

### Server unit / integration

- `RecruitmentPayoutSplitService.resolveConnectorsForNewCandidate`: test matrix for cases 1, 3, 4, 5, 6, 10. Assert recipients count and percents.
- `RecruitmentPayoutCalculatorService.calculate`: assert that a split sub-payout with `recipientBaseCents=4000`, `platformBaseCents=1000`, and $8 credits returns `effectiveRecipientCents=4800`, `effectivePlatformCents=200`, `creditsToApply=8`.
- Sharer-deleted reconciler: insert a split pair, soft-delete the sharer user, run the processor on the claimer row, assert sharer row is `cancelled` with `error_message='sharer_deleted'` and claimer row's `recipientAmount`/`platformAmount` are updated to 80/20 of gross.

### End-to-end (manual QA)

1. Seed job J, connector Bob, connector Alice (brand new). Share J via Bob → copy share URL.
2. Open share URL in incognito → click "I Have a Candidate" → sign up as Alice via Google OAuth → verify origin row exists in `recruitment_connector_origins`.
3. Observe post-welcome popup → click "Upload Resume for This Job" → confirm marketplace modal opens pre-targeted to J.
4. Upload Carol's resume → approve match → send consent → Carol accepts → `recruitment_job_candidates` row created + `recruitment_candidate_connectors` has two rows (`alice` claimer 50, `bob` sharer 50).
5. Recruiter shortlists Carol → Carol books interview → confirm two rows in `recruitment_payout_history` with same `(candidateId, jobId)`, different `recipientId`, `is_marketplace_deal = true` on both, each with `recipient_amount = 40.00` and `platform_amount = 10.00`.
6. Mark outcome completed → two BullMQ jobs queue → after delay (use short delay for QA), confirm two Stripe transfers appear in test-mode dashboard.
7. Run variations:
   - Non-origin job → confirm single payout to Alice only.
   - Direct apply to origin job → confirm single payout to Bob (the sharer) only.
   - Sharer with `users.deleted_at` set → confirm reconciler cancels Bob's row and tops Alice's to 80%.
   - One recipient without Stripe account → confirm `onboarding_pending` on that row, other row pays.
8. Re-run the Phase 1 single-connector suite — regression budget is zero.

### DB sanity queries

```sql
-- every candidate-job group should have 1 (single) or 2 (split) non-cancelled rows
SELECT candidate_id, job_id, count(*)
FROM recruitment_payout_history
WHERE deleted_at IS NULL AND status != 'cancelled'
GROUP BY candidate_id, job_id
HAVING count(*) NOT IN (1, 2);

-- no candidate should exist without at least one connector mapping row
SELECT c.id
FROM recruitment_job_candidates c
LEFT JOIN recruitment_candidate_connectors cc
       ON cc.candidate_id = c.id AND cc.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id
HAVING count(cc.id) = 0;

-- split pairs should both carry the same gross amount and both be flagged
SELECT candidate_id, job_id, count(*) FILTER (WHERE is_marketplace_deal) AS flagged_rows
FROM recruitment_payout_history
WHERE deleted_at IS NULL
GROUP BY candidate_id, job_id
HAVING count(*) = 2 AND count(*) FILTER (WHERE is_marketplace_deal) != 2;
```

## Revision history

| Version | Date       | Changes | Author |
|---------|------------|---------|--------|
| 1.0     | 2026-04-14 | Phase 2 implementation: marketplace split payout (sharer + claimer 50/50), `recruitment_connector_origins` + `recruitment_candidate_connectors` tables, `is_marketplace_deal` flag, split-aware payout create / outcome / calculator / processor, sharer-deleted reconciler, signup-flow origin tracking via OAuth state | Claude |
