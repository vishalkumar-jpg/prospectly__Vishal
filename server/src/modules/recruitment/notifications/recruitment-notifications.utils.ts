import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { RECRUITMENT_NOTIFICATION_MESSAGES } from "./recruitment-notifications.constants";

/**
 * Loads a job and asserts the caller owns it and it is active.
 * Shared by the query (preview) and dispatch services.
 */
export async function loadJobForNotification(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  jobId: string
) {
  const [job] = await db
    .select({
      id: schema.recruitmentJobsSchema.id,
      requesterId: schema.recruitmentJobsSchema.requesterId,
      status: schema.recruitmentJobsSchema.status,
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
    throw new NotFoundException(
      RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.JOB_NOT_FOUND
    );
  }
  if (job.requesterId !== userId) {
    throw new ForbiddenException(
      RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.NOT_JOB_OWNER
    );
  }
  if (job.status !== "active") {
    throw new BadRequestException(
      RECRUITMENT_NOTIFICATION_MESSAGES.ERROR.JOB_NOT_ACTIVE
    );
  }
  return job;
}
