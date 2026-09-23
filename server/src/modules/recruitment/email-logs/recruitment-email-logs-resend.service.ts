import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { EmailsService } from "modules/emails/emails.service";
import { ConsentResendService } from "modules/recruitment/consent/services/consent-resend.service";
import {
  isResendableEmailType,
  RECRUITMENT_EMAIL_LOG_TYPE,
  RECRUITMENT_EMAIL_LOGS_MESSAGES,
  type RecruitmentEmailLogType,
  type RecruitmentEmailRecipientType,
} from "./recruitment-email-logs.constants";
import { canResendForPipelineContext } from "./recruitment-email-logs-audience.helper";
import { normalizeEmailLogInput } from "./recruitment-email-log.helper";
import { resolveResendRecipientEmail } from "./recruitment-email-logs-resend-recipient.helper";
import { RecruitmentEmailLogPersistService } from "./recruitment-email-log-persist.service";
import { RecruitmentAccessService } from "../collaboration/services/recruitment-access.service";

@Injectable()
export class RecruitmentEmailLogsResendService {
  private readonly logger = new Logger(RecruitmentEmailLogsResendService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailsService: EmailsService,
    private readonly emailLogPersistService: RecruitmentEmailLogPersistService,
    private readonly consentResendService: ConsentResendService,
    private readonly recruitmentAccessService: RecruitmentAccessService
  ) {}

  async resend(
    userId: string,
    logId: string,
    audience: "connector" | "recruiter"
  ) {
    const log = await this.db.query.recruitmentEmailLogsSchema.findFirst({
      where: and(
        eq(schema.recruitmentEmailLogsSchema.id, logId),
        isNull(schema.recruitmentEmailLogsSchema.deletedAt)
      ),
    });

    if (!log) {
      throw new NotFoundException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.NOT_FOUND
      );
    }

    if (!isResendableEmailType(log.emailType, audience)) {
      throw new BadRequestException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.RESEND_NOT_ALLOWED
      );
    }

    await this.assertResendAccess(userId, log, audience);
    await this.assertResendStage(log, audience);
    await this.assertLatestResendableLog(log);

    if (
      log.emailType === RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT &&
      log.poolMatchId
    ) {
      await this.consentResendService.resendConsent(userId, log.poolMatchId);
      return { message: RECRUITMENT_EMAIL_LOGS_MESSAGES.SUCCESS.RESENT };
    }

    if (!log.subject || !log.emailBody) {
      throw new BadRequestException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.RESEND_MISSING_CONTENT
      );
    }

    const recipientEmail = await resolveResendRecipientEmail(this.db, log);

    const result = await this.emailsService.sendEmail({
      to: recipientEmail,
      subject: log.subject,
      html: log.emailBody,
    });

    if (!result.success) {
      throw new BadRequestException(
        result.error ?? RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.RESEND_FAILED
      );
    }

    if (result.emailId) {
      await this.emailLogPersistService.persistWithRecovery(
        normalizeEmailLogInput({
          jobId: log.jobId,
          candidateId: log.candidateId,
          poolMatchId: log.poolMatchId,
          emailType: log.emailType as RecruitmentEmailLogType,
          recipientType: log.recipientType as RecruitmentEmailRecipientType,
          providerId: result.emailId,
          recipientEmail,
          subject: log.subject,
          emailBody: log.emailBody,
          createdBy: userId,
        })
      );
    } else {
      this.logger.warn(
        `RECRUITMENT_EMAIL_LOGS_RESEND :: RESEND :: missing provider id for logId=${logId}`
      );
    }

    this.logger.log(
      `RECRUITMENT_EMAIL_LOGS_RESEND :: RESEND :: logId=${logId} audience=${audience}`
    );

    return { message: RECRUITMENT_EMAIL_LOGS_MESSAGES.SUCCESS.RESENT };
  }

  private async assertResendAccess(
    userId: string,
    log: typeof schema.recruitmentEmailLogsSchema.$inferSelect,
    audience: "connector" | "recruiter"
  ) {
    if (audience === "recruiter") {
      await this.recruitmentAccessService.resolveJobAccess(userId, log.jobId);
      return;
    }

    if (log.emailType === RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT) {
      if (log.createdBy !== userId) {
        throw new ForbiddenException(
          RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.FORBIDDEN
        );
      }
    }

    if (!log.poolMatchId) {
      throw new ForbiddenException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.FORBIDDEN
      );
    }

    const match = await this.db.query.recruitmentJobPoolMatches.findFirst({
      where: and(
        eq(schema.recruitmentJobPoolMatches.id, log.poolMatchId),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      ),
    });
    if (!match || match.connectorUserId !== userId) {
      throw new ForbiddenException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.FORBIDDEN
      );
    }
  }

  private async assertResendStage(
    log: typeof schema.recruitmentEmailLogsSchema.$inferSelect,
    audience: "connector" | "recruiter"
  ) {
    let stageKey: string | null = null;
    let poolMatchStatus: string | null = null;

    if (log.candidateId) {
      const [stageRow] = await this.db
        .select({ stageKey: schema.recruitmentStagesSchema.stageKey })
        .from(schema.recruitmentJobCandidates)
        .innerJoin(
          schema.recruitmentStagesSchema,
          eq(
            schema.recruitmentJobCandidates.stageId,
            schema.recruitmentStagesSchema.id
          )
        )
        .where(eq(schema.recruitmentJobCandidates.id, log.candidateId))
        .limit(1);
      stageKey = stageRow?.stageKey ?? null;
    }

    if (log.poolMatchId) {
      const match = await this.db.query.recruitmentJobPoolMatches.findFirst({
        where: eq(schema.recruitmentJobPoolMatches.id, log.poolMatchId),
        columns: { status: true },
      });
      poolMatchStatus = match?.status ?? null;
    }

    if (
      !canResendForPipelineContext(log.emailType, audience, {
        stageKey,
        poolMatchStatus,
      })
    ) {
      throw new BadRequestException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.RESEND_NOT_ALLOWED
      );
    }
  }

  private async assertLatestResendableLog(
    log: typeof schema.recruitmentEmailLogsSchema.$inferSelect
  ) {
    const scopeCondition = log.poolMatchId
      ? eq(schema.recruitmentEmailLogsSchema.poolMatchId, log.poolMatchId)
      : log.candidateId
        ? eq(schema.recruitmentEmailLogsSchema.candidateId, log.candidateId)
        : null;

    if (!scopeCondition) return;

    const [latest] = await this.db
      .select({ id: schema.recruitmentEmailLogsSchema.id })
      .from(schema.recruitmentEmailLogsSchema)
      .where(
        and(
          scopeCondition,
          eq(schema.recruitmentEmailLogsSchema.emailType, log.emailType),
          isNull(schema.recruitmentEmailLogsSchema.deletedAt)
        )
      )
      .orderBy(
        desc(schema.recruitmentEmailLogsSchema.sentAt),
        desc(schema.recruitmentEmailLogsSchema.createdAt)
      )
      .limit(1);

    if (latest?.id !== log.id) {
      throw new BadRequestException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.RESEND_NOT_ALLOWED
      );
    }
  }
}
