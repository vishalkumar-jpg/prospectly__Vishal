import {
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  Optional,
} from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { TRUST_SCORE_THRESHOLD } from "config/payment.config";
import { MarketplacePayoutService } from "modules/global-marketplace/payout/marketplace-payout.service";
import { MarketplacePayoutHelper } from "modules/global-marketplace/payout/marketplace-payout-helper";
import { MarketplacePayoutQueueService } from "modules/global-marketplace/payout/marketplace-payout-queue.service";
import { PayoutRecordHelper, PayoutProcessorHelper } from "./payout-helper";
import { IntroductionsService } from "../introductions.service";
import { IntroductionNotificationsDispatchService } from "../notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../notifications/introduction-notifications.constants";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
} from "../introductions.constants";

@Injectable()
export class MeetingCompletionService {
  private readonly logger = new Logger(MeetingCompletionService.name);

  constructor(
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    private readonly profilesService: ProfilesService,
    private readonly bountyStagesService: BountyStagesService,
    @Optional()
    private readonly trustScoreQueueService: TrustScoreQueueService,
    private readonly payoutRecordHelper: PayoutRecordHelper,
    private readonly payoutProcessorHelper: PayoutProcessorHelper,
    @Optional()
    private readonly marketplacePayoutService: MarketplacePayoutService,
    @Optional()
    private readonly marketplacePayoutHelper: MarketplacePayoutHelper,
    @Optional()
    private readonly marketplacePayoutQueueService: MarketplacePayoutQueueService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  /**
   * Handles meeting completion acknowledgment by requester
   * Queues trust-score-based payout if connector has high trust score
   */
  async acknowledgeMeetingCompletion(userId: string, requestId: string) {
    // Get the introduction request and verify access
    const request = await this.introductionsService.getIntroductionRequestById(
      userId,
      requestId
    );

    // Verify user is requester
    if (request.requesterId !== userId) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ONLY_REQUESTER_OR_CONNECTOR_ACKNOWLEDGE
      );
    }

    const isRequester = request.requesterId === userId;
    const peerFeedbackStage =
      await this.bountyStagesService.getBountyStageByStageId("peer_feedback");

    // Update the appropriate acknowledgment field
    const updateData: AnyType = {};
    let payoutResult: AnyType = null;

    if (isRequester) {
      updateData.meetingCompletedByRequester = true;
      updateData.status = IntroductionStatus.PEER_FEEDBACK;
      updateData.bountyStagesId = peerFeedbackStage?.id || null;
      updateData.requesterBountyStagesId = peerFeedbackStage?.id || null;
      const connectorId = request.acceptedBy;

      try {
        // Check if this is a marketplace deal
        const isMarketplace = await this.checkIsMarketplaceDeal(requestId);

        if (isMarketplace) {
          // Handle marketplace payout flow
          payoutResult = await this.handleMarketplacePayout(
            requestId,
            connectorId
          );
        } else {
          // Normal payout flow
          payoutResult = await this.handleNormalPayout(
            requestId,
            connectorId,
            request.bountyAmount
          );
        }
      } catch (payoutError) {
        this.logger.error(
          `Failed to queue payout for request ${requestId}: ${payoutError.message}`
        );
      }
    }

    // Update the request
    const updated =
      await this.introductionsService.updateIntroductionRequestInDb(
        requestId,
        updateData
      );

    if (isRequester && updated.acceptedBy) {
      void this.introductionNotificationsDispatch.dispatch({
        requestId,
        type: INTRODUCTION_NOTIFICATION_TYPE.FEEDBACK_REQUEST,
      });
    }

    // Trigger success rate calculation for connector when requester marks as completed
    if (isRequester && updated.acceptedBy && this.trustScoreQueueService) {
      try {
        await this.trustScoreQueueService.enqueueSuccessRateTrustScoreCalculation(
          updated.acceptedBy,
          "request_completed",
          requestId
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue success rate calculation for connector ${updated.acceptedBy}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      success: true,
      message: INTRODUCTIONS_MESSAGES.INFO.MEETING_COMPLETION_ACKNOWLEDGED,
      stage: updated.status,
      requesterAcknowledged: updated.meetingCompletedByRequester || false,
      connectorAcknowledged: false, // No connector acknowledgment column exists yet
      payoutStatus: payoutResult,
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
   * Handles marketplace payout flow based on trust score
   */
  private async handleMarketplacePayout(
    requestId: string,
    claimerId: string
  ): Promise<AnyType> {
    if (
      !this.marketplacePayoutService ||
      !this.marketplacePayoutHelper ||
      !this.marketplacePayoutQueueService
    ) {
      this.logger.warn(
        `Marketplace payout services not available for request ${requestId}`
      );
      return null;
    }

    // Check if payout already exists
    const payoutExists =
      await this.marketplacePayoutHelper.checkMarketplacePayoutExists(
        requestId
      );
    if (payoutExists) {
      this.logger.log(
        `Marketplace payout already exists for request ${requestId}`
      );
      return { alreadyProcessed: true };
    }

    // Get deal info for payout
    const dealInfo =
      await this.marketplacePayoutService.getMarketplaceDealInfo(requestId);
    if (!dealInfo) {
      this.logger.error(
        `Failed to get marketplace deal info for request ${requestId}`
      );
      return null;
    }

    // Get claimer trust score (claimer is the connector)
    const trustScore =
      await this.marketplacePayoutHelper.getClaimerTrustScore(claimerId);
    const isImmediatePayout =
      trustScore !== null && trustScore >= TRUST_SCORE_THRESHOLD;

    if (isImmediatePayout) {
      // Queue immediate payout
      const jobId =
        await this.marketplacePayoutQueueService.queueMarketplacePayout(
          requestId
        );
      await this.marketplacePayoutHelper.createQueuedMarketplacePayoutRecord(
        dealInfo,
        jobId,
        trustScore
      );
      return { queued: true, immediate: true, jobId };
    } else {
      // Create deferred payout records - will be processed on peer feedback
      await this.marketplacePayoutHelper.createDeferredMarketplacePayoutRecord(
        dealInfo,
        trustScore
      );
      return { queued: false, deferred: true };
    }
  }

  /**
   * Handles normal (non-marketplace) payout flow
   */
  private async handleNormalPayout(
    requestId: string,
    connectorId: string,
    bountyAmount: number | string
  ): Promise<AnyType> {
    const trustScore = await this.getConnectorTrustScore(connectorId);
    const isImmediatePayout =
      trustScore !== null && trustScore >= TRUST_SCORE_THRESHOLD;

    if (isImmediatePayout) {
      return this.payoutProcessorHelper.proceedPayout(requestId, trustScore);
    } else {
      // Create deferred payout record
      await this.payoutRecordHelper.createDeferredPayoutRecord(
        requestId,
        connectorId,
        bountyAmount,
        trustScore
      );
      return { queued: false, deferred: true };
    }
  }

  /**
   * Gets connector trust score from profile
   */
  private async getConnectorTrustScore(
    connectorId: string
  ): Promise<number | null> {
    const profile = await this.profilesService.getProfileById(connectorId);
    return profile?.trustScore ?? null;
  }
}
