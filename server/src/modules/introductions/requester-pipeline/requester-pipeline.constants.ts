/**
 * Constants for Requester Pipeline module
 */

export const PIPELINE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "intro_sent",
  "meeting_scheduled",
  "meeting_booked",
  "meeting_rescheduled",
  "meeting_completed",
  "peer_feedback",
] as const;
