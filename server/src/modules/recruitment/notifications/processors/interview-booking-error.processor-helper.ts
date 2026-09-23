import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import {
  escapeHtml,
  renderTemplateWithVariables,
} from "modules/emails/templating";
import { appConfig } from "config/app.config";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import { logRecruitmentEmailSent } from "modules/recruitment/email-logs/recruitment-email-log.helper";
import type { InterviewBookingErrorStage } from "../recruitment-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { buildRecruiterPipelineUrl } from "../recruitment-notification-urls.util";
import { resolveOwnerAndCollaboratorEmails } from "../recruitment-job-recipient-emails.util";

const ERROR_STAGE_LABELS: Record<InterviewBookingErrorStage, string> = {
  availability: "Loading available time slots",
  confirmation: "Confirming selected time slot",
};

export interface InterviewBookingErrorJobData {
  candidateId: string;
  errorMessage: string;
  stage: InterviewBookingErrorStage;
}

export async function processInterviewBookingErrorNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: InterviewBookingErrorJobData
): Promise<void> {
  const { candidateId, errorMessage, stage } = data;

  const [candidate] = await db
    .select({
      jobId: schema.recruitmentJobCandidates.jobId,
      candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
      jobTitle: schema.recruitmentJobsSchema.title,
      companyName: schema.recruitmentJobsSchema.companyName,
      requesterId: schema.recruitmentJobsSchema.requesterId,
    })
    .from(schema.recruitmentJobCandidates)
    .innerJoin(
      schema.recruitmentJobsSchema,
      eq(schema.recruitmentJobCandidates.jobId, schema.recruitmentJobsSchema.id)
    )
    .where(
      and(
        eq(schema.recruitmentJobCandidates.id, candidateId),
        isNull(schema.recruitmentJobCandidates.deletedAt)
      )
    )
    .limit(1);

  if (!candidate) {
    logger.warn(
      `INTERVIEW_BOOKING_ERROR_NOTIFICATION :: candidate ${candidateId} not found`
    );
    return;
  }

  const recipients = await resolveOwnerAndCollaboratorEmails(
    db,
    candidate.jobId,
    candidate.requesterId
  );
  if (!recipients) {
    logger.warn(
      `INTERVIEW_BOOKING_ERROR_NOTIFICATION :: owner unreachable for candidate ${candidateId}`
    );
    return;
  }

  const [candidateUser] = await db
    .select({ fullName: schema.users.fullName })
    .from(schema.users)
    .where(eq(schema.users.id, candidate.candidateUserId))
    .limit(1);

  const candidateName = candidateUser?.fullName?.trim() || "Candidate";
  const pipelineUrl = buildRecruiterPipelineUrl(candidate.jobId, candidateId);

  try {
    const template = await emailsService.findTemplateBySlug(
      Slug.RecruitmentInterviewBookingError
    );

    const { subject, html } = renderTemplateWithVariables(template, {
      candidateName: escapeHtml(candidateName),
      jobTitle: escapeHtml(candidate.jobTitle),
      companyName: escapeHtml(candidate.companyName),
      errorMessage: escapeHtml(errorMessage),
      errorStage: escapeHtml(ERROR_STAGE_LABELS[stage]),
      pipelineUrl,
      url: appConfig.frontendUrl,
    });

    const sendResult = await emailsService.sendEmail({
      to: recipients.to,
      ...(recipients.cc.length ? { cc: recipients.cc } : {}),
      subject,
      html,
      slug: Slug.RecruitmentInterviewBookingError,
    });

    await logRecruitmentEmailSent(emailLogsService, sendResult.emailId, {
      jobId: candidate.jobId,
      candidateId,
      poolMatchId: null,
      emailType: RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_BOOKING_ERROR,
      recipientType: "recruiter",
      recipientEmail: recipients.to,
      createdBy: candidate.requesterId,
      subject,
      emailBody: html,
    });
  } catch (error) {
    logger.error(
      `INTERVIEW_BOOKING_ERROR_NOTIFICATION :: send failed for candidate ${candidateId}: ${error}`
    );
  }
}
