import { Injectable, Logger } from "@nestjs/common";
import { IntroductionNotificationQueueService } from "./introduction-notification-queue.service";
import {
  INTRODUCTION_NOTIFICATION_TYPE,
  IntroductionNotificationType,
} from "./introduction-notifications.constants";
import { resolveIntroductionNotificationJobId } from "./introduction-notification-job-id.util";

@Injectable()
export class IntroductionNotificationsDispatchService {
  private readonly logger = new Logger(
    IntroductionNotificationsDispatchService.name
  );

  constructor(
    private readonly queueService: IntroductionNotificationQueueService
  ) {}

  async dispatch(params: {
    requestId: string;
    type: IntroductionNotificationType;
    claimId?: string;
    notificationCycle?: number;
  }): Promise<void> {
    const { requestId, type, claimId, notificationCycle } = params;
    if (
      type === INTRODUCTION_NOTIFICATION_TYPE.SHARER_REQUEST_CLAIMED &&
      !claimId
    ) {
      this.logger.error(
        `INTRO_NOTIFICATIONS_DISPATCH :: dispatch : ERROR : SHARER_REQUEST_CLAIMED requires claimId`
      );
      return;
    }
    try {
      await this.queueService.queueLifecycleNotification({
        requestId,
        type,
        claimId,
        notificationCycle,
      });
    } catch (error) {
      const jobId = resolveIntroductionNotificationJobId({
        requestId,
        type,
        claimId,
        notificationCycle,
      });
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists") || message.includes("JobId")) {
        this.logger.warn(`Introduction notification already queued: ${jobId}`);
        return;
      }
      this.logger.error(
        `INTRO_NOTIFICATIONS_DISPATCH :: dispatch : ERROR : ${message}`
      );
    }
  }
}
