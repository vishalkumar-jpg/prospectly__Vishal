/**
 * Reinstate (move a rejected candidate back to an earlier stage) constants.
 *
 * Deliberately kept in its own file so the existing reject/shortlist/hire
 * constants are untouched by this feature.
 *
 * MONEY NOTE — read before changing anything here.
 * Reinstating is a pure STAGE move. It performs no Stripe call and creates no
 * `recruitment_interview_transactions` row. It is safe because the only charge
 * point keys off job-level captured rows, never off a candidate's stage:
 * shortlisting is free, and the `interview_cost` charge at Move to Hired
 * decides `total - capturedDeposit` vs `total` from whether the JOB already has
 * a captured interview_cost row (interview-booking-flat-charge.service.ts).
 * `capturedDeposit` is 0 except on legacy jobs that captured a deposit under
 * the removed shortlist-deposit model. So a reinstated candidate lands in the
 * correct bucket automatically and can neither be double-charged nor
 * double-credited.
 */

/**
 * The recruiter happy-path stages a rejected candidate may be moved back to,
 * in pipeline order. `hired` is intentionally absent — reversing a hire would
 * mean refunding a captured charge and unwinding payouts, which is out of
 * scope. Terminal/screening stages (`not_qualified`, consent/AI stages) are
 * absent because they are not recruiter-driven pipeline positions.
 */
export const REINSTATE_PIPELINE_STAGES = [
  { stageKey: "in_review", label: "In Review" },
  { stageKey: "shortlisted", label: "Shortlisted" },
  { stageKey: "interview_invite_sent", label: "Interview Invite Sent" },
  { stageKey: "interview_scheduled", label: "Interview Scheduled" },
  { stageKey: "interview_completed", label: "Interview Completed" },
] as const;

export type ReinstateStageKey =
  (typeof REINSTATE_PIPELINE_STAGES)[number]["stageKey"];

export const REINSTATE_STAGE_KEYS: readonly string[] =
  REINSTATE_PIPELINE_STAGES.map((s) => s.stageKey);

/** Pipeline order index for a reinstate-eligible stage; -1 when not eligible. */
export const reinstateStageOrder = (stageKey: string): number =>
  REINSTATE_STAGE_KEYS.indexOf(stageKey);

/**
 * Why an otherwise-reached stage cannot be selected. Surfaced to the recruiter
 * verbatim, so keep the copy human-readable.
 */
export const REINSTATE_UNAVAILABLE_REASON = {
  /**
   * Interview Scheduled is only meaningful while an interview meeting row
   * exists — `markOutcome` reads it and throws "Interview meeting not found"
   * without one, which would strand the candidate at that stage. Only reachable
   * as a data anomaly, but guarded rather than trusted.
   */
  MEETING_MISSING:
    "There is no interview meeting on record for this candidate, so this stage cannot be re-used. Move them back to Shortlisted and send a fresh interview invite.",
} as const;

/**
 * Pipeline index of `interview_invite_sent`. Reinstating to this stage or
 * earlier means the interview cycle is being re-run from scratch, so the stale
 * interview state is cleared. See CandidateWorkflowReinstateService.
 */
export const REINSTATE_INVITE_SENT_ORDER = REINSTATE_STAGE_KEYS.indexOf(
  "interview_invite_sent"
);

export const CANDIDATE_REINSTATE_MESSAGES = {
  ERROR: {
    CANDIDATE_NOT_FOUND: "Candidate not found",
    NOT_REJECTED: "Only a rejected candidate can be moved back to a stage",
    STAGE_NOT_ALLOWED:
      "This candidate cannot be moved back to the selected stage",
    NO_STAGES_AVAILABLE:
      "There is no earlier stage this candidate can be moved back to",
    STAGE_NOT_CONFIGURED: "The selected stage is not configured",
    REINSTATE_FAILED: "Failed to move the candidate back",
  },
  SUCCESS: {
    REINSTATED: "Candidate has been moved back successfully",
  },
} as const;
