import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import { logRecruitmentEmailSent } from "modules/recruitment/email-logs/recruitment-email-log.helper";
import { ConsentEmailService } from "./services/consent-email.service";
import {
  CONSENT_UPDATE_EMAIL_SEND_JOB,
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
  type ConsentUpdateEmailSendJobData,
} from "./consent-email-send.constants";

@Processor(CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME)
export class ConsentEmailSendQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ConsentEmailSendQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentEmailService: ConsentEmailService,
    private readonly emailLogsService: RecruitmentEmailLogsService
  ) {
    super();
  }

  async process(job: Job<ConsentUpdateEmailSendJobData>): Promise<void> {
    if (job.name !== CONSENT_UPDATE_EMAIL_SEND_JOB) {
      this.logger.warn(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: UNKNOWN_JOB :: ${job.name}`
      );
      return;
    }

    const { data } = job;
    const [match] = await this.db
      .select({
        consentToken: schema.recruitmentJobPoolMatches.consentToken,
        consentSentAt: schema.recruitmentJobPoolMatches.consentSentAt,
      })
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, data.poolMatchId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match?.consentToken || match.consentToken !== data.consentToken) {
      this.logger.warn(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: SKIPPED_SUPERSEDED :: poolMatchId=${data.poolMatchId}`
      );
      return;
    }

    if (match.consentSentAt) {
      this.logger.log(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: ALREADY_SENT :: poolMatchId=${data.poolMatchId}`
      );
      return;
    }

    const emailResult = await this.consentEmailService.sendConsentEmail({
      to: data.to,
      candidateName: data.candidateName,
      connectorName: data.connectorName,
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      consentLink: data.consentLink,
    });

    if (!emailResult.success) {
      this.logger.error(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: SEND_CONSENT_EMAIL : ERROR : ${emailResult.error}`
      );
      throw new Error(emailResult.error ?? "Failed to send consent email");
    }

    const sentAt = toUTC();
    const [updated] = await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({ consentSentAt: sentAt, updatedAt: sentAt })
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, data.poolMatchId),
          eq(schema.recruitmentJobPoolMatches.consentToken, data.consentToken),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .returning({ id: schema.recruitmentJobPoolMatches.id });

    if (!updated) {
      this.logger.warn(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: TOKEN_SUPERSEDED_AFTER_SEND :: poolMatchId=${data.poolMatchId}`
      );
      return;
    }

    try {
      await logRecruitmentEmailSent(
        this.emailLogsService,
        emailResult.emailId,
        {
          jobId: data.recruitmentJobId,
          poolMatchId: data.poolMatchId,
          candidateId: null,
          emailType: RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT,
          recipientType: "candidate",
          recipientEmail: data.to,
          subject: emailResult.subject,
          emailBody: emailResult.html,
          createdBy: data.createdBy,
        }
      );
    } catch (logError) {
      this.logger.error(
        `CONSENT_UPDATE_EMAIL_SEND_PROCESSOR :: EMAIL_LOG : ERROR : ${logError}`
      );
    }
  }
}
