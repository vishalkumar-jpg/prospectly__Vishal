import { INCLUDED_CONNECTOR_REFERRED_STAGES } from "../job-pool-matches/job-pool-matches.constants";

export const CONNECTOR_PIPELINE_MESSAGES = {
  SUCCESS: {
    PIPELINE_FETCHED: "Connector pipeline fetched successfully",
  },
  ERROR: {
    FETCH_FAILED: "Failed to fetch connector pipeline",
  },
};

/**
 * Maps candidate stage keys from the recruiter pipeline
 * to the connector-visible stage keys.
 * `in_review` in recruiter pipeline = `consent_accepted` for connector.
 */
export const CONNECTOR_STAGE_MAP: Record<string, string> = {
  // Share-link apply starts in processing; show on AI Analysis until scored.
  processing: "ai_analysis",
  in_review: "consent_accepted",
  shortlisted: "shortlisted",
  interview_invite_sent: "interview_invite_sent",
  interview_scheduled: "interview_scheduled",
  interview_completed: "interview_completed",
  hired: "hired",
  rejected: "rejected",
};

/** @see INCLUDED_CONNECTOR_REFERRED_STAGES — single source of truth. */
export const INCLUDED_CANDIDATE_STAGES = INCLUDED_CONNECTOR_REFERRED_STAGES;
