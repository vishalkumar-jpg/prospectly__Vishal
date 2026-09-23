import { db } from "database/db";
import {
  introductionFeedback,
  introductionRequests,
  payoutHistory,
  bountyStages,
} from "database/schema";
import { eq, and } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

interface SubmitFeedbackParams {
  introductionRequestId: string;
  userId: string;
  rating: number;
  feedbackText?: string;
  meetingCompleted?: boolean;
  feedbackType: "meeting_feedback" | "peer_feedback";
}

interface UpdateFeedbackParams {
  feedbackId: string;
  rating: number;
  feedbackText?: string;
  meetingCompleted?: boolean;
}

export class FeedbackService {
  /**
   * Check if user is the requester for the introduction
   */
  async isRequester(
    introductionRequestId: string,
    userId: string
  ): Promise<boolean> {
    const [introRequest] = await db
      .select({ requesterId: introductionRequests.requesterId })
      .from(introductionRequests)
      .where(eq(introductionRequests.id, introductionRequestId))
      .limit(1);

    return introRequest?.requesterId === userId;
  }

  /**
   * Check if user is the connector for the introduction
   */
  async isConnector(
    introductionRequestId: string,
    userId: string
  ): Promise<boolean> {
    const [introRequest] = await db
      .select({ acceptedBy: introductionRequests.acceptedBy })
      .from(introductionRequests)
      .where(eq(introductionRequests.id, introductionRequestId))
      .limit(1);

    return introRequest?.acceptedBy === userId;
  }

  /**
   * Get the other party's user ID (the person receiving feedback)
   */
  async getFeedbackToUserId(
    introductionRequestId: string,
    userId: string
  ): Promise<string | null> {
    const [introRequest] = await db
      .select({
        requesterId: introductionRequests.requesterId,
        acceptedBy: introductionRequests.acceptedBy,
      })
      .from(introductionRequests)
      .where(eq(introductionRequests.id, introductionRequestId))
      .limit(1);

    if (!introRequest) {
      return null;
    }

    // If user is requester, feedback goes to connector
    if (introRequest.requesterId === userId) {
      return introRequest.acceptedBy;
    }

    // If user is connector, feedback goes to requester
    if (introRequest.acceptedBy === userId) {
      return introRequest.requesterId;
    }

    return null;
  }

  /**
   * Get existing feedback for a user and introduction
   */
  async getExistingFeedback(
    introductionRequestId: string,
    userId: string,
    feedbackType: "meeting_feedback" | "peer_feedback"
  ) {
    const [feedback] = await db
      .select({
        id: introductionFeedback.id,
        rating: introductionFeedback.rating,
        feedbackText: introductionFeedback.feedbackText,
        meetingCompleted: introductionFeedback.meetingCompleted,
      })
      .from(introductionFeedback)
      .where(
        and(
          eq(introductionFeedback.introductionId, introductionRequestId),
          eq(introductionFeedback.feedbackFromUserId, userId),
          eq(introductionFeedback.feedbackType, feedbackType)
        )
      )
      .limit(1);

    return feedback || null;
  }

  /**
   * Create new feedback entry
   */
  async createFeedback(params: SubmitFeedbackParams) {
    const {
      introductionRequestId,
      userId,
      rating,
      feedbackText,
      meetingCompleted,
      feedbackType,
    } = params;

    // Get the user receiving feedback
    const feedbackToUserId = await this.getFeedbackToUserId(
      introductionRequestId,
      userId
    );

    if (!feedbackToUserId) {
      throw new Error("Could not determine feedback recipient");
    }

    // Create the feedback
    const [feedback] = await db
      .insert(introductionFeedback)
      .values({
        introductionId: introductionRequestId,
        feedbackFromUserId: userId,
        feedbackToUserId,
        rating: rating.toString(),
        feedbackText: feedbackText || null,
        meetingCompleted:
          feedbackType === "meeting_feedback"
            ? (meetingCompleted ?? false)
            : false,
        feedbackCategory: "introduction_quality",
        feedbackType,
      })
      .returning();

    return feedback;
  }

  /**
   * Update existing feedback
   */
  async updateFeedback(params: UpdateFeedbackParams) {
    const { feedbackId, rating, feedbackText, meetingCompleted } = params;

    const [updatedFeedback] = await db
      .update(introductionFeedback)
      .set({
        rating: rating.toString(),
        feedbackText: feedbackText || null,
        meetingCompleted: meetingCompleted ?? false,
        updatedAt: toUTC(),
      })
      .where(eq(introductionFeedback.id, feedbackId))
      .returning();

    return updatedFeedback;
  }

  /**
   * Get the platform_fee stage ID
   */
  async getPlatformFeeStageId(): Promise<string | null> {
    const [stage] = await db
      .select({ id: bountyStages.id })
      .from(bountyStages)
      .where(eq(bountyStages.stageId, "platform_fee"))
      .limit(1);

    return stage?.id || null;
  }

  /**
   * Mark requester feedback as completed and advance to platform_fee stage
   * Also archives the request for the requester
   */
  async markRequesterFeedbackCompleted(introductionRequestId: string) {
    // Get the platform_fee stage ID
    const platformFeeStageId = await this.getPlatformFeeStageId();

    if (!platformFeeStageId) {
      throw new Error("Platform fee stage not found in database");
    }

    // Update the introduction request: mark feedback complete, advance stage, and archive for requester
    await db
      .update(introductionRequests)
      .set({
        requesterFeedbackCompleted: true,
        requesterBountyStagesId: platformFeeStageId,
        requesterArchived: true,
        updatedAt: toUTC(),
      })
      .where(eq(introductionRequests.id, introductionRequestId));

    // TODO: Stripe integration - Apply final 20% platform fee deduction from escrow
  }

  /**
   * Mark connector feedback as completed and archive for connector
   * Note: Connector doesn't have a separate bounty_stages_id field in the schema
   */
  async markConnectorFeedbackCompleted(introductionRequestId: string) {
    // Update the introduction request: mark feedback complete and archive for connector
    await db
      .update(introductionRequests)
      .set({
        connectorFeedbackSubmitted: true,
        connectorFeedbackCompleted: true,
        connectorArchived: true,
        updatedAt: toUTC(),
      })
      .where(eq(introductionRequests.id, introductionRequestId));

    // TODO: Stripe integration - Release connector payout (80% of bounty after platform fee)
  }

  /**
   * Get introduction request details for payout eligibility check
   */
  async getIntroductionRequestDetails(introductionRequestId: string) {
    const [payout] = await db
      .select({
        payoutEligible: payoutHistory.payoutEligible,
        payoutReleased: payoutHistory.payoutReleased,
      })
      .from(payoutHistory)
      .where(eq(payoutHistory.introductionRequestId, introductionRequestId))
      .limit(1);

    return payout || null;
  }
}

export const feedbackService = new FeedbackService();
