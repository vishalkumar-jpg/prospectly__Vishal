import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { InterviewBookingErrorStage } from "../recruitment-notifications.constants";
import { randomBytes } from "node:crypto";
import { dispatchInterviewBookingErrorNotification } from "./recruitment-interview-booking-error-dispatch.helper";
import { RecruitmentNotificationQueueService } from "../recruitment-notification-queue.service";
import {
  RECRUITMENT_NOTIFICATION_TYPE,
  RECRUITMENT_NOTIFICATION_STATUS,
  RECRUITMENT_NOTIFICATION_MESSAGES,
  NOTIFICATION_SHARE_PLATFORM,
} from "../recruitment-notifications.constants";
import { loadJobForNotification } from "../recruitment-notifications.utils";

interface DispatchParams {
  userId: string;
  jobId: string;
  organisationIds: string[];
  /** True when triggered from the job-creation wizard (sets notifyOnCreate). */
  fromCreation: boolean;
}

@Injectable()
export class RecruitmentNotificationsDispatchService {
  private readonly logger = new Logger(
    RecruitmentNotificationsDispatchService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queueService: RecruitmentNotificationQueueService
  ) {}

  /** Manual trigger from the my-job-posts listing page. */
  async sendJobNotification(
    userId: string,
    jobId: string,
    organisationIds: string[]
  ) {
    return this.dispatchNotification({
      userId,
      jobId,
      organisationIds,
      fromCreation: false,
    });
  }

  /**
   * Shared dispatch path for both the creation wizard and the manual trigger.
   * Records the org selection on recruitment_job_settings, creates a tracked
   * share row for the email CTA, inserts a pending recruitment_notifications
   * row (UNIQUE (jobId, type) is the final double-send guard), then enqueues
   * the background send.
   */
  async dispatchNotification(params: DispatchParams) {
    const { userId, jobId, organisationIds, fromCreation } = params;

    if (!organisationIds || organisationIds.length === 0) {
      throw new BadRequestException(
        RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.NO_ORGANISATIONS
      );
    }

    await loadJobForNotification(this.db, userId, jobId);

    // Recruiters may notify the same job multiple times (each send is its own
    // row). Only block while the most recent send is still in flight, to avoid
    // overlapping/duplicate batches to the same recipients.
    const [latest] = await this.db
      .select({ status: schema.recruitmentNotificationsSchema.status })
      .from(schema.recruitmentNotificationsSchema)
      .where(
        and(
          eq(schema.recruitmentNotificationsSchema.jobId, jobId),
          eq(
            schema.recruitmentNotificationsSchema.type,
            RECRUITMENT_NOTIFICATION_TYPE.NEW_JOB_POST
          ),
          isNull(schema.recruitmentNotificationsSchema.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentNotificationsSchema.createdAt))
      .limit(1);
    if (
      latest &&
      (latest.status === RECRUITMENT_NOTIFICATION_STATUS.PENDING ||
        latest.status === RECRUITMENT_NOTIFICATION_STATUS.SENDING)
    ) {
      throw new BadRequestException(
        RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.NOTIFICATION_IN_PROGRESS
      );
    }

    const now = toUTC();
    const notification = await this.db.transaction(async (tx) => {
      // Upsert: post-fix, the create-service always inserts a settings row, so
      // this resolves to UPDATE. The INSERT branch is the legacy safety net for
      // jobs created before the "always create settings row" fix landed.
      const [existingSettings] = await tx
        .select({ id: schema.recruitmentJobSettingsSchema.id })
        .from(schema.recruitmentJobSettingsSchema)
        .where(
          and(
            eq(schema.recruitmentJobSettingsSchema.jobId, jobId),
            isNull(schema.recruitmentJobSettingsSchema.deletedAt)
          )
        )
        .limit(1);

      if (existingSettings) {
        await tx
          .update(schema.recruitmentJobSettingsSchema)
          .set({
            organisationIds,
            ...(fromCreation ? { notifyOnCreate: true } : {}),
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            eq(schema.recruitmentJobSettingsSchema.id, existingSettings.id)
          );
      } else {
        await tx.insert(schema.recruitmentJobSettingsSchema).values({
          jobId,
          notifyOnCreate: fromCreation,
          organisationIds,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // System share row backs the public job link in the email (?ref=code)
      // so opens/views are tracked in recruitment_job_share_events.
      await tx.insert(schema.recruitmentJobShares).values({
        jobId,
        sharerId: null,
        sharerCode: randomBytes(12).toString("hex"),
        platform: NOTIFICATION_SHARE_PLATFORM,
      });

      const [created] = await tx
        .insert(schema.recruitmentNotificationsSchema)
        .values({
          jobId,
          type: RECRUITMENT_NOTIFICATION_TYPE.NEW_JOB_POST,
          status: RECRUITMENT_NOTIFICATION_STATUS.PENDING,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    });

    try {
      await this.queueService.queueNewJobPostNotification(notification.id);
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_NOTIFICATIONS_DISPATCH_SERVICE :: DISPATCH_NOTIFICATION : QUEUE_ERROR : ${error}`
      );
      await this.db
        .update(schema.recruitmentNotificationsSchema)
        .set({
          status: RECRUITMENT_NOTIFICATION_STATUS.FAILED,
          error: RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.QUEUE_FAILED,
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentNotificationsSchema.id, notification.id));
      throw new BadRequestException(
        RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.QUEUE_FAILED
      );
    }

    return notification;
  }

  /** Notify job owner and active collaborators on booking errors. */
  async dispatchInterviewBookingError(params: {
    candidateId: string;
    error: unknown;
    stage: InterviewBookingErrorStage;
  }): Promise<void> {
    return dispatchInterviewBookingErrorNotification(
      this.queueService,
      this.logger,
      params
    );
  }
}
