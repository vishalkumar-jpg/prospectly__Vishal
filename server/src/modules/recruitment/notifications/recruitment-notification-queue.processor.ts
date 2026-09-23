import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, eq, ne, isNull, inArray } from "drizzle-orm";
import { appConfig } from "config/app.config";
import { toUTC } from "utils/dayjs";
import { EmailsService } from "modules/emails/emails.service";
import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";
import { Slug } from "modules/emails/emails.constants";
import {
  renderBodyWithVariables,
  processContent,
  renderTemplateWithVariables,
} from "modules/emails/templating";
import { delay } from "modules/emails/retry";
import type { JobClosedNotificationJobData } from "../jobs/job-close-notification.constants";
import type { JobReopenedNotificationJobData } from "../jobs/job-reopen-notification.constants";
import {
  RECRUITMENT_NOTIFICATION_QUEUE_NAME,
  RECRUITMENT_NOTIFICATION_QUEUE_JOBS,
  RECRUITMENT_NOTIFICATION_STATUS,
  RECRUITMENT_NOTIFICATION_DB_PAGE_SIZE,
  RECRUITMENT_NOTIFICATION_EMAIL_BATCH_SIZE,
  RECRUITMENT_NOTIFICATION_BATCH_DELAY_MS,
  NOTIFICATION_SHARE_PLATFORM,
  CollaboratorAddedEmailJobData,
} from "./recruitment-notifications.constants";
import {
  NewJobPostNotificationJobData,
  InterviewBookingErrorJobData,
  RecruitmentLifecycleJobData,
} from "./recruitment-notification-queue.service";
import { processInterviewBookingErrorNotification } from "./processors/interview-booking-error.processor-helper";
import { processRecruitmentLifecycleNotification } from "./processors/recruitment-lifecycle.processor-helper";
import { processJobClosedNotification } from "./processors/job-closed-notification.processor-helper";
import { processJobReopenedNotification } from "./processors/job-reopened-notification.processor-helper";
import {
  formatCompactSalaryRange,
  normalizeSalaryCurrency,
} from "../recruitment-salary-currency";
import { RecruitmentFeeConfigService } from "../fee-config/recruitment-fee-config.service";
import { RecruitmentEmailLogsService } from "../email-logs/recruitment-email-logs.service";
import {
  RECRUITMENT_EMAIL_LOG_TYPE,
  RECRUITMENT_EMAIL_RECIPIENT_TYPE,
} from "../email-logs/recruitment-email-logs.constants";
import { normalizeEmailLogInput } from "../email-logs/recruitment-email-log.helper";

