import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  INTRODUCTION_NOTIFICATION_QUEUE_JOBS,
  INTRODUCTION_NOTIFICATION_QUEUE_NAME,
  IntroductionNotificationType,
} from "./introduction-notifications.constants";
import { resolveIntroductionNotificationJobId } from "./introduction-notification-job-id.util";

export interface IntroductionLifecycleNotificationJobData {
  requestId: string;
  type: IntroductionNotificationType;
  claimId?: string;
}

@Injectable()
export class IntroductionNotificationQueueService {
  private readonly logger = new Logger(
    IntroductionNotificationQueueService.name
  );

  constructor(
    @InjectQueue(INTRODUCTION_NOTIFICATION_QUEUE_NAME)
    private readonly queue: Queue<IntroductionLifecycleNotificationJobData>
  ) {}

  async queueLifecycleNotification(params: {
    requestId: string;
    type: IntroductionNotificationType;
    claimId?: string;
    notificationCycle?: number;
  }): Promise<void> {
    const { requestId, type, claimId, notificationCycle } = params;
    const jobId = resolveIntroductionNotificationJobId({
      requestId,
      type,
      claimId,
      notificationCycle,
    });
    await this.queue.add(
      INTRODUCTION_NOTIFICATION_QUEUE_JOBS.SEND_LIFECYCLE,
      { requestId, type, claimId },
      { jobId }
    );
    this.logger.log(
      `Queued introduction notification ${type} for request ${requestId}${claimId ? ` (claim ${claimId})` : ""}`
    );
  }
}
