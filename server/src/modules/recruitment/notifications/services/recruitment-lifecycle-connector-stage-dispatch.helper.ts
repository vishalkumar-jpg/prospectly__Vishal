import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import type {
  ConnectorStageProgressNotificationType,
  RecruitmentLifecycleJobData,
} from "../recruitment-lifecycle-notifications.constants";
import { RecruitmentNotificationQueueService } from "../recruitment-notification-queue.service";

async function queueLifecycleJob(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  data: RecruitmentLifecycleJobData
): Promise<void> {
  try {
    await queueService.queueLifecycleNotification(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists") || message.includes("JobId")) {
      logger.warn(
        `RECRUITMENT_LIFECYCLE_DISPATCH :: duplicate job skipped type=${data.type}`
      );
      return;
    }
    logger.error(
      `RECRUITMENT_LIFECYCLE_DISPATCH :: queueLifecycleJob : ERROR : ${message}`
    );
    throw error;
  }
}

/**
 * Queue connector emails for stage progress (invite sent / scheduled / completed).
 * Recipients are every active row in recruitment_candidate_connectors.
 */
export async function dispatchConnectorStageProgressNotifications(
  db: PostgresJsDatabase<typeof schema>,
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  candidateId: string,
  type: ConnectorStageProgressNotificationType
): Promise<void> {
  const connectors = await db
    .select({
      connectorUserId: schema.recruitmentCandidateConnectors.connectorUserId,
    })
    .from(schema.recruitmentCandidateConnectors)
    .where(
      and(
        eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
        isNull(schema.recruitmentCandidateConnectors.deletedAt)
      )
    );

  for (const connector of connectors) {
    await queueLifecycleJob(queueService, logger, {
      type,
      candidateId,
      recipientId: connector.connectorUserId,
    });
  }
}
