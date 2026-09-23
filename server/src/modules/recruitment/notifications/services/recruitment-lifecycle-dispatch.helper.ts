import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { RecruitmentNotificationQueueService } from "../recruitment-notification-queue.service";
import {
  RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES,
  type RecruitmentLifecycleJobData,
} from "../recruitment-lifecycle-notifications.constants";

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
    logger.error(`RECRUITMENT_LIFECYCLE_DISPATCH :: queue error: ${message}`);
    throw error;
  }
}

export async function dispatchRecruiterNewCandidateNotification(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  candidateId: string
): Promise<void> {
  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.RECRUITER_NEW_CANDIDATE,
    candidateId,
  });
}

export async function dispatchShortlistNotifications(
  db: PostgresJsDatabase<typeof schema>,
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  candidateId: string,
  sentByUserId?: string
): Promise<void> {
  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CANDIDATE,
    candidateId,
    sentByUserId,
  });

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
      type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CONNECTOR,
      candidateId,
      recipientId: connector.connectorUserId,
      sentByUserId,
    });
  }
}

export async function dispatchHireNotifications(
  db: PostgresJsDatabase<typeof schema>,
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  candidateId: string,
  sentByUserId?: string
): Promise<void> {
  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CANDIDATE,
    candidateId,
    sentByUserId,
  });

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
      type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CONNECTOR,
      candidateId,
      recipientId: connector.connectorUserId,
      sentByUserId,
    });
  }
}

export async function dispatchPayoutSetupNotification(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  payoutId: string,
  recipientId: string
): Promise<void> {
  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_SETUP,
    payoutId,
    recipientId,
  });
}

export async function dispatchPayoutReleasedNotification(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  payoutId: string,
  recipientId: string,
  releasedAt: string,
  sentByUserId?: string
): Promise<void> {
  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_RELEASED,
    payoutId,
    recipientId,
    releasedAt,
    sentByUserId,
  });
}

export async function dispatchRejectNotifications(
  db: PostgresJsDatabase<typeof schema>,
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  candidateId: string,
  rejectionCategory: string,
  rejectionNote: string,
  rejectedByUserId: string
): Promise<void> {
  const note = rejectionNote?.trim() ?? "";
  const rejectionEventId = crypto.randomUUID();

  await queueLifecycleJob(queueService, logger, {
    type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_CANDIDATE,
    candidateId,
    rejectionEventId,
    rejectionCategory,
    rejectionNote: note,
    sentByUserId: rejectedByUserId,
  });

  // Reject emails go to candidate + connectors only (not job collaborators).
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
      type: RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_PARTNER,
      candidateId,
      recipientId: connector.connectorUserId,
      isConnector: true,
      rejectionEventId,
      rejectionCategory,
      rejectionNote: note,
      sentByUserId: rejectedByUserId,
    });
  }
}
