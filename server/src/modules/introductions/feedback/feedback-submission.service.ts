import {
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  Optional,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { AnyType } from "types/common";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { MarketplacePayoutService } from "modules/global-marketplace/payout/marketplace-payout.service";
import { MarketplacePayoutHelper } from "modules/global-marketplace/payout/marketplace-payout-helper";
import { MarketplacePayoutQueueService } from "modules/global-marketplace/payout/marketplace-payout-queue.service";
import { SubmitFeedbackDto } from "./feedback.dto";
import { FeedbackPayoutHelper } from "./payout-helper";
import { IntroductionsService } from "../introductions.service";
import { INTRODUCTIONS_MESSAGES } from "../introductions.constants";

@Injectable()
export class FeedbackSubmissionService {
  private readonly logger = new Logger(FeedbackSubmissionService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    @Optional()
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    private readonly feedbackPayoutHelper: FeedbackPayoutHelper,
    @Optional()
    private readonly marketplacePayoutService: MarketplacePayoutService,
    @Optional()
    private readonly marketplacePayoutHelper: MarketplacePayoutHelper,
    @Optional()
    private readonly marketplacePayoutQueueService: MarketplacePayoutQueueService
  ) {}

  /**
   * Handles feedback submission and queues payout if connector submits peer feedback
   */
  async submitFeedback(
    userId: string,
    requestId: string,
    feedbackData: SubmitFeedbackDto
  ) {
    // Get the introduction request and verify access
    const request = await this.introductionsService.getIntroductionRequestById(
      userId,
      requestId
    );

    // In the multi-connector model:
    // - requesterId = the person who created the request
    // - acceptedBy   = the connector who actually accepted the request
    const isRequester = request.requesterId === userId;
    const isConnector = request.acceptedBy === userId;

    // Verify user is either requester or accepted connector
    if (!isRequester && !isConnector) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ONLY_REQUESTER_OR_CONNECTOR_SUBMIT_FEEDBACK
      );
    }

    // Determine who is giving feedback and who is receiving it
    const feedbackFromUserId = userId;
    const feedbackToUserId = isRequester
      ? request.acceptedBy
      : request.requesterId;

    // Create or update feedback (default behavior)
    const feedback = await this.db
      .insert(schema.introductionFeedback)
      .values({
        introductionId: requestId,
        feedbackFromUserId,
        feedbackToUserId,
        feedbackType: feedbackData.feedbackType,
        rating: feedbackData.rating.toString(),
        feedbackText: feedbackData.feedbackText || null,
        meetingCompleted: feedbackData.meetingCompleted || false,
      })
      .onConflictDoUpdate({
        target: [
          schema.introductionFeedback.introductionId,
          schema.introductionFeedback.feedbackFromUserId,
          schema.introductionFeedback.feedbackType,
        ],
        set: {
          rating: feedbackData.rating.toString(),
          feedbackText: feedbackData.feedbackText || null,
          meetingCompleted: feedbackData.meetingCompleted || false,
          updatedAt: toUTC(),
        },
      })
      .returning();

    const [submitted] = feedback;

    // If this is peer_feedback, archive the request and mark feedback as completed for the respective party
    if (feedbackData.feedbackType === "peer_feedback") {
      const archiveUpdate: AnyType = {};

      if (isRequester) {
        archiveUpdate.requesterArchived = true;
        archiveUpdate.requesterFeedbackCompleted = true;
      }

      if (isConnector) {
        archiveUpdate.connectorArchived = true;
        archiveUpdate.connectorFeedbackCompleted = true;
        archiveUpdate.connectorFeedbackSubmitted = true;
      }

      await this.db
        .update(schema.introductionRequests)
        .set(archiveUpdate)
        .where(eq(schema.introductionRequests.id, requestId));

      // Queue background jobs for trust score calculation and payout
      if (request && this.trustScoreQueueService) {
        await this.trustScoreQueueService.enqueueFeedbackTrustScoreCalculation(
          feedbackToUserId, // connector receiving feedback
          submitted.id, // feedback ID
          requestId,
          {
            feedbackFromUserId: userId,
            rating: feedbackData.rating,
          }
        );
      }

      if (isConnector) {
        try {
          // Check if this is a marketplace deal
          const isMarketplace = await this.checkIsMarketplaceDeal(requestId);

          if (isMarketplace) {
            // Handle marketplace deferred payout
            await this.handleMarketplaceFeedbackPayout(requestId);
          } else {
            // Normal payout flow
            await this.feedbackPayoutHelper.queueFeedbackPayout(requestId);
          }
        } catch (payoutError) {
          this.logger.error(
            `Failed to queue feedback-triggered payout for request ${requestId}: ${payoutError.message}`
          );
        }
      }
    }

    return {
      success: true,
      message: INTRODUCTIONS_MESSAGES.INFO.FEEDBACK_SUBMITTED,
      feedbackId: submitted.id,
    };
  }

  /**
   * Checks if the request is a marketplace deal
   */
  private async checkIsMarketplaceDeal(requestId: string): Promise<boolean> {
    if (!this.marketplacePayoutService) {
      return false;
    }
    return this.marketplacePayoutService.isMarketplaceDeal(requestId);
  }

  /**
   * Handles marketplace payout on connector feedback submission
   * Processes deferred payouts that were created at meeting completion
   */
  private async handleMarketplaceFeedbackPayout(
    requestId: string
  ): Promise<void> {
    if (!this.marketplacePayoutHelper || !this.marketplacePayoutQueueService) {
      this.logger.warn(
        `Marketplace payout services not available for request ${requestId}`
      );
      return;
    }

    // Check if there are deferred marketplace payout records
    const hasDeferredPayout =
      await this.marketplacePayoutHelper.hasDeferredMarketplacePayout(
        requestId
      );

    if (!hasDeferredPayout) {
      this.logger.log(
        `No deferred marketplace payout found for request ${requestId} - may have been processed immediately`
      );
      return;
    }

    // Queue the marketplace payout job
    const jobId =
      await this.marketplacePayoutQueueService.queueMarketplacePayout(
        requestId
      );

    // Update deferred records to queued status
    await this.marketplacePayoutHelper.updateDeferredMarketplacePayoutToQueued(
      requestId,
      jobId
    );

    this.logger.log(
      `Queued marketplace payout job ${jobId} for deferred request ${requestId}`
    );
  }
}
