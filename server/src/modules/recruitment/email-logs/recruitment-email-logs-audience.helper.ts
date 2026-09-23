import { and, eq, inArray, type SQL } from "drizzle-orm";
import { JOB_POOL_MATCH_STATUS } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import type * as schema from "database/schema";
import {
  isResendableEmailType,
  RECRUITMENT_EMAIL_LOG_TYPE,
  RECRUITMENT_EMAIL_RECIPIENT_TYPE,
} from "./recruitment-email-logs.constants";

type EmailLogsTable = typeof schema.recruitmentEmailLogsSchema;

/** Recruiter-side view: all outbound candidate/connector emails on the job. Connectors only see their own sends. */
export function buildAudienceVisibilityFilter(
  table: EmailLogsTable,
  audience: "connector" | "recruiter",
  userId: string
): SQL {
  const outboundTypes = inArray(table.recipientType, [
    RECRUITMENT_EMAIL_RECIPIENT_TYPE.CANDIDATE,
    RECRUITMENT_EMAIL_RECIPIENT_TYPE.CONNECTOR,
  ]);

  if (audience === "recruiter") {
    return outboundTypes!;
  }

  return and(eq(table.createdBy, userId), outboundTypes)!;
}

export const EMAIL_TYPE_REQUIRED_STAGE: Partial<Record<string, string>> = {
  [RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_INVITE]: "interview_invite_sent",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_SHORTLISTED]: "shortlisted",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_SHORTLISTED]: "shortlisted",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_INVITE]:
    "interview_invite_sent",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_SCHEDULED]:
    "interview_scheduled",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_COMPLETED]:
    "interview_completed",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_HIRED]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_HIRED]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_REJECTED]: "rejected",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_REJECTED]: "rejected",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_SETUP]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_SETUP]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_RELEASED]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_RELEASED]: "hired",
  [RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_IN_REVIEW_STATUS]: "in_review",
  [RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_IN_REVIEW_STATUS]: "in_review",
};

export function canResendForPipelineContext(
  emailType: string,
  audience: "connector" | "recruiter",
  context: {
    stageKey: string | null;
    poolMatchStatus: string | null;
  }
): boolean {
  if (!isResendableEmailType(emailType, audience)) {
    return false;
  }

  if (emailType === RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT) {
    if (context.poolMatchStatus) {
      return context.poolMatchStatus === JOB_POOL_MATCH_STATUS.CONSENT_PENDING;
    }
    return context.stageKey === "consent_pending";
  }

  const requiredStage = EMAIL_TYPE_REQUIRED_STAGE[emailType];
  if (!requiredStage || !context.stageKey) {
    return false;
  }

  return context.stageKey === requiredStage;
}

/** Only the newest log per email type may show Resend (logs must be sentAt desc). */
export function applyLatestResendOnly<
  T extends { id: string; emailType: string; canResend: boolean },
>(logs: T[]): T[] {
  const latestResendableIdByType = new Map<string, string>();

  for (const log of logs) {
    if (!log.canResend || latestResendableIdByType.has(log.emailType)) {
      continue;
    }
    latestResendableIdByType.set(log.emailType, log.id);
  }

  return logs.map((log) => ({
    ...log,
    canResend:
      log.canResend && latestResendableIdByType.get(log.emailType) === log.id,
  }));
}
