# Recruitment — Reinstating a Rejected Candidate

Lets a recruiter move a **rejected** candidate back to a stage they previously
held ("Move Back to Stage"), instead of losing them permanently.

Status: implemented (BE + FE). Research: `.planning/mockups/Reinstate-Money-Impact-Research-v2.pdf`.

---

## 1. Money — nothing changes

**No payment file was touched, and none needs to be.** Reinstating performs no
Stripe call, writes no `recruitment_interview_transactions` row, and triggers
neither a charge nor a refund.

This holds because both charge points key off **job-level captured rows**, never
off a candidate's stage:

| Charge | Fires at | Amount rule | Source |
|---|---|---|---|
| *(none)* | Shortlist | Shortlisting is free — no Stripe call, no transaction row | — |
| `interview_cost` (the "100%") | Move to Hired | `isFirstToSchedule ? max(0, total − capturedDeposit) : total`, where `isFirstToSchedule` = "this **job** has no captured `interview_cost` row yet". `capturedDeposit` is **0** except on legacy jobs that captured a `flat_deposit` before the shortlist deposit was removed | `interview-booking-flat-charge.service.ts`, called from `candidate-workflow-hire.service.ts` |

So a reinstated candidate falls into the correct bucket on its own:

- rejected before any hire → reinstated → hired first ⇒ pays `total` (or `total − deposit` on a legacy job)
- rejected, someone else hired first → reinstated → hired ⇒ pays the full `total`
- reinstated any number of times ⇒ `$0` each time

**Known, pre-existing behaviour to keep in mind:** the hire charge reads
`recruitment_job_prices.totalAmount` **live**. A candidate rejected when the fee
was $1,000 and reinstated after the fee rose to $1,500 is charged $1,500 at
hire. This is how the fee has always worked (latest-at-hire) and is not specific
to reinstate — the dialog discloses it rather than changing it.

---

## 2. The safety rule

The dropdown is **server-derived**, from the candidate's own
`recruitment_candidate_stage_history`:

1. Read the candidate's stage history, keep only reinstate-eligible pipeline
   stages: `in_review → shortlisted → interview_invite_sent →
   interview_scheduled → interview_completed`.
2. `rejectedFromStageKey` = the most recent of those.
3. Offer that stage **and every earlier one the candidate actually reached**.
   A stage the candidate never occupied is never offered. `hired` is never
   offered.
