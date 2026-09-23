import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import {
  dispatchHireNotifications,
  dispatchPayoutSetupNotification,
  dispatchPayoutReleasedNotification,
  dispatchRecruiterNewCandidateNotification,
  dispatchRejectNotifications,
  dispatchShortlistNotifications,
} from "./recruitment-lifecycle-dispatch.helper";
import { dispatchConnectorStageProgressNotifications } from "./recruitment-lifecycle-connector-stage-dispatch.helper";
import { RecruitmentNotificationQueueService } from "../recruitment-notification-queue.service";
import { RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES } from "../recruitment-lifecycle-notifications.constants";

@Injectable()
export class RecruitmentLifecycleNotificationDispatchService {
  private readonly logger = new Logger(
    RecruitmentLifecycleNotificationDispatchService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queueService: RecruitmentNotificationQueueService
  ) {}

  async dispatchRecruiterNewCandidate(candidateId: string): Promise<void> {
    await dispatchRecruiterNewCandidateNotification(
      this.queueService,
      this.logger,
      candidateId
    );
  }

  async dispatchShortlist(
    candidateId: string,
    sentByUserId?: string
  ): Promise<void> {
    await dispatchShortlistNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      sentByUserId
    );
  }

  async dispatchInterviewInviteSent(candidateId: string): Promise<void> {
    await dispatchConnectorStageProgressNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_INVITE_SENT_CONNECTOR
    );
  }

  async dispatchInterviewScheduled(candidateId: string): Promise<void> {
    await dispatchConnectorStageProgressNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_SCHEDULED_CONNECTOR
    );
  }

  async dispatchInterviewCompleted(candidateId: string): Promise<void> {
    await dispatchConnectorStageProgressNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_COMPLETED_CONNECTOR
    );
  }

  async dispatchHire(
    candidateId: string,
    sentByUserId?: string
  ): Promise<void> {
    await dispatchHireNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      sentByUserId
    );
  }

  async dispatchPayoutSetup(
    payoutId: string,
    recipientId: string
  ): Promise<void> {
    await dispatchPayoutSetupNotification(
      this.queueService,
      this.logger,
      payoutId,
      recipientId
    );
  }

  async dispatchPayoutReleased(
    payoutId: string,
    recipientId: string,
    releasedAt: string,
    sentByUserId?: string
  ): Promise<void> {
    await dispatchPayoutReleasedNotification(
      this.queueService,
      this.logger,
      payoutId,
      recipientId,
      releasedAt,
      sentByUserId
    );
  }

  async dispatchReject(
    candidateId: string,
    rejectionCategory: string,
    rejectionNote: string,
    rejectedByUserId: string
  ): Promise<void> {
    await dispatchRejectNotifications(
      this.db,
      this.queueService,
      this.logger,
      candidateId,
      rejectionCategory,
      rejectionNote,
      rejectedByUserId
    );
  }
}
