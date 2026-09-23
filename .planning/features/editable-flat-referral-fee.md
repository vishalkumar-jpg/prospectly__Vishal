# Feature: Editable Flat Referral Fee (Phase 1)

**Version:** 1.4
**Status:** Active
**Last Updated:** 2026-09-10

## Overview
Lets HR change the **Flat Referral Fee** on a job *after* it is published, from the
job edit page. The new fee applies job-wide — pipeline display, the
capture, and connector payouts all reference the latest fee. Phase 1 covers only the
Flat Referral Fee amount; **Success Fees stay locked** (Phase 2).

## Money model (background)
The fee is a snapshot on **one row per job** (`recruitment_job_prices`:
`flatReferralAmount`, `totalAmount`,
and `bountyAmount`/`suggestedBountyAmount` which mirror the flat fee for the payout
path). The fee is **never copied onto candidates** — every pipeline read is a live
JOIN, so updating the row propagates the new fee to all *un-charged* candidates
automatically.

Capture happens in **one stage** (shortlisting is free):
- **Full fee at hire** — every candidate moved to Hired is charged the latest
  total. On a *legacy* job that captured a deposit before the shortlist deposit
  was removed, the first candidate to reach hire pays
  `latest total − actually captured deposit` instead, so the two captures still
  sum to the latest total.

Captured amounts are immutable snapshots in `recruitment_interview_transactions`.

