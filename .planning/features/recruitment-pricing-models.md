# Feature: Recruitment Pricing Model (Flat Referral)

**Version:** 2.0.0 (Per Interview Cost Model removed)
**Status:** Active
**Last Updated:** 2026-09-02

## Overview

The "Post a Job" wizard's **Budget & Pricing Model** step has a single pricing model:

- **Flat Referral Model** — the recruiter enters one flat referral fee. The platform grosses it up to a **total** = `flatFee + Stripe fee + application fee`, charged in full when a candidate is moved to Hired. Nothing is charged at publish or at shortlist.

The salary range is still collected on this step, but it is **informational job data only** — it is shown on the marketplace, the public job page and job cards, and no longer drives any fee calculation.

See `recruitment-flat-referral-payment.md` for the full charge lifecycle, use cases, and flow chart.

## Removed: Per Interview Cost Model

The **Per Interview Cost Model** — a salary-tier lookup that produced a suggested per-candidate interview
cost, authorized at shortlist and captured at interview booking — has been removed end to end (server,
client, and candidate pipeline). Its picker had already been disabled and every job was created as
`flat_referral`; the dormant code paths are now gone.

What was removed: `PerInterviewFeeService`, `GET /recruitment/interview-cost/calculate`, the
`useInterviewCost` client hook, the wizard's Interview Cost card/editor/breakdown, the salary
yearly-equivalent hint (which that endpoint fed), and the `!isFlatReferral` charge/capture/payout
branches in shortlist, booking-confirm and hire.

What was intentionally **kept**:
- `recruitment_job_prices.pricing_model` — the column still exists and still carries the legacy DB
  default `'per_interview'`. There is no migration. `RecruitmentJobsCreateService` therefore writes the
  literal `"flat_referral"` explicitly on every price-row insert. **Do not remove that write.**
- `recruitment_bounty_tiers` (schema + seeder) — left in place and now inert; nothing reads it.
- `recruitment_interview_transactions` and its `interview_cost` transaction type — despite the name,
  flat hire charges write `interview_cost` rows, and the table's unique indexes are the live
  double-charge protection.
- `bounty_amount` / `provider_fee` / `processing_fee` / `total_amount` on `recruitment_job_prices` —
  the flat model mirrors its own figures into these columns for downstream consumers.

## Fee formula
```
stripeFee + applicationFee = calculateShortlistFees(flatFee)   // gross-up (2.9% + $0.30, flat $0.25 app fee)
total                      = flatFee + stripeFee + applicationFee
```
Example: flat $100 → stripe $3.30, app $0.25, **total $103.55**.

> **When the fee is charged:** not at publish and not at shortlist. The full total is captured at
> shortlist** of the job; the remaining/full referral fee is charged at **Move to Hired**.

## Security
All fee values are **computed server-side**. The job-create DTO accepts only `flatReferralAmount`; the Stripe/application/total figures are recomputed at creation via the shared service — a crafted payload cannot bypass the fees (the global `forbidNonWhitelisted` rejects extra fields). The client live-preview values are display-only.

## Data model
`recruitment_job_prices` holds: `pricing_model` (legacy column, always written `flat_referral`), `flat_referral_amount`. The `flat_deposit_fee_percent` / `flat_deposit_amount` columns are legacy — retained for historical rows but no longer written (new jobs store `NULL`). The `provider_fee` / `processing_fee` / `total_amount` columns hold the flat Stripe / application / total. The flat fee is editable after publish on open jobs (see `editable-flat-referral-fee.md`).

## Key code
- **Server fee logic (single source of truth):** `FlatReferralFeeService.calculateFlatReferralFee()` in `server/src/modules/recruitment/interview-cost/services/flat-referral-fee.service.ts`; endpoint `GET /recruitment/interview-cost/flat-referral/calculate?flatFee=N`. Reuses `calculateShortlistFees()` and reads `NameSlug.FlatFeesPercentages`. (The module directory and route prefix keep the historical `interview-cost` name.)
- **Job creation / update pricing:** `RecruitmentJobPricingService.resolvePricingFields()` in `server/src/modules/recruitment/jobs/services/recruitment-job-pricing.service.ts`.
- **Client:** `useFlatReferralFee` hook; `BudgetStep` salary card + flat-fee card; `ConfirmStep` flat breakdown.

## Out of scope
- Dropping the now-unused `pricing_model` column and the inert `recruitment_bounty_tiers` table (would need a migration).
- Per-interview wording that still appears in some UI copy on flat jobs — "Per Candidate:" on job cards, the PaymentStep charge line, the "Interview Cost" label in Requester Spending, and the quick-start tour demo copy.
