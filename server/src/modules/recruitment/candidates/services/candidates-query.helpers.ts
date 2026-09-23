/** Stages where candidate identity is revealed (interview path only) */
export const REVEALED_STAGES = new Set([
  "interview_scheduled",
  "interview_completed",
  "hired",
]);

/**
 * Stages where the AI summary should have PII redacted unless the caller can view
 * details. `not_qualified` is treated as an equivalent pre-review tier to
 * `in_review` (masked by default; revealed under early candidate-details access).
 */
export const HIDDEN_DETAIL_STAGES = [
  "processing",
  "in_review",
  "not_qualified",
] as const;

/**
 * Pre-reveal recruiter stages where the candidate's full details (identity,
 * resume, un-redacted AI summary) become visible when an organisation has early
 * candidate-details access enabled (i.e. "from In Review onward"). `not_qualified`
 * is included as an equivalent tier to `in_review`. `processing` is intentionally
 * excluded, and `interview_scheduled`+ are already covered by REVEALED_STAGES.
 */
export const EARLY_ACCESS_STAGES = [
  "not_qualified",
  "in_review",
  "shortlisted",
  "interview_invite_sent",
] as const;

/**
 * Stages whose presence in a candidate's stage history means they were reviewed
 * (i.e. reached `in_review` or beyond) before any rejection. Every non-`processing`,
 * non-`rejected` stage. Used to reveal a rejected candidate's details early only
 * when they were actually reviewed — a candidate rejected straight from
 * `processing` was never reviewed and stays hidden.
 */
export const REVIEW_REACHED_STAGES = [
  ...EARLY_ACCESS_STAGES,
  "interview_scheduled",
  "interview_completed",
  "hired",
] as const;

/**
 * Whether the recruiter may view the candidate's full details (identity, resume,
 * un-redacted AI summary). Always allowed once the candidate is revealed
 * (interview path); additionally allowed from the `in_review` stage onward when
 * the organisation has early candidate-details access enabled.
 *
 * For a `rejected` candidate — whose current stage no longer reflects how far
 * they got — the pre-rejection tier (from stage history) decides:
 *  - `reachedRevealedStage`: they reached the interview path
 *    (`interview_scheduled`+) before rejection and were therefore already
 *    revealed → reveal regardless of the early-access flag.
 *  - `reachedReviewStage`: they reached the `in_review` tier before rejection →
 *    reveal only when the organisation has early candidate-details access.
 * A candidate rejected straight from `processing` matches neither → stays hidden.
 */
export const canViewCandidateDetails = (
  stageKey: string | null,
  isRevealed: boolean,
  earlyCandidateDetailsAccess: boolean,
  reachedReviewStage = false,
  reachedRevealedStage = false
): boolean =>
  isRevealed ||
  (earlyCandidateDetailsAccess &&
    !!stageKey &&
    (EARLY_ACCESS_STAGES as readonly string[]).includes(stageKey)) ||
  (stageKey === "rejected" && reachedRevealedStage) ||
  (earlyCandidateDetailsAccess &&
    stageKey === "rejected" &&
    reachedReviewStage);

/** Recruiter-visible pipeline stages in order */
export const RECRUITER_PIPELINE = [
  { key: "in_review", label: "In Review" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_invite_sent", label: "Interview Invite Sent" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "interview_completed", label: "Interview Completed" },
] as const;

/** Preserves 0 years (numeric 0 is falsy in JS if using truthy checks). */
export function yearsExpFromDbColumn(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function currentCompanyFromResumeMetadata(
  metadata: unknown
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as {
    currentEmployer?: unknown;
    jobHistory?: unknown;
  };

  if (typeof meta.currentEmployer === "string") {
    const trimmed = meta.currentEmployer.trim();
    if (trimmed) return trimmed;
  }

  if (!Array.isArray(meta.jobHistory)) return null;
  for (const entry of meta.jobHistory) {
    if (!entry || typeof entry !== "object") continue;
    const job = entry as { isCurrent?: unknown; company?: unknown };
    const isCurrent = job.isCurrent === true || job.isCurrent === "true";
    if (isCurrent && typeof job.company === "string") {
      const trimmed = job.company.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

export function locationFromResumeMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const { location } = metadata as { location?: unknown };
  if (typeof location !== "string") return null;
  const trimmed = location.trim();
  return trimmed || null;
}

export function formatExperienceSummary(
  totalYearsExp: unknown
): string | undefined {
  const years = yearsExpFromDbColumn(totalYearsExp);
  if (years == null) return undefined;
  const rounded = Number.isInteger(years)
    ? years
    : parseFloat(years.toFixed(1));
  return `${rounded} ${rounded === 1 ? "year" : "years"}`;
}
