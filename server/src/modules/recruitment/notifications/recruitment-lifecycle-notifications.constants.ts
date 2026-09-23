export const RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES = {
  RECRUITER_NEW_CANDIDATE: "recruiter_new_candidate",
  SHORTLISTED_CANDIDATE: "shortlisted_candidate",
  SHORTLISTED_CONNECTOR: "shortlisted_connector",
  INTERVIEW_INVITE_SENT_CONNECTOR: "interview_invite_sent_connector",
  INTERVIEW_SCHEDULED_CONNECTOR: "interview_scheduled_connector",
  INTERVIEW_COMPLETED_CONNECTOR: "interview_completed_connector",
  HIRED_CANDIDATE: "hired_candidate",
  HIRED_CONNECTOR: "hired_connector",
  REJECTED_CANDIDATE: "rejected_candidate",
  REJECTED_PARTNER: "rejected_partner",
  PAYOUT_SETUP: "payout_setup",
  PAYOUT_RELEASED: "payout_released",
} as const;

export type RecruitmentLifecycleNotificationType =
  (typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES)[keyof typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES];

/** Connector-only stage progress notifications (invite / scheduled / completed). */
export const CONNECTOR_STAGE_PROGRESS_NOTIFICATION_TYPES = [
  RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_INVITE_SENT_CONNECTOR,
  RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_SCHEDULED_CONNECTOR,
  RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_COMPLETED_CONNECTOR,
] as const;

export type ConnectorStageProgressNotificationType =
  (typeof CONNECTOR_STAGE_PROGRESS_NOTIFICATION_TYPES)[number];

export type LifecycleJobSentBy = {
  /** User who triggered the workflow action (falls back to job requester). */
  sentByUserId?: string;
};

export type RecruiterNewCandidateLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.RECRUITER_NEW_CANDIDATE;
  candidateId: string;
} & LifecycleJobSentBy;

export type ShortlistedCandidateLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CANDIDATE;
  candidateId: string;
} & LifecycleJobSentBy;

export type ShortlistedConnectorLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CONNECTOR;
  candidateId: string;
  recipientId: string;
} & LifecycleJobSentBy;

export type ConnectorStageProgressLifecycleJobData = {
  type: ConnectorStageProgressNotificationType;
  candidateId: string;
  recipientId: string;
} & LifecycleJobSentBy;

export type HiredCandidateLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CANDIDATE;
  candidateId: string;
} & LifecycleJobSentBy;

export type HiredConnectorLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CONNECTOR;
  candidateId: string;
  recipientId: string;
} & LifecycleJobSentBy;

export type RejectedCandidateLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_CANDIDATE;
  candidateId: string;
  rejectionEventId: string;
  rejectionCategory: string;
  rejectionNote: string;
} & LifecycleJobSentBy;

export type RejectedPartnerLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_PARTNER;
  candidateId: string;
  recipientId: string;
  isConnector: boolean;
  rejectionEventId: string;
  rejectionCategory: string;
  rejectionNote: string;
} & LifecycleJobSentBy;

export type PayoutSetupLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_SETUP;
  payoutId: string;
  recipientId: string;
} & LifecycleJobSentBy;

export type PayoutReleasedLifecycleJobData = {
  type: typeof RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_RELEASED;
  payoutId: string;
  recipientId: string;
  releasedAt: string;
} & LifecycleJobSentBy;

export type RecruitmentLifecycleJobData =
  | RecruiterNewCandidateLifecycleJobData
  | ShortlistedCandidateLifecycleJobData
  | ShortlistedConnectorLifecycleJobData
  | ConnectorStageProgressLifecycleJobData
  | HiredCandidateLifecycleJobData
  | HiredConnectorLifecycleJobData
  | RejectedCandidateLifecycleJobData
  | RejectedPartnerLifecycleJobData
  | PayoutSetupLifecycleJobData
  | PayoutReleasedLifecycleJobData;

export const buildLifecycleJobId = (
  data: RecruitmentLifecycleJobData
): string => {
  switch (data.type) {
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.RECRUITER_NEW_CANDIDATE:
      return `recruit-lifecycle-${data.candidateId}-recruiter_new_candidate`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CANDIDATE:
      return `recruit-lifecycle-${data.candidateId}-shortlisted-candidate`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CONNECTOR:
      return `recruit-lifecycle-${data.candidateId}-shortlisted-connector-${data.recipientId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_INVITE_SENT_CONNECTOR:
      return `recruit-lifecycle-${data.candidateId}-interview_invite_sent-connector-${data.recipientId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_SCHEDULED_CONNECTOR:
      return `recruit-lifecycle-${data.candidateId}-interview_scheduled-connector-${data.recipientId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_COMPLETED_CONNECTOR:
      return `recruit-lifecycle-${data.candidateId}-interview_completed-connector-${data.recipientId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CANDIDATE:
      return `recruit-lifecycle-${data.candidateId}-hired-candidate`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CONNECTOR:
      return `recruit-lifecycle-${data.candidateId}-hired-connector-${data.recipientId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_CANDIDATE:
      // Unique per reject event so reinstate + re-reject and concurrent dispatches
      // do not collide with completed jobs retained by BullMQ (removeOnComplete).
      return `recruit-lifecycle-${data.candidateId}-rejected-candidate-${data.rejectionEventId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_PARTNER:
      return `recruit-lifecycle-${data.candidateId}-rejected-partner-${data.recipientId}-${data.rejectionEventId}`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_SETUP:
      return `recruit-lifecycle-payout-${data.payoutId}-onboarding_setup`;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_RELEASED:
      return `recruit-lifecycle-payout-${data.payoutId}-released`;
    default: {
      const _exhaustive: never = data;
      throw new Error(`Unknown lifecycle notification type: ${_exhaustive}`);
    }
  }
};
