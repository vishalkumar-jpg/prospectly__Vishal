// Roles stored on recruitment_candidate_connectors.role
export const CANDIDATE_CONNECTOR_ROLE = {
  PRIMARY: "primary",
  SHARER: "sharer",
  CLAIMER: "claimer",
} as const;

export type CandidateConnectorRole =
  (typeof CANDIDATE_CONNECTOR_ROLE)[keyof typeof CANDIDATE_CONNECTOR_ROLE];

/**
 * Connector identity is withheld from recruiters during the early evaluation
 * stages — a candidate should first be evaluated on merit, not on who referred
 * them. Once the candidate reaches the interview phase (or a terminal stage) the
 * recruiter is allowed to see who referred them:
 *
 *  - `interview_completed` — the Move-to-Hired dialog, where each connector is
 *    classified internal/external. Classification is submitted in the *same*
 *    request that flips the stage to `hired`. Classification/payout surfaces only.
 *  - candidate detail view — connectors are revealed from `interview_invite_sent`
 *    onward, and on the `rejected` terminal stage (see CONNECTOR_VISIBLE_STAGES).
 *
 * At every earlier stage the API returns an empty connector list and a null
 * referrer, so there is nothing for the UI to leak.
 */
const CLASSIFICATION_STAGE = "interview_completed";
const HIRED_STAGE = "hired";

/**
 * Stages at which the recruiter-facing candidate detail view may include
 * connector identity. Starts at `interview_invite_sent` (the recruiter has
 * committed to interviewing the candidate) and covers the two terminal stages.
 */
const CONNECTOR_VISIBLE_STAGES = new Set([
  "interview_invite_sent",
  "interview_scheduled",
  CLASSIFICATION_STAGE,
  HIRED_STAGE,
  "rejected",
]);

/**
 * Whether the recruiter-facing candidate detail view may include connector
 * identity.
 */
export const isConnectorVisibleToRecruiter = (
  stageKey: string | null
): boolean => stageKey !== null && CONNECTOR_VISIBLE_STAGES.has(stageKey);

/**
 * Whether the classification/payout surface may include connector identity.
 * Wider than the detail view by one stage because the Move-to-Hired dialog opens
 * while the candidate is still `interview_completed`.
 */
export const isConnectorClassificationStage = (
  stageKey: string | null
): boolean => stageKey === CLASSIFICATION_STAGE || stageKey === HIRED_STAGE;
