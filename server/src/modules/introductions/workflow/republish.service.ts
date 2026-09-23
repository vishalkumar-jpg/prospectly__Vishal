import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PaymentReauthorizationService } from "modules/payments/payment-reauthorization.service";
import { IntroductionNotificationsDispatchService } from "modules/introductions/notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "modules/introductions/notifications/introduction-notifications.constants";
import {
  getFailedConnectorIds,
  getFulfillmentAttemptCount,
  hasEligibleConnectorsForRepublish,
  restoreArchivedConnectorsForRetry,
  updateNeedsRepublishFlag,
} from "./unfulfillment.helpers";
import { IntroductionStatus } from "../introductions.constants";

@Injectable()
export class RepublishService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly paymentReauthorizationService: PaymentReauthorizationService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  async republishRequest(
    userId: string,
    requestId: string
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
    });

    if (!request) {
      throw new NotFoundException("Introduction request not found");
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException(
        "Only the requester can re-publish this introduction request."
      );
    }

    if (request.requesterArchived) {
      throw new BadRequestException(
        "Archived introduction requests cannot be re-published."
      );
    }

    if (request.status !== IntroductionStatus.PENDING) {
      throw new BadRequestException(
        "Only pending introduction requests can be re-published."
      );
    }

    if (!request.needsRepublish) {
      throw new BadRequestException(
        "This request does not need to be re-published. Move it to the marketplace if no private connectors remain."
      );
    }

    const eligibleForRepublish = await hasEligibleConnectorsForRepublish(
      this.db,
      requestId
    );
    if (!eligibleForRepublish) {
      throw new BadRequestException(
        "No eligible connectors remain. Move this request to the marketplace instead."
      );
    }

    const [attempt] = await this.db
      .select({ id: schema.introductionFulfillmentAttempts.id })
      .from(schema.introductionFulfillmentAttempts)
      .where(
        eq(
          schema.introductionFulfillmentAttempts.introductionRequestId,
          requestId
        )
      )
      .limit(1);

    if (!attempt) {
      throw new BadRequestException(
        "This request has no unsuccessful attempts to recover from."
      );
    }

    if (!request.requesterId) {
      throw new BadRequestException("Introduction request has no requester.");
    }

    const notificationCycle = await getFulfillmentAttemptCount(
      this.db,
      requestId
    );

    await this.paymentReauthorizationService.ensureAuthorizedForRepublish(
      requestId,
      request.requesterId
    );

    const excludedConnectorIds = await getFailedConnectorIds(
      this.db,
      requestId
    );

    let restoredCount = 0;
    await this.db.transaction(async (tx) => {
      restoredCount = await restoreArchivedConnectorsForRetry(
        tx,
        requestId,
        excludedConnectorIds
      );
      await updateNeedsRepublishFlag(tx, requestId, false);
    });

    if (restoredCount > 0) {
      void this.introductionNotificationsDispatch.dispatch({
        requestId,
        type: INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED,
        notificationCycle,
      });
    }

    return {
      success: true,
      message:
        "Your introduction request has been re-published. Eligible connectors have been notified.",
    };
  }

  async needsRepublish(requestId: string): Promise<boolean> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
      columns: {
        needsRepublish: true,
        requesterArchived: true,
        status: true,
      },
    });

    if (
      !request ||
      request.requesterArchived ||
      request.status !== IntroductionStatus.PENDING
    ) {
      return false;
    }

    return request.needsRepublish ?? false;
  }
}