## Server Module
**Path:** `server/src/modules/recruitment/jobs/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | /recruitment/jobs/:id | Yes (JOB_EDIT) | Existing job update; now also accepts `flatReferralAmount` (flat jobs only) |
| GET | /recruitment/jobs/:id/flat-referral-fee/preview?amount= | Yes (JOB_EDIT) | Read-only impact preview for a proposed new fee |

### Key Services
- **RecruitmentJobsUpdateService** — when `flatReferralAmount` is supplied,
  validates (job must be open + flat model), recomputes the pricing snapshot via
  the shared pricing service, persists it, and writes an audit-history row — all
  in one transaction.
- **RecruitmentFlatFeePreviewService** — read-only impact preview (new total,
  deposit, pipeline count, captured deposit, amount due at each future hire).
- **RecruitmentJobPricingService / FlatReferralFeeService** — existing single
  source of truth for fee math, reused by both create and edit.
- **InterviewBookingFlatChargeService** — hire-time charge now credits the
  *actually captured* deposit (not the live snapshot) and clamps the remainder to
  zero; a zero remainder records a $0 transaction with no Stripe call so the hire
  still completes and the connector payout funds from the latest fee.

### Database Tables
| Table | Purpose |
|-------|---------|
| recruitment_job_prices | Per-job fee snapshot (updated on a fee edit) |
| recruitment_job_price_change_history | Append-only audit of pricing changes (generic `fieldKey`; Phase 2 success-fee edits reuse it) |
| recruitment_interview_transactions | Immutable captured deposit / hire amounts |

## Client
### Pages
- **PostJobWizard** — `client/src/pages/recruitment/PostJobWizard.tsx` — unlocks the
  Flat Referral Fee on edit (active flat jobs), gates saving behind a confirmation
  dialog, and includes the new fee in the update only after confirmation.

### Components
- **FlatFeeUpdateConfirmDialog** —
  `client/src/pages/recruitment/post-job-wizard/FlatFeeUpdateConfirmDialog.tsx` —
  financial confirmation showing the server-computed impact before saving.
- **BudgetStep / FlatReferralCard** — the Flat Referral card unlocks in edit mode
  for active flat jobs; the live breakdown follows the edited value.

### Hooks / API Module
- `client/src/lib/api/recruitment.ts` — `UpdateRecruitmentJobPayload.flatReferralAmount`
  and `getFlatReferralFeePreview(jobId, amount)`.

## Business Logic
- A fee edit recomputes the whole flat pricing snapshot server-side; the client
  never supplies computed fees.
- The legacy deposit credit is re-read from the captured transaction at
  edit time.
- Across the two captures, the total collected always equals the **latest** fee.
- Lowering the fee below what was already captured never refunds; the hire
  remainder clamps to zero.
- Connector payouts scale automatically with the new fee (no notification in
  Phase 1).
- Editing is blocked on closed jobs.
- The fee accepts **cents** — any amount from $1.00 to $999,999.00 with at most two
  decimal places (e.g. $312.50, which pays the connector $250.00 and the platform
  $62.50). A third decimal is rejected on both the form and the API. The same rule
  applies to the Success Fee; salary and all day counts remain whole numbers.
- Every change is recorded with old value, new value, recomputed snapshot, and who
  changed it.

## Post-hire fee change → connector payout top-up

Covers editing the fee **after a candidate is hired but before the connector is
paid**. The connector payout amount is snapshotted at hire (from the flat fee),
and the release step reads that snapshot — so without this, a later fee change
never reaches an already-hired candidate's connector.

### Behaviour
- **Pay the latest fee at release.** When a connector payout is released, its
  amount is recomputed from the **current** Flat Referral Fee and re-synced in
  **both directions**:
  - **Fee raised** → the requester is charged the difference (a top-up) **first**;
    only if that charge succeeds is the connector paid, at the higher fee.
  - **Fee lowered** → the connector is paid the **lower** current amount; the
    requester is **not** refunded.
- **Top-up basis = full total** (base fee + additional processing costs), so the
  total collected for the candidate equals the latest total. The connector's own
  payout still scales on the base fee (the additional costs are platform revenue).
- **Per candidate, vs their own hire fee.** Each candidate is reconciled from the
  fee **they** were hired at (the payout's snapshot) to the current fee — correct
  even when different candidates were hired at different fees.
- **Charged at release, not at edit.** Editing only recomputes pricing; the top-up
  is collected lazily when the payout is actually released.
- **Collect first, then release — release never charges.** The Pay step
  (`POST /payout/:candidateId/fund`) is the only thing that takes money.
  `POST /payout/:candidateId/release` **asserts** the payout is fully funded and
  returns `409` if anything is owed; it never charges. A failed charge leaves the
  payout **pending** and the recruiter can retry. The connector is never paid
  without the top-up funded. Retries never double-charge (idempotent).
- **Collected as its own step (Pay → Send).** Because one action moved money in
  two directions, a declined card read to the requester as a *failed payout*. The
  release is now **two steps in one dialog**: **Pay** collects the top-up and
  sends nothing; **Send** releases the payout. The Pay step appears only when a
  top-up is actually owed — with none owed the dialog is unchanged and single-step.
  A decline keeps the dialog on the Pay step and says plainly that nothing was
  sent. The collected top-up is durable, so reopening resumes on the Send step.
- **Only actionable payouts.** A payout already queued / processing / completed is
  frozen and never re-priced or re-charged.

### Confirmations
- **On edit (raising the fee):** a generic warning — no live figures, a sample
  illustration only — noting that already-hired-but-unpaid candidates may incur an
  extra charge later, collected at release.
- **On release:** the **Pay** step shows the **actual** top-up amount, the card it
  will be charged to, and that nothing is sent until the payment goes through.
  The displayed amount is display-only; the charge is recomputed server-side and
  never trusted from the client. The old single confirm-and-release dialog
  ("Charge $X & Release") is superseded by this step.
- **Not retained:** the decision is taken on the Pay step, so choosing *not
  retained* cancels with **no charge at all** — money is never collected for a
  payout that will not be sent. Changing that decision *after* paying is still
  allowed, with an explicit warning that the collected amount is not refunded.

### Money source of truth
Amounts are computed server-side from the stored price row and the payout's own
snapshot via the existing fee calculator. No fee/total/top-up value is accepted
from the client. A new immutable top-up transaction type records the charge; one
top-up per candidate.

That transaction row is also the **only** signal that the Pay step has completed:
the payout row's fee snapshot is not re-synced until the payout is released, so
the read endpoint reports the top-up as still owed unless it checks for the row.
Both the read endpoint and the charge path share one lookup for it.

### Two endpoints, one collected charge
| Endpoint | Does |
|---|---|
| `POST /recruitment/payout/:candidateId/fund` | Pay step. Collects the top-up only. Refuses when nothing is owed, the payout isn't releasable yet, the connector is unclassified, or it is classified internal + inactive (it will be cancelled, not paid). |
| `POST /recruitment/payout/:candidateId/release` | Send step. **Unchanged** — still calls the top-up service, which is idempotent and no-ops once funded, so it remains a correct atomic charge-then-release for any caller that skips the Pay step. |

### Repeated top-ups — per-candidate high-water-mark (delivered)

The fee can be raised **any number of times** between hire and release, and each
raise collects only its own delta. Funding is tracked at the **fee level**:

```
fundedTotal = total(fee snapshotted at hire) + Σ(captured flat_topup)
owed        = max(0, total(currentFee) − fundedTotal)
```

The hire snapshot is `recruitment_payout_history.gross_amount`. Working at the fee
level rather than summing cash keeps the legacy job-scoped `flat_deposit` out of
the arithmetic entirely — at hire the requester *owed* `total(feeAtHire)` whether
or not a previously-collected deposit covered part of the cash, so the candidate
is funded to that fee level either way, and the deposit can never be credited to
the wrong candidate.

Consequences:
- A second raise reopens the dialog at **Step 1** with its own delta, then returns
  to Step 2. Releasing is blocked until it is paid.
- Lowering the fee clamps `owed` to 0; the connector is paid the lower current
  amount and there is still **no refund**.
- The Stripe idempotency key is `…-<candidateId>-<targetTotalCents>`, so retrying
  one raise replays a single PaymentIntent while a later raise is a distinct key.
- `uniq_interview_txn_candidate_type` no longer applies to `flat_topup` /
  `success_fee_topup`; a unique partial index on `intent_id` is the double-charge
  guard in its place. `interview_cost` / `success_fee` keep one-per-candidate.
- The payout worker re-checks `funded ≥ total(payout gross)` immediately before
  transferring and quarantines to `manual_review` rather than paying out
  under-funded money.

**Historical note:** before this, release set the payout to the latest fee while
`chargeTopUpIfNeeded` silently refused to collect a second delta (and its return
value was never inspected), so connectors could be paid at a fee the platform had
not fully collected. Already-released payouts were not reconciled.

## Out of Scope (Phase 2 / later)
- ~~Editable Success Fees.~~ **Delivered** — see `editable-success-fee.md`.
- Refunds when lowering the fee.
- ~~Repeated/staged top-ups (high-water-mark).~~ **Delivered** — see above.
- Connector/candidate notifications on a fee change.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-27 | Initial documentation (Phase 1) | jitendra_officebeacon |
| 1.1 | 2026-07-30 | Post-hire fee change → connector payout top-up at release | jitendra_officebeacon |
| 1.2 | 2026-08-01 | Success Fees now editable (Phase 2) — see editable-success-fee.md | jitendra_officebeacon |
| 1.3 | 2026-08-20 | Fee amounts accept two decimal places (cents) | jitendra_officebeacon |
| 1.4 | 2026-09-02 | Per Interview Cost Model removed — the "flat model only" edit guard is gone; every open job's referral fee is editable. | Claude |
| 1.6 | 2026-09-10 | **Repeated top-ups delivered (high-water-mark).** A fee raised more than once before release now collects each delta: `owed = total(currentFee) − (total(fee@hire) + Σ top-ups)`. `computeTopUp` takes `candidateId` and nets off `sumCapturedTopUps`; both top-up services drop their existence early-return and key Stripe per target fee level; `getFundedTopUp` → `getFundedTopUpSummary` (sums captured rows, latest `paidAt`). **Release no longer charges** — it throws `409` when anything is owed and the dialog bounces to the Pay step. The worker verifies `funded ≥ total(gross)` before transferring (and now includes `flat_topup`, previously absent from its funding types), crediting the job's legacy deposit so it cannot false-positive. `candidates-detail` sums top-ups instead of reading one. Schema: `uniq_interview_txn_candidate_type` excludes the two top-up types, new `uniq_interview_txn_intent_id`. | Claude |
| 1.5 | 2026-09-09 | **Release split into Pay → Send.** The top-up charge is collected by a new `POST /payout/:candidateId/fund` step instead of inside the release request, so a declined card reports a declined card rather than a failed payout. `/release` is unchanged (its top-up call is idempotent and no-ops once funded). The read endpoint is now funded-aware (new shared `getFundedTopUp` lookup) and returns `connectorTopUpFunded` / `candidateTopUpFunded`, which is what lets a reopened dialog resume on the Send step. Top-up previews were widened to recoverable `failed` rows so a retry's charge is no longer invisible. The old "Charge $X & Release" confirmation is removed — the Pay step replaces it. Kanban cards show an amber "Payment collected — payout not sent yet" badge while funded-but-unreleased. No migration. | Claude |
