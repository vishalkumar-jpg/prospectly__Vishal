import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { sendInReviewReminderEmails } from "modules/recruitment/notifications/processors/in-review-reminder.processor-helper";
import { SystemConfigurationService } from "modules/system-configuration/system-configuration.service";
import { NameSlug } from "modules/system-configuration/system-configuration.constants";
import { parseInReviewReminderDays } from "modules/system-configuration/system-configuration.utils";
import { utcDayjs, toUTC } from "utils/dayjs";

const IN_REVIEW_REMINDER_BATCH_SIZE = 200;

@Injectable()
export class InReviewReminderCronService {
  private readonly logger = new Logger(InReviewReminderCronService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailsService: EmailsService,
    private readonly emailLogsService: RecruitmentEmailLogsService,
    private readonly systemConfigurationService: SystemConfigurationService
  ) {}

  async processDueInReviewReminders(): Promise<void> {
    const config = await this.systemConfigurationService.getConfigurationBySlug(
      NameSlug.InReviewReminderDays
    );
    const reminderDays = parseInReviewReminderDays(config?.value);

    if (reminderDays == null) {
      this.logger.warn(
        "IN_REVIEW_REMINDER :: skipped — in_review_reminder_days missing or invalid"
      );
      return;
    }

    const cutoff = toUTC(
      utcDayjs().startOf("day").subtract(reminderDays, "day").toDate()
    );

    const rows = await this.db
      .select({ candidateId: schema.recruitmentJobCandidates.id })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .where(
        and(
          eq(schema.recruitmentStagesSchema.stageKey, "in_review"),
          isNull(schema.recruitmentJobCandidates.deletedAt),
          isNull(schema.recruitmentJobsSchema.deletedAt),
          lte(schema.recruitmentJobCandidates.stageUpdatedAt, cutoff)
        )
      )
      .orderBy(asc(schema.recruitmentJobCandidates.stageUpdatedAt))
      .limit(IN_REVIEW_REMINDER_BATCH_SIZE);

    if (!rows.length) {
      this.logger.debug(
        `IN_REVIEW_REMINDER :: no due candidates (threshold=${reminderDays} days, cutoff=${cutoff.toISOString()})`
      );
      return;
    }

    this.logger.log(
      `IN_REVIEW_REMINDER :: processing ${rows.length} candidate(s) (threshold=${reminderDays} days)`
    );

    for (const row of rows) {
      try {
        await sendInReviewReminderEmails(
          this.db,
          this.emailsService,
          this.emailLogsService,
          this.logger,
          row.candidateId
        );
      } catch (error) {
        this.logger.error(
          `IN_REVIEW_REMINDER_CRON :: processDueInReviewReminders : ERROR : candidate=${row.candidateId} :: ${error}`
        );
      }
    }
  }
}