// Fixed locale for currency display in the email body — prevents server-host
// locale from leaking into formatted amounts (e.g. "1,000" vs "1.000").
const EMAIL_LOCALE = "en-US";
// A whole amount renders without a decimal part ("$250"); one carrying cents
// always renders both digits ("$312.50"). A bare toLocaleString() would emit
// "$312.5", which reads as malformed money.
function formatEmailMoney(amount: number): string {
  const hasCents = !Number.isInteger(Math.round(amount * 100) / 100);
  return amount.toLocaleString(EMAIL_LOCALE, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

@Processor(RECRUITMENT_NOTIFICATION_QUEUE_NAME)
export class RecruitmentNotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    RecruitmentNotificationQueueProcessor.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailsService: EmailsService,
    private readonly feeConfig: RecruitmentFeeConfigService,
    private readonly creditUsageHelper: CreditUsageHelper,
    private readonly recruitmentEmailLogsService: RecruitmentEmailLogsService
  ) {
    super();
  }

  async process(
    job: Job<
      | NewJobPostNotificationJobData
      | InterviewBookingErrorJobData
      | RecruitmentLifecycleJobData
      | CollaboratorAddedEmailJobData
      | JobClosedNotificationJobData
      | JobReopenedNotificationJobData
    >
  ): Promise<void> {
    if (
      job.name === RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_COLLABORATOR_ADDED
    ) {
      // Single-recipient email — let failures throw so BullMQ retries (safe,
      // unlike the bulk job which tracks recipients via recruitment_email_logs).
      await this.handleCollaboratorAdded(
        job.data as CollaboratorAddedEmailJobData
      );
      return;
    }

    if (job.name === RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_NEW_JOB_POST) {
      const { notificationId } = job.data as NewJobPostNotificationJobData;
      this.logger.log(
        `Processing recruitment notification ${notificationId} (job ${job.id})`
      );

      try {
        await this.sendNewJobPostNotification(
          notificationId,
          job as Job<NewJobPostNotificationJobData>
        );
      } catch (error) {
        // Intentionally swallowed: re-throwing would let BullMQ retry the whole
        // job and re-email everyone. Per-recipient delivery is tracked in
        // recruitment_email_logs; the notification is locked regardless.
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: PROCESS : ERROR : ${error}`
        );
        await this.markFailed(notificationId, String(error));
      }
      return;
    }

    if (
      job.name ===
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_INTERVIEW_BOOKING_ERROR
    ) {
      const data = job.data as InterviewBookingErrorJobData;
      this.logger.log(
        `Processing interview-booking-error for candidate ${data.candidateId} (job ${job.id})`
      );
      try {
        await processInterviewBookingErrorNotification(
          this.db,
          this.emailsService,
          this.recruitmentEmailLogsService,
          this.logger,
          data
        );
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: INTERVIEW_BOOKING_ERROR : ERROR : ${error}`
        );
      }
      return;
    }

    if (job.name === RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_LIFECYCLE) {
      const data = job.data as RecruitmentLifecycleJobData;
      this.logger.log(
        `Processing lifecycle notification type=${data.type} (job ${job.id})`
      );
      try {
        await processRecruitmentLifecycleNotification(
          this.db,
          this.emailsService,
          this.feeConfig,
          this.creditUsageHelper,
          this.recruitmentEmailLogsService,
          this.logger,
          data
        );
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: LIFECYCLE : ERROR : ${error}`
        );
        throw error;
      }
      return;
    }

    if (job.name === RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_JOB_CLOSED) {
      const data = job.data as JobClosedNotificationJobData;
      this.logger.log(
        `Processing job-closed notifications for job ${data.jobId} (job ${job.id})`
      );
      try {
        await processJobClosedNotification(
          this.db,
          this.emailsService,
          this.recruitmentEmailLogsService,
          this.logger,
          data
        );
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: JOB_CLOSED : ERROR : ${error}`
        );
        throw error;
      }
      return;
    }

    if (job.name === RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_JOB_REOPENED) {
      const data = job.data as JobReopenedNotificationJobData;
      this.logger.log(
        `Processing job-reopened notifications for job ${data.jobId} (job ${job.id})`
      );
      try {
        await processJobReopenedNotification(
          this.db,
          this.emailsService,
          this.recruitmentEmailLogsService,
          this.logger,
          data
        );
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: JOB_REOPENED : ERROR : ${error}`
        );
        throw error;
      }
      return;
    }

    this.logger.warn(`Unknown job name: ${job.name}`);
  }

  /**
   * Send the opt-in "you've been added as a collaborator" email and stamp
   * notifiedAt on success. Throws on send failure so BullMQ retries.
   */
  private async handleCollaboratorAdded(
    data: CollaboratorAddedEmailJobData
  ): Promise<void> {
    const { collaboratorUserId, ownerId, jobId } = data;

    const [collaborator] = await this.db
      .select({ email: schema.users.email, fullName: schema.users.fullName })
      .from(schema.users)
      .where(eq(schema.users.id, collaboratorUserId))
      .limit(1);

    if (!collaborator?.email) {
      this.logger.warn(
        `Collaborator ${collaboratorUserId} has no email; skipping added-notice`
      );
      return;
    }

    const [owner] = await this.db
      .select({ fullName: schema.users.fullName })
      .from(schema.users)
      .where(eq(schema.users.id, ownerId))
      .limit(1);

    const [job] = await this.db
      .select({
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job) {
      this.logger.warn(`Job ${jobId} not found; skipping collaborator notice`);
      return;
    }

    const { frontendUrl } = appConfig;
    const jobUrl = `${frontendUrl}/recruiting/my-job-posts/${jobId}`;

    const template = await this.emailsService.findTemplateBySlug(
      Slug.RecruitmentCollaboratorAdded
    );
    const { subject, html } = renderTemplateWithVariables(template, {
      collaboratorName: collaborator.fullName || "there",
      ownerName: owner?.fullName || "A teammate",
      jobTitle: job.title,
      companyName: job.companyName,
      jobUrl,
      url: frontendUrl,
    });

    // Let a send failure throw → BullMQ retries this single email.
    const sendResult = await this.emailsService.sendEmail({
      to: collaborator.email,
      subject,
      html,
      slug: Slug.RecruitmentCollaboratorAdded,
    });

    if (!sendResult.success) {
      throw new Error(
        sendResult.error ?? "Failed to send collaborator-added email"
      );
    }

    if (sendResult.emailId) {
      try {
        await this.recruitmentEmailLogsService.createOne(
          normalizeEmailLogInput({
            jobId,
            emailType: RECRUITMENT_EMAIL_LOG_TYPE.COLLABORATOR_ADDED,
            providerId: sendResult.emailId,
            recipientEmail: collaborator.email,
            recipientType: RECRUITMENT_EMAIL_RECIPIENT_TYPE.RECRUITER,
            candidateId: null,
            poolMatchId: null,
            createdBy: ownerId,
            subject,
            emailBody: html,
          })
        );
      } catch (logError) {
        this.logger.error(
          `RECRUITMENT_NOTIFICATION_PROCESSOR :: COLLABORATOR_EMAIL_LOG : ERROR : ${logError}`
        );
      }
    }

    await this.db
      .update(schema.recruitmentJobCollaborators)
      .set({ notifiedAt: toUTC() })
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          eq(
            schema.recruitmentJobCollaborators.collaboratorUserId,
            collaboratorUserId
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      );
  }

  private async sendNewJobPostNotification(
    notificationId: string,
    job: Job<NewJobPostNotificationJobData>
  ): Promise<void> {
    const [notification] = await this.db
      .select()
      .from(schema.recruitmentNotificationsSchema)
      .where(eq(schema.recruitmentNotificationsSchema.id, notificationId))
      .limit(1);

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found — skipping`);
      return;
    }
    if (notification.status !== RECRUITMENT_NOTIFICATION_STATUS.PENDING) {
      this.logger.warn(
        `Notification ${notificationId} is '${notification.status}', not pending — skipping`
      );
      return;
    }

    await this.db
      .update(schema.recruitmentNotificationsSchema)
      .set({
        status: RECRUITMENT_NOTIFICATION_STATUS.SENDING,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentNotificationsSchema.id, notificationId));

    const { jobId } = notification;

    const [jobRow] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        location: schema.recruitmentJobsSchema.location,
        workType: schema.recruitmentJobsSchema.workType,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        salaryRangeMin: schema.recruitmentJobPricesSchema.salaryRangeMin,
        salaryRangeMax: schema.recruitmentJobPricesSchema.salaryRangeMax,
        salaryCurrency: schema.recruitmentJobPricesSchema.salaryCurrency,
        salaryPeriod: schema.recruitmentJobPricesSchema.salaryPeriod,
        bountyAmount: schema.recruitmentJobPricesSchema.bountyAmount,
        hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
        successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      })
      .from(schema.recruitmentJobsSchema)
      .leftJoin(
        schema.recruitmentJobPricesSchema,
        eq(
          schema.recruitmentJobsSchema.id,
          schema.recruitmentJobPricesSchema.jobId
        )
      )
      .where(eq(schema.recruitmentJobsSchema.id, jobId))
      .limit(1);

    if (!jobRow) {
      await this.markFailed(notificationId, "Job not found");
      return;
    }

    const [settings] = await this.db
      .select({
        organisationIds: schema.recruitmentJobSettingsSchema.organisationIds,
      })
      .from(schema.recruitmentJobSettingsSchema)
      .where(
        and(
          eq(schema.recruitmentJobSettingsSchema.jobId, jobId),
          isNull(schema.recruitmentJobSettingsSchema.deletedAt)
        )
      )
      .limit(1);

    const organisationIds = settings?.organisationIds ?? [];
    if (organisationIds.length === 0) {
      await this.markFailed(notificationId, "No target organizations found");
      return;
    }

    const [share] = await this.db
      .select({ sharerCode: schema.recruitmentJobShares.sharerCode })
      .from(schema.recruitmentJobShares)
      .where(
        and(
          eq(schema.recruitmentJobShares.jobId, jobId),
          eq(schema.recruitmentJobShares.platform, NOTIFICATION_SHARE_PLATFORM)
        )
      )
      .limit(1);

    const jobUrl = share?.sharerCode
      ? `${appConfig.frontendUrl}/recruiting/job-marketplace?job=${jobId}&ref=${share.sharerCode}`
      : `${appConfig.frontendUrl}/recruiting/job-marketplace?job=${jobId}`;

    // Render the email once — content is identical for every recipient.
    // Template htmlContent is a complete standalone document (no runtime shell wrap).
    const template = await this.emailsService.findTemplateBySlug(
      Slug.RecruitmentNewJobPost
    );
    const templateVars = {
      jobTitle: jobRow.title,
      companyName: jobRow.companyName,
      location: jobRow.location ?? "",
      workType: this.capitalize(jobRow.workType ?? ""),
      salaryRange: this.formatSalaryRange(jobRow),
      connectorPayout: this.formatConnectorPayout(jobRow.bountyAmount),
      successBonus: this.formatSuccessBonus(
        jobRow.hasSuccessFee,
        jobRow.successFeeAmount
      ),
      jobUrl,
    };
    const html = renderBodyWithVariables(template.htmlContent, templateVars);
    const subject = processContent(template.subject, templateVars)
      .replace(/[\r\n]/g, " ")
      .trim();

    let totalRecipients = 0;
    let sentCount = 0;
    let failedCount = 0;
    let offset = 0;

    // Paginate recipient reads so 10k+ users never land in memory at once.
    for (;;) {
      const recipients = await this.db
        .selectDistinct({
          userId: schema.organisationMemberSchema.userId,
          email: schema.users.email,
        })
        .from(schema.organisationMemberSchema)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.organisationMemberSchema.userId)
        )
        .where(
          and(
            inArray(
              schema.organisationMemberSchema.organisationId,
              organisationIds
            ),
            isNull(schema.organisationMemberSchema.deletedAt),
            isNull(schema.users.deletedAt),
            eq(schema.users.isActive, true),
            ne(schema.organisationMemberSchema.userId, jobRow.requesterId)
          )
        )
        .orderBy(schema.organisationMemberSchema.userId)
        .limit(RECRUITMENT_NOTIFICATION_DB_PAGE_SIZE)
        .offset(offset);

      if (recipients.length === 0) break;

      totalRecipients += recipients.length;

      for (
        let i = 0;
        i < recipients.length;
        i += RECRUITMENT_NOTIFICATION_EMAIL_BATCH_SIZE
      ) {
        const chunk = recipients.slice(
          i,
          i + RECRUITMENT_NOTIFICATION_EMAIL_BATCH_SIZE
        );
        const result = await this.emailsService.sendBatch(
          chunk.map((r) => ({
            to: r.email,
            subject,
            html,
            slug: Slug.RecruitmentNewJobPost,
          }))
        );
        sentCount += result.sentCount;
        failedCount += result.failedCount;

        const logRows = result.results
          .filter((r) => r.emailId)
          .map((r) =>
            normalizeEmailLogInput({
              jobId,
              emailType: RECRUITMENT_EMAIL_LOG_TYPE.NEW_JOB_OPPORTUNITIES,
              providerId: r.emailId as string,
              recipientEmail: r.to,
              recipientType: RECRUITMENT_EMAIL_RECIPIENT_TYPE.ORG_MEMBER,
              candidateId: null,
              poolMatchId: null,
              createdBy: notification.createdBy,
              subject,
              emailBody: html,
            })
          );
        try {
          await this.recruitmentEmailLogsService.createMany(logRows);
        } catch (logError) {
          this.logger.error(
            `RECRUITMENT_NOTIFICATION_PROCESSOR :: EMAIL_LOG : ERROR : ${logError}`
          );
        }

        await job.updateProgress({
          totalRecipients,
          sentCount,
          failedCount,
        });
        await delay(RECRUITMENT_NOTIFICATION_BATCH_DELAY_MS);
      }

      if (recipients.length < RECRUITMENT_NOTIFICATION_DB_PAGE_SIZE) break;
      offset += RECRUITMENT_NOTIFICATION_DB_PAGE_SIZE;
    }

    const finalStatus =
      failedCount === 0
        ? RECRUITMENT_NOTIFICATION_STATUS.SENT
        : sentCount === 0
          ? RECRUITMENT_NOTIFICATION_STATUS.FAILED
          : RECRUITMENT_NOTIFICATION_STATUS.PARTIALLY_FAILED;

    await this.db
      .update(schema.recruitmentNotificationsSchema)
      .set({
        status: finalStatus,
        totalRecipients,
        sentCount,
        failedCount,
        completedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentNotificationsSchema.id, notificationId));

    this.logger.log(
      `Notification ${notificationId} finished: status=${finalStatus} total=${totalRecipients} sent=${sentCount} failed=${failedCount}`
    );
  }

  /** Upper-cases the first character (e.g. "yearly" → "Yearly", "remote" → "Remote"). */
  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  private formatSalaryRange(jobRow: {
    salaryRangeMin: string | null;
    salaryRangeMax: string | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
  }): string {
    const min = Number(jobRow.salaryRangeMin ?? 0);
    const max = Number(jobRow.salaryRangeMax ?? 0);
    if (!min && !max) return "";
    const currency = normalizeSalaryCurrency(jobRow.salaryCurrency);
    const period = this.capitalize(jobRow.salaryPeriod ?? "yearly");
    return `${formatCompactSalaryRange(min, max, currency)} ${currency} / ${period}`;
  }

  // Mirrors the marketplace card / drawer / public-job page: routes through
  // RecruitmentFeeConfigService so the dollar amount never drifts from what
  // the user sees in-app. Empty string = template row hidden.
  private formatConnectorPayout(bountyAmount: string | null): string {
    const bounty = Number(bountyAmount ?? 0);
    if (!bounty) return "";
    const payout = Number(
      this.feeConfig.splitAmount(bounty, this.feeConfig.getConnectorPercent())
    );
    return `$${formatEmailMoney(payout)} USD`;
  }

  // The "Success Bonus from the Employer" amount the candidate receives after
  // probation. Empty string when no success fee is configured (row hidden).
  private formatSuccessBonus(
    hasSuccessFee: boolean,
    successFeeAmount: string | null
  ): string {
    if (!hasSuccessFee) return "";
    const amount = Number(successFeeAmount ?? 0);
    if (!amount) return "";
    return `$${formatEmailMoney(amount)} USD`;
  }

  private async markFailed(
    notificationId: string,
    error: string
  ): Promise<void> {
    try {
      await this.db
        .update(schema.recruitmentNotificationsSchema)
        .set({
          status: RECRUITMENT_NOTIFICATION_STATUS.FAILED,
          error: error.slice(0, 1000),
          completedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentNotificationsSchema.id, notificationId));
    } catch (err) {
      this.logger.error(
        `RECRUITMENT_NOTIFICATION_PROCESSOR :: MARK_FAILED : ERROR : ${err}`
      );
    }
  }
}
