import { Slug } from "modules/emails/emails.constants";
import type { CreateRecruitmentEmailLogInput } from "./recruitment-email-logs.service";
import type { RecruitmentEmailLogsService } from "./recruitment-email-logs.service";
import type {
  RecruitmentEmailLogType,
  RecruitmentEmailRecipientType,
} from "./recruitment-email-logs.constants";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "./recruitment-email-logs.constants";

export type RecruitmentEmailLogInput = {
  jobId: string;
  emailType: RecruitmentEmailLogType;
  recipientEmail: string;
  recipientType: RecruitmentEmailRecipientType;
  candidateId?: string | null;
  poolMatchId?: string | null;
  createdBy?: string | null;
  subject?: string | null;
  emailBody?: string | null;
};

/** @deprecated Use RecruitmentEmailLogInput */
export type PipelineEmailLogInput = RecruitmentEmailLogInput & {
  emailType: RecruitmentEmailLogType;
  recipientType: RecruitmentEmailRecipientType;
};

export function normalizeEmailLogInput(
  input: RecruitmentEmailLogInput & { providerId: string }
): CreateRecruitmentEmailLogInput {
  return {
    jobId: input.jobId,
    emailType: input.emailType,
    providerId: input.providerId,
    recipientEmail: input.recipientEmail,
    recipientType: input.recipientType,
    candidateId: input.candidateId ?? null,
    poolMatchId: input.poolMatchId ?? null,
    createdBy: input.createdBy ?? null,
    subject: input.subject ?? null,
    emailBody: input.emailBody ?? null,
  };
}

export const SLUG_TO_EMAIL_LOG_TYPE: Partial<
  Record<Slug, RecruitmentEmailLogType>
> = {
  [Slug.CandidateConsent]: RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT,
  [Slug.RecruitmentInterviewInvite]:
    RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_INVITE,
  [Slug.RecruitmentInterviewBookingError]:
    RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_BOOKING_ERROR,
  [Slug.RecruitmentRecruiterNewCandidate]:
    RECRUITMENT_EMAIL_LOG_TYPE.RECRUITER_NEW_CANDIDATE,
  [Slug.RecruitmentCandidateShortlisted]:
    RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_SHORTLISTED,
  [Slug.RecruitmentConnectorShortlisted]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_SHORTLISTED,
  [Slug.RecruitmentConnectorInterviewInviteSent]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_INVITE,
  [Slug.RecruitmentConnectorInterviewScheduled]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_SCHEDULED,
  [Slug.RecruitmentConnectorInterviewCompleted]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_COMPLETED,
  [Slug.RecruitmentCandidateHired]: RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_HIRED,
  [Slug.RecruitmentConnectorHired]: RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_HIRED,
  [Slug.RecruitmentCandidateRejected]:
    RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_REJECTED,
  [Slug.RecruitmentConnectorRejected]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_REJECTED,
  [Slug.RecruitmentCandidatePayoutSetup]:
    RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_SETUP,
  [Slug.RecruitmentConnectorPayoutSetup]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_SETUP,
  [Slug.RecruitmentCandidatePayoutReleased]:
    RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_RELEASED,
  [Slug.RecruitmentConnectorPayoutReleased]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_RELEASED,
  [Slug.RecruitmentCollaboratorAdded]:
    RECRUITMENT_EMAIL_LOG_TYPE.COLLABORATOR_ADDED,
  [Slug.RecruitmentCandidateInReviewStatus]:
    RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_IN_REVIEW_STATUS,
  [Slug.RecruitmentConnectorInReviewStatus]:
    RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_IN_REVIEW_STATUS,
  [Slug.RecruitmentJobClosedConnector]:
    RECRUITMENT_EMAIL_LOG_TYPE.JOB_CLOSED_CONNECTOR,
  [Slug.RecruitmentJobClosedCandidate]:
    RECRUITMENT_EMAIL_LOG_TYPE.JOB_CLOSED_CANDIDATE,
  [Slug.RecruitmentJobReopenedConnector]:
    RECRUITMENT_EMAIL_LOG_TYPE.JOB_REOPENED_CONNECTOR,
  [Slug.RecruitmentJobReopenedCandidate]:
    RECRUITMENT_EMAIL_LOG_TYPE.JOB_REOPENED_CANDIDATE,
};

export const SLUG_TO_RECIPIENT_TYPE: Partial<
  Record<Slug, RecruitmentEmailRecipientType>
> = {
  [Slug.CandidateConsent]: "candidate",
  [Slug.RecruitmentInterviewInvite]: "candidate",
  [Slug.RecruitmentInterviewBookingError]: "recruiter",
  [Slug.RecruitmentRecruiterNewCandidate]: "recruiter",
  [Slug.RecruitmentCandidateShortlisted]: "candidate",
  [Slug.RecruitmentConnectorShortlisted]: "connector",
  [Slug.RecruitmentConnectorInterviewInviteSent]: "connector",
  [Slug.RecruitmentConnectorInterviewScheduled]: "connector",
  [Slug.RecruitmentConnectorInterviewCompleted]: "connector",
  [Slug.RecruitmentCandidateHired]: "candidate",
  [Slug.RecruitmentConnectorHired]: "connector",
  [Slug.RecruitmentCandidateRejected]: "candidate",
  [Slug.RecruitmentConnectorRejected]: "connector",
  [Slug.RecruitmentCandidatePayoutSetup]: "candidate",
  [Slug.RecruitmentConnectorPayoutSetup]: "connector",
  [Slug.RecruitmentCandidatePayoutReleased]: "candidate",
  [Slug.RecruitmentConnectorPayoutReleased]: "connector",
  [Slug.RecruitmentCollaboratorAdded]: "recruiter",
  [Slug.RecruitmentCandidateInReviewStatus]: "candidate",
  [Slug.RecruitmentConnectorInReviewStatus]: "connector",
  [Slug.RecruitmentJobClosedConnector]: "connector",
  [Slug.RecruitmentJobClosedCandidate]: "candidate",
  [Slug.RecruitmentJobReopenedConnector]: "connector",
  [Slug.RecruitmentJobReopenedCandidate]: "candidate",
};

export async function logRecruitmentEmailSent(
  emailLogsService: RecruitmentEmailLogsService,
  providerId: string | undefined,
  input: RecruitmentEmailLogInput
): Promise<void> {
  if (!providerId) return;
  await emailLogsService.createOne(
    normalizeEmailLogInput({ ...input, providerId })
  );
}

/** @deprecated Use logRecruitmentEmailSent */
export const logPipelineEmailSent = logRecruitmentEmailSent;
