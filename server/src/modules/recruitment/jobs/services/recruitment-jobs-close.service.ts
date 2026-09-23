import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { CloseRecruitmentJobDto } from "../recruitment-jobs.dto";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { ResolvedJobAccess } from "../../collaboration/services/recruitment-access.service";
import { RecruitmentNotificationQueueService } from "../../notifications/recruitment-notification-queue.service";
import {
  buildLifecycleNotificationSelection,
  upsertJobLifecycleNotificationPrefs,
} from "../job-lifecycle-notification-prefs.util";

@Injectable()
export class RecruitmentJobsCloseService {
  private readonly logger = new Logger(RecruitmentJobsCloseService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly notificationQueue: RecruitmentNotificationQueueService
  ) {}

  async closeJob(
    userId: string,
    access: ResolvedJobAccess,
    dto: CloseRecruitmentJobDto
  ): Promise<schema.RecruitmentJob> {
    // Authorization (job.close) was enforced by RecruitmentPermissionGuard;
    // the resolved job is passed in.
    if (access.job.status === "closed") {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.ALREADY_CLOSED
      );
    }

    const now = toUTC();
    const table = schema.recruitmentJobsSchema;

    const updateData: Record<string, unknown> = {
      status: "closed",
      closedAt: now,
      updatedAt: now,
      updatedBy: userId,
    };

    if (dto.reason) {
      updateData.closedReason = dto.reason;
    }

    const [updated] = await this.db
      .update(table)
      .set(updateData)
      .where(eq(table.id, access.job.id))
      .returning();

    const notificationSelection = buildLifecycleNotificationSelection(
      dto.sendNotifications,
      dto.candidateStageKeys
    );

    try {
      await upsertJobLifecycleNotificationPrefs(
        this.db,
        access.job.id,
        userId,
        { lastClose: notificationSelection }
      );
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CLOSE :: SAVE_PREFS : ERROR : ${error}`
      );
    }

    if (dto.sendNotifications) {
      try {
        await this.notificationQueue.queueJobClosedNotification({
          jobId: access.job.id,
          closedByUserId: userId,
          closeReason: dto.reason,
          candidateStageKeys: dto.candidateStageKeys ?? [],
        });
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_JOBS_CLOSE :: CLOSE_JOB : ERROR : ${error}`
        );
      }
    }

    return updated;
  }
}