4. Disable `interview_scheduled` only when no live interview meeting row
   exists (a data anomaly — `markOutcome` would throw "Interview meeting not
   found"), with the reason shown.

Why each rule exists:

- **Rule 3 protects money.** `createPayoutRecord` needs an interview meeting
  row and, when it can't find one, only logs and returns — it does not throw
  (`recruitment-payout-create.service.ts`). If a candidate who never had a
  meeting could be dropped into `interview_completed`, Move to Hired would
  capture the full referral fee and then silently create no payout row.
  Because `interview_completed` is only ever written by `markOutcome` (which
  requires a meeting), history-derived options make that unreachable.
- **Rule 4 prevents a dead end.** `markOutcome` needs the meeting row; without
  one the candidate could never leave `interview_scheduled`.

A candidate auto-rejected by a **no-show / cancelled** outcome *is* allowed back
to every stage they reached. The recorded outcome would otherwise make
`markOutcome` throw `"Interview outcome already marked"` forever, so the
reinstate transaction clears it — see §5.1.

The write path **re-derives the list and re-validates** the requested target.
The client dropdown is convenience only; the service is the boundary.

---

## 3. API

| Method | Route | Permission |
|---|---|---|
| `GET` | `/recruitment/candidate-workflow/:candidateId/reinstate-options` | `candidate.reject` |
| `PATCH` | `/recruitment/candidate-workflow/:candidateId/reinstate` | `candidate.reject` |

`candidate.reject` is reused deliberately: reinstate is the inverse of reject
and belongs to the same actor. A new permission string would require seeding
admin-managed `role_permission` master data, which would deny every existing
collaborator until that seed ran.

**Options response**

```jsonc
{
  "candidateId": "…",
  "currentStageKey": "rejected",
  "rejectedFromStageKey": "shortlisted",
  "options": [
    { "stageKey": "in_review",   "label": "In Review",   "available": true,  "unavailableReason": null },
    { "stageKey": "shortlisted", "label": "Shortlisted", "available": true,  "unavailableReason": null }
  ]
}
```

Returns `options: []` (not an error) when the candidate is not rejected, so the
endpoint is safe to call from any card.

**Reinstate body:** `{ targetStageKey }`. No reason/note is collected — unlike
Reject, moving a candidate back is non-destructive and costs nothing, so the
extra friction was not justified. The audit trail is still written to
`recruitment_candidate_stage_history` with the target stage and the acting user.

---

## 4. Validation

**Server** (`candidate-workflow-reinstate.service.ts`)

1. Candidate exists and is not soft-deleted → else 404.
2. Current stage is `rejected` → else 400 `NOT_REJECTED`.
3. Job status is **not** required to be `active` — same as shortlist / hire /
   reject on closed jobs. Move Back stays available so a mis-reject can be
   undone without reopening the job first.
4. `targetStageKey` is in the freshly re-derived option list → else 400.
5. The matched option is `available` → else 400 with its reason.

**DTO** (`ReinstateCandidateDto`) — `targetStageKey` is
`@IsIn(REINSTATE_STAGE_KEYS)`. Shape validation only; membership in a *specific
candidate's* allow-list is the service's job.

**Client** (`ReinstateDialog.tsx`) — stage required, confirm disabled until one
is picked. Choosing `interview_invite_sent` stacks a Resend confirmation
`AlertDialog` (token is cleared on reinstate). `interview_scheduled` submits
immediately — the meeting is kept and outcomes are cleared so Mark Outcome
works again; Reschedule stays optional on the card. Unavailable options render
disabled with their reason; loading / empty / error states handled, with retry
on load failure and server errors inline without closing the dialog.

---

## 5. Transaction

One `db.transaction`:

1. `recruitment_job_candidates` → `stageId`, `stageUpdatedAt`.
2. `recruitment_candidate_workflow` → clear `rejectedAt`, `rejectionCategory`,
   `rejectionNote`. Without this the candidate reads "Rejected" on every
   workflow-derived surface while the board shows them as active.
   `requesterShortlisted` / `requesterShortlistedAt` are left alone on purpose —
   they record that the shortlist genuinely happened, and the shortlist service
   keys off `stageId`, not this flag.
3. Interview state reset — see §5.1.
4. `recruitment_candidate_stage_history` → audit row
   `"Moved back to {stage} from Rejected"`. Written to the same table
   the option list reads from, so a later reinstate still sees truthful history.

### 5.1 Interview state reset (`resetInterviewState`)

Reinstate is the first flow that moves a candidate **backwards**, which exposes
two problems nothing else could hit:

1. `markOutcome` refuses a second call on the same meeting. A no-show/cancelled
   candidate could re-interview but never reach Interview Completed, and so
   never be hired.
2. `recruitment_interview_meetings.candidate_id` is a **plain index, not
   unique**. Sending a fresh invite from Shortlisted takes the INSERT branch of
   the invite service, so a candidate returned to Shortlisted with a surviving
   meeting row would end up with **two** meeting rows — and every consumer reads
   one with `.limit(1)` and no ordering.

By target stage:

| Target | Meeting row | Booking token |
|---|---|---|
| `interview_completed` | untouched (the recorded outcome is still true) | untouched |
| `interview_scheduled` | outcome fields cleared; row kept so the recruiter can simply re-mark it | untouched (already null after booking) |
| `interview_invite_sent` | outcome cleared **and** reset to a pristine invite (`status='invite_sent'`, date/link/calendar ids nulled), mirroring the reschedule path | **cleared** |
| `shortlisted` / `in_review` | **soft-deleted** — the interview cycle is void; the next invite creates a clean row | **cleared** |

Clearing the booking token also means the candidate's old interview link stops
working the moment they are moved back; **Resend** mints a fresh token and link.

> Note: reject itself still leaves the booking token alive, so a *rejected*
> candidate can currently book through their old link. That is pre-existing and
> outside this feature's diff — see §7.

---

## 6. Files

**New**
- `server/src/modules/recruitment/candidate-workflow/candidate-workflow-reinstate.constants.ts`
- `server/src/modules/recruitment/candidate-workflow/services/candidate-workflow-reinstate.service.ts`
- `client/src/hooks/useReinstateCandidate.ts`
- `client/src/pages/recruitment/job-kanban/ReinstateDialog.tsx`

**Modified (additive only)**
- `candidate-workflow.controller.ts` — two new routes
- `candidate-workflow.dto.ts` — `ReinstateCandidateDto`
- `candidate-workflow.module.ts`, `services/index.ts` — registration
- `client/src/lib/api/recruitment.ts` — types + two methods
- `KanbanCandidateCard.tsx` — `onReinstate` prop, button on rejected cards
- `JobDetailWithKanban.tsx` — dialog wiring

No existing service, charge path, schema, or migration was changed.

---

## 7. Known gaps (deliberately out of scope)

- **No notification.** The candidate and connector are not told they were
  brought back. Adding one needs a new lifecycle event plus a seeded email
  template (DB master data), which was kept out to avoid touching shipped
  notification data. Worth a follow-up.
- **Hired candidates cannot be reinstated.** Reversing a hire means refunding a
  captured charge and unwinding payouts.
- **Reject does not kill the booking link.** `rejectCandidate` leaves
  `interviewBookingToken` set and the meeting row at `status='invite_sent'`, and
  the booking flow validates only token + expiry + meeting status — never the
  candidate's stage. A rejected candidate can therefore still open their old
  invite email and book, which moves them from `rejected` straight to
  `interview_scheduled`. Pre-existing; reinstate clears the token on its own
  paths but cannot fix the reject path without touching that service. Fix is two
  lines in `candidate-workflow-reject.service.ts` plus a stage guard in
  `interview-booking-confirm.service.ts`.
- **Stale Reject dialog copy.** `RejectDialog.tsx` still tells the recruiter the
  "authorized payment will be automatically released" when rejecting from
  Shortlisted. Under `flat_referral` that is false — the one-time job deposit is
  captured and non-refundable. Not changed here because it is outside this
  feature's diff, but it should be corrected: it is the first thing HR will
  point at once "move back" ships.
