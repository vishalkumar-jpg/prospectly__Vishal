import { Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import type { RecruiterNewCandidateLifecycleJobData } from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { formatMatchScore } from "./recruitment-lifecycle-format.util";
import {
  escapeVars,
  buildLifecycleLogContext,
  loadCandidateJobContext,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import { buildRecruiterPipelineUrl } from "../recruitment-notification-urls.util";
import { resolveOwnerAndCollaboratorEmails } from "../recruitment-job-recipient-emails.util";

export async function processRecruiterNewCandidateNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: RecruiterNewCandidateLifecycleJobData
): Promise<void> {
  const { candidateId } = data;
  if (!candidateId) {
    throw new Error(
      "RECRUITMENT_LIFECYCLE :: recruiter_new_candidate :: missing candidateId"
    );
  }

  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: recruiter_new_candidate :: candidate ${candidateId} not found`
    );
    return;
  }

  const recipients = await resolveOwnerAndCollaboratorEmails(
    db,
    ctx.jobId,
    ctx.requesterId
  );
  if (!recipients) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: recruiter_new_candidate :: owner unreachable for candidate ${candidateId}`
    );
    return;
  }

  await sendLifecycleEmail(
    emailsService,
    logger,
    Slug.RecruitmentRecruiterNewCandidate,
    recipients.to,
    escapeVars({
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      matchScore: formatMatchScore(ctx.matchScore),
      pipelineUrl: buildRecruiterPipelineUrl(ctx.jobId, candidateId),
    }),
    `recruiter_new_candidate candidate=${candidateId}`,
    {
      cc: recipients.cc,
      log: buildLifecycleLogContext(
        emailLogsService,
        ctx,
        candidateId,
        data.sentByUserId
      ),
    }
  );
}
