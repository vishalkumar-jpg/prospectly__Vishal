# Feature: Editable Success Fee (Phase 2)

**Version:** 1.2
**Status:** Active
**Last Updated:** 2026-08-01

## Overview
Lets HR change the **Success Fee** (the one-time bonus paid 100% to a hired
candidate) *after* a job is published, and *add* a Success Fee to a job that
launched without one. The candidate bonus is always paid at the **latest** Success
Fee at release — no matter when the fee changed or when the candidate was hired.
This is the Success-Fee counterpart to the Flat Referral Fee edit
(`editable-flat-referral-fee.md`); the two share the same edit/audit/top-up shape.

## Money model (background)
The Success Fee is stored on `recruitment_job_prices` (`has_success_fee`,
`success_fee_amount`) and probation on `recruitment_jobs`
(`probation_period_days`). It is **charged to the recruiter at interview booking**
(`success_fee` transaction, one per candidate) and the candidate bonus is created
as a `recruitment_payout_history` row (`payout_type='candidate'`, 100% recipient).

Because the fee is charged before release, editing it opens a **funding gap** — the
same problem the connector flat-fee top-up already solves. Policy (confirmed with
the requester): **charge-up, no-refund-down.**

## Server Module
**Path:** `server/src/modules/recruitment/jobs/` and `.../payout/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | /recruitment/jobs/:id | Yes (JOB_EDIT) | Now also accepts `hasSuccessFee` (enable **and** disable), `successFeeAmount`, `probationPeriodDays` |
| GET | /recruitment/payout/:candidateId/state | Yes | Now returns the candidate bonus's `recipientAmount` re-priced to the latest fee + `candidateTopUp` preview |
| POST | /recruitment/payout/:candidateId/release | Yes (PAYOUT_RELEASE) | Candidate scope now charges the top-up first, validates capture, pays the latest fee |

### Key Services
- **RecruitmentJobsUpdateService** — `resolveSuccessFeeUpdate` (mirrors
  `resolveFlatFeeUpdate`): locks job + price rows, blocks closed jobs, persists
  `has_success_fee`/`success_fee_amount` (+ probation on enable), writes an audit row
  to `recruitment_job_price_change_history` (`fieldKey='success_fee_amount'`), and on
  enable backfills bonus rows for already-hired candidates. **Disabling** (`true →
  false`) nulls the amount and is future-only (no backfill, no refund).
- **RecruitmentSuccessFeeTopupService** — `computeSuccessFeeTopUp`
  (latest − captured funding) and `chargeSuccessFeeTopUpIfNeeded` (idempotent
  off-session charge, `success_fee_topup` transaction). Mirrors the flat-topup
  service, minus the fee calculator (the Success Fee is a raw amount). The
  `success_fee_topup` row is attributed to the candidate's connector —
  `connector_user_id` is copied from the candidate's `interview_cost` transaction,
  same as the booking-time `success_fee` row.
- **RecruitmentPayoutReleaseService** — candidate scope now: freeze already-actioned
  rows → charge top-up in front → re-price the bonus to **`min(latest, funded)`**
  (100/0) and queue. Paying the funded amount (never more than collected) means a
  second raise after an earlier top-up was already charged pays the high-water-funded
  amount instead of blocking the release.
- **RecruitmentPayoutCreateService** — bonus-row creation relaxed to link the
  `interview_cost` charge when no `success_fee` charge exists (fee added after
  booking); adds `backfillCandidateSuccessFeeRows`.
- **RecruitmentPayoutQueueProcessor** — the worker's pre-transfer funding check
  accepts **either** a captured `success_fee` **or** `success_fee_topup` for
  candidate payouts (connectors still check `interview_cost`), so a bonus enabled
  after hire — funded only by a top-up — transfers correctly.
- **RecruitmentPayoutStateService** — `computeCandidateSuccessFeePreview` feeds the
  release dialog the latest amount + top-up.

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_job_prices | Success Fee flag + amount (updated on an edit) |
| recruitment_jobs | Probation window (set on enable) |
| recruitment_job_price_change_history | Audit of Success Fee changes (`fieldKey='success_fee_amount'`) |
| recruitment_interview_transactions | `success_fee` charge + new `success_fee_topup` (one per candidate) |
| recruitment_payout_history | Candidate bonus row (re-priced to latest at release) |

No migration required — all columns already exist and the audit table is generic.

## Client
### Pages / Components
- **PostJobWizard** — `client/src/pages/recruitment/PostJobWizard.tsx`: unlocks the
  Success Fees step in edit mode (`isSuccessFeeEditable`), gates enabling/raising
  behind an informational-only confirmation (no live figures) both on leaving the
  step and at Save (Success Fees is the last edit step), and includes the fields in
  the update only when changed.
- **SuccessFeesStep** — editable in edit mode; the enable checkbox toggles freely so
  HR can add, edit the amount, or disable / re-enable the fee any time.
- **ReleasePayoutDialog** — the "Candidate bonus" amount and the **Release Candidate
  Bonus · $X** button both show the **latest** amount; a top-up disclosure + a
  confirm-charge dialog appear when releasing would charge the card.

### API Module
- `client/src/lib/api/recruitment.ts` — `UpdateRecruitmentJobPayload` gains
  `hasSuccessFee` / `successFeeAmount` / `probationPeriodDays`; `PayoutRowState`
  gains `candidateTopUp`.

## Business Logic
- Edit the amount, the **probation window**, enable a fee later, or **disable /
  re-enable** an existing fee any time via the checkbox. Editing is blocked on closed
  jobs. A probation-only change is persisted without
  writing a fee-amount audit row.
- **Disable is future-only:** stops charging + creating bonuses going forward;
  candidates already charged keep their pending bonus (paid the funded amount at
  release), no refund. Per-candidate reversal uses the Release dialog's Cancel flow.
  Re-enabling behaves like a first-time enable (latest-at-release + backfill).
- The candidate bonus is always paid the **latest** Success Fee at release,
  reconciled from what was already funded for that candidate.
- **Raise/enable** → the recruiter is charged the difference at release (abort +
  stay-pending on failure; idempotent, retry-safe). **Lower** → the candidate is
  paid the lower amount, recruiter not refunded.
- The bonus is paid `min(latest, funded)` — never more than was collected. Normally
  this equals the latest fee; a repeated raise before release (one top-up per
  candidate) pays the high-water-funded amount rather than deadlocking.

## Out of Scope (later)
- Refunds when lowering or disabling the fee (disable is future-only).
- Retroactively cancelling already-charged candidates' bonuses on disable (use the
  per-candidate Release Cancel flow).
- Connector/candidate notifications on a fee change.
- Repeated/staged top-ups (a fee raised more than once before release charges only
  the first increment; the bonus then pays the high-water-funded amount). Shares the
  flat-fee high-water-mark deferral.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-08-01 | Initial documentation (Phase 2) | jitendra_officebeacon |
| 1.1 | 2026-08-01 | Free disable/re-enable toggle; worker accepts `success_fee_topup` funding; top-up attributed to the candidate's connector | jitendra_officebeacon |
| 1.2 | 2026-08-01 | Probation window editable post-publish; release pays `min(latest, funded)` (no repeated-raise deadlock) | jitendra_officebeacon |
