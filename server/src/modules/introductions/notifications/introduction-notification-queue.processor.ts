import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import {
  INTRODUCTION_NOTIFICATION_QUEUE_JOBS,
  INTRODUCTION_NOTIFICATION_QUEUE_NAME,
  INTRODUCTION_NOTIFICATION_TYPE,
} from "./introduction-notifications.constants";
import { IntroductionLifecycleNotificationJobData } from "./introduction-notification-queue.service";
import { processConnectorRequestRaised } from "./processors/connector-request-raised.processor-helper";
import { processFeedbackRequest } from "./processors/feedback-request.processor-helper";
import { processRequesterMeetingAck } from "./processors/requester-meeting-ack.processor-helper";
import { processSharerRequestClaimed } from "./processors/sharer-request-claimed.processor-helper";
import { processRequesterRequestUnsuccessful } from "./processors/requester-unsuccessful.processor-helper";
import { processSingleRecipientByType } from "./processors/single-recipient.processor-helper";

@Processor(INTRODUCTION_NOTIFICATION_QUEUE_NAME)
export class IntroductionNotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    IntroductionNotificationQueueProcessor.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailsService: EmailsService
  ) {
    super();
  }

  async process(
    job: Job<IntroductionLifecycleNotificationJobData>
  ): Promise<void> {
    if (job.name !== INTRODUCTION_NOTIFICATION_QUEUE_JOBS.SEND_LIFECYCLE) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    const { requestId, type, claimId } = job.data;
    this.logger.log(
      `Processing introduction notification ${type} for request ${requestId}${claimId ? ` (claim ${claimId})` : ""}`
    );

    try {
      await this.handleNotification(requestId, type, claimId);
    } catch (error) {
      this.logger.error(
        `INTRO_NOTIFICATION_PROCESSOR :: PROCESS : ERROR : ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  private async handleNotification(
    requestId: string,
    type: IntroductionLifecycleNotificationJobData["type"],
    claimId?: string
  ): Promise<void> {
    switch (type) {
      case INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED:
        await processConnectorRequestRaised(
          this.db,
          this.emailsService,
          this.logger,
          requestId
        );
        break;
      case INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_CONNECTOR_ACCEPTED:
      case INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_INTRO_SENT:
        await processSingleRecipientByType(
          this.db,
          this.emailsService,
          this.logger,
          requestId,
          type
        );
        break;
      case INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_MEETING_ACK:
        await processRequesterMeetingAck(
          this.db,
          this.emailsService,
          this.logger,
          requestId
        );
        break;
      case INTRODUCTION_NOTIFICATION_TYPE.FEEDBACK_REQUEST:
        await processFeedbackRequest(
          this.db,
          this.emailsService,
          this.logger,
          requestId
        );
        break;
      case INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_REQUEST_UNSUCCESSFUL:
        await processRequesterRequestUnsuccessful(
          this.db,
          this.emailsService,
          this.logger,
          requestId
        );
        break;
      case INTRODUCTION_NOTIFICATION_TYPE.SHARER_REQUEST_CLAIMED:
        if (!claimId) {
          this.logger.warn(
            `INTRO_NOTIFICATION :: sharer_request_claimed :: missing claimId for request ${requestId}`
          );
          break;
        }
        await processSharerRequestClaimed(
          this.db,
          this.emailsService,
          this.logger,
          requestId,
          claimId
        );
        break;
      default:
        this.logger.warn(`Unhandled introduction notification type: ${type}`);
    }
  }
}
