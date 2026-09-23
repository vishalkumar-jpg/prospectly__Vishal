/**
 * Canonical allowed stage IDs for pipeline filter configuration.
 * Used to validate user-provided filter stages before persisting.
 *
 * - Requester/Connector (Introduction Requests): introduction_requests status values
 * - Recruiter: recruitment pipeline stages (job candidates)
 * - My Pipeline: recruitment connector stages (connector's view of candidates)
 */

export const REQUESTER_PIPELINE_FILTER_STAGES = [
  "pending",
  "accepted",
  "declined",
  "awaiting_connector",
  "awaiting_intro",
  "request_accepted",
  "intro_sent",
  "meeting_scheduled",
  "meeting_booked",
  "meeting_rescheduled",
  "meeting_completed",
  "peer_feedback",
  "completed",
  "email_failed",
] as const;

/** Introduction Requests connector pipeline: same stages as requester (intro_sent, meeting_booked, etc.) */
export const CONNECTOR_PIPELINE_FILTER_STAGES =
  REQUESTER_PIPELINE_FILTER_STAGES;

export const RECRUITER_PIPELINE_FILTER_STAGES = [
  "not_qualified",
  "in_review",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
] as const;

/** Refer-candidate per-job board columns (pool + referred lifecycle). */
export const MY_PIPELINE_FILTER_STAGES = [
  "ai_analysis",
  "qualified",
  "not_qualified",
  "consent_pending",
  "consent_accepted",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "consent_declined",
  "rejected",
  "connector_declined",
] as const;
