import {
  ForbiddenException,
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { IntroductionNotificationsDispatchService } from "modules/introductions/notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "modules/introductions/notifications/introduction-notifications.constants";
import { SystemConfigurationService } from "modules/system-configuration/system-configuration.service";
import { NameSlug } from "modules/system-configuration/system-configuration.constants";
import { parseUnsuccessfulEnabledTimePeriodDays } from "modules/system-configuration/system-configuration.utils";
import { MarkUnfulfilledDto } from "./workflow.dto";
import {
  markConnectorFailed,
  resetRequestForRetry,
  hasEligibleConnectorsForRepublish,
  updateNeedsRepublishFlag,
  getFulfillmentAttemptCount,
} from "./unfulfillment.helpers";
import { isMarkUnsuccessfulHidden } from "./unsuccessful-time-gate.helper";
import { RefundsService } from "../refunds/refunds.service";
import {
  FAILURE_STAGES,
  REFUND_INITIATOR,
  REFUNDS_MESSAGES,
  FailureStage,
} from "../refunds/refunds.constants";
import { MarkUnfulfilledResult } from "../refunds/refunds.dto";
import { IntroductionStatus } from "../introductions.constants";

const VALID_UNFULFILLMENT_STAGES: string[] = [
  IntroductionStatus.INTRO_SENT,
  IntroductionStatus.MEETING_BOOKED,
  IntroductionStatus.MEETING_RESCHEDULED,
];

@Injectable()
export class UnfulfillmentService {
  private readonly logger = new Logger(UnfulfillmentService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly refundsService: RefundsService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService,
    private readonly systemConfigurationService: SystemConfigurationService
  ) {}

  /**
   * Mark an introduction request as unfulfilled by the connector.
   * This triggers refunds and allows another connector to retry.
   */
  async markUnfulfilled(
    userId: string,
    requestId: string,
    dto: MarkUnfulfilledDto
  ): Promise<MarkUnfulfilledResult> {
    // Step 1: Get the introduction request
    const request = await this.getRequestWithValidation(requestId);

    // Step 2: Validate the user is the accepted connector
    this.validateAcceptedConnector(userId, request);

    await this.validateUnsuccessfulTimeGate(request.createdAt);

    // Step 3: Validate the request is in a valid stage for unfulfillment
    const failureStage = this.validateAndGetFailureStage(request.status);

    // Step 4: Commit DB changes in a transaction (NO Stripe/network calls)
    await this.db.transaction(async (tx) => {
      // Record the fulfillment attempt
      await this.refundsService.recordFulfillmentAttempt(
        requestId,
        userId,
        failureStage,
        dto.failureReason,
        dto.failureNotes,
        tx
      );

      await markConnectorFailed(tx, requestId, userId);
      await resetRequestForRetry(tx, requestId);
      const eligibleForRepublish = await hasEligibleConnectorsForRepublish(
        tx,
        requestId
      );
      await updateNeedsRepublishFlag(tx, requestId, eligibleForRepublish);
    });

    const refundDetails =
      await this.refundsService.processRefundForUnfulfillment(
        requestId,
        failureStage,
        REFUND_INITIATOR.CONNECTOR,
        userId,
        dto.failureReason
      );

    try {
      await this.introductionNotificationsDispatch.dispatch({
        requestId,
        type: INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_REQUEST_UNSUCCESSFUL,
        notificationCycle: await getFulfillmentAttemptCount(this.db, requestId),
      });
    } catch (error) {
      this.logger.error(
        `UNFULFILLMENT_SERVICE :: markUnfulfilled : ERROR : ${error instanceof Error ? error.message : error}`
      );
    }

    return {
      success: true,
      message: REFUNDS_MESSAGES.SUCCESS.MARKED_UNFULFILLED,
      refundDetails,
    };
  }

  /**
   * Get the introduction request with full details for validation.
   */
  private async getRequestWithValidation(
    requestId: string
  ): Promise<schema.IntroductionRequest> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
    });

    if (!request) {
      throw new BadRequestException("Introduction request not found");
    }

    return request;
  }

  /**
   * Block mark-unfulfilled during the configured hide window after request creation.
   */
  private async validateUnsuccessfulTimeGate(
    createdAt: Date | null | undefined
  ): Promise<void> {
    const config = await this.systemConfigurationService.getConfigurationBySlug(
      NameSlug.UnsuccessfulEnabledTimePeriod
    );
    const periodDays = parseUnsuccessfulEnabledTimePeriodDays(config?.value);

    if (isMarkUnsuccessfulHidden(createdAt, periodDays)) {
      throw new ForbiddenException(
        "Mark as Unsuccessful is not available yet for this request"
      );
    }
  }

  /**
   * Validate that the user is the connector who accepted this request.
   */
  private validateAcceptedConnector(
    userId: string,
    request: schema.IntroductionRequest
  ): void {
    if (request.acceptedBy !== userId) {
      throw new ForbiddenException(
        REFUNDS_MESSAGES.ERROR.NOT_ACCEPTED_CONNECTOR
      );
    }
  }

  /**
   * Validate the request is in a valid stage and return the failure stage.
   */
  private validateAndGetFailureStage(status: string | null): FailureStage {
    if (!status || !VALID_UNFULFILLMENT_STAGES.includes(status)) {
      throw new BadRequestException(REFUNDS_MESSAGES.ERROR.INVALID_STAGE);
    }

    // Map request status to failure stage
    if (status === IntroductionStatus.INTRO_SENT) {
      return FAILURE_STAGES.INTRO_SENT;
    }
    return FAILURE_STAGES.MEETING_BOOKED;
  }

  /**
   * Get unfulfilled requests for a connector (requests they failed to fulfill).
   */
  async getUnfulfilledRequestsForConnector(
    connectorId: string
  ): Promise<schema.IntroductionFulfillmentAttempt[]> {
    return this.db.query.introductionFulfillmentAttempts.findMany({
      where: eq(
        schema.introductionFulfillmentAttempts.connectorId,
        connectorId
      ),
    });
  }
}
