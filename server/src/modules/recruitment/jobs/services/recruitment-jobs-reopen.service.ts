import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { ReopenRecruitmentJobDto } from "../recruitment-jobs.dto";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { ResolvedJobAccess } from "../../collaboration/services/recruitment-access.service";
import { RecruitmentNotificationQueueService } from "../../notifications/recruitment-notification-queue.service";
import {
  buildLifecycleNotificationSelection,
  upsertJobLifecycleNotificationPrefs,
} from "../job-lifecycle-notification-prefs.util";

@Injectable()
export class RecruitmentJobsReopenService {
  private readonly logger = new Logger(RecruitmentJobsReopenService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly notificationQueue: RecruitmentNotificationQueueService
  ) {}

  async reopenJob(
    userId: string,
    access: ResolvedJobAccess,
    dto: ReopenRecruitmentJobDto
  ): Promise<schema.RecruitmentJob> {
    if (access.role !== "owner") {
      throw new ForbiddenException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.REOPEN_OWNER_ONLY
      );
    }

    if (access.job.status !== "closed") {
      throw new BadRequestException(RECRUITMENT_JOBS_MESSAGES.ERROR.NOT_CLOSED);
    }

    const now = toUTC();
    const table = schema.recruitmentJobsSchema;

    const [updated] = await this.db
      .update(table)
      .set({
        status: "active",
        closedAt: null,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(
        and(
          eq(table.id, access.job.id),
          eq(table.status, "closed"),
          eq(table.requesterId, userId),
          isNull(table.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      throw new BadRequestException(RECRUITMENT_JOBS_MESSAGES.ERROR.NOT_CLOSED);
    }

    const notificationSelection = buildLifecycleNotificationSelection(
      dto.sendNotifications,
      dto.candidateStageKeys
    );

    try {
      await upsertJobLifecycleNotificationPrefs(
        this.db,
        access.job.id,
        userId,
        { lastReopen: notificationSelection }
      );
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_REOPEN :: SAVE_PREFS : ERROR : ${error}`
      );
    }

    if (dto.sendNotifications) {
      try {
        await this.notificationQueue.queueJobReopenedNotification({
          jobId: access.job.id,
          reopenedByUserId: userId,
          candidateStageKeys: dto.candidateStageKeys ?? [],
        });
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_JOBS_REOPEN :: REOPEN_JOB : ERROR : ${error}`
        );
      }
    }

    return updated;
  }
}
