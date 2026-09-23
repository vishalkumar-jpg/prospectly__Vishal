import { ForbiddenException, Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { isPendingRequesterFeedback } from "utils/pending-requester-feedback.util";
import {
  GetReviewsQueryDto,
  ReviewsListResponseDto,
  ReviewResponseDto,
} from "./feedback.dto";
import { IntroductionsService } from "../introductions.service";
import { INTRODUCTIONS_MESSAGES } from "../introductions.constants";

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService
  ) {}

  async getExistingFeedback(
    userId: string,
    requestId: string,
    feedbackType: "meeting_feedback" | "peer_feedback"
  ) {
    this.logger.log(
      `Getting existing feedback for request ${requestId}, type: ${feedbackType}`
    );

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
        INTRODUCTIONS_MESSAGES.ERROR.ONLY_REQUESTER_OR_CONNECTOR_VIEW_FEEDBACK
      );
    }

    // Get existing feedback from the database
    const feedback = await this.getIntroductionFeedback(
      requestId,
      userId,
      feedbackType
    );

    // Return null if no feedback exists yet (instead of throwing 404)
    if (!feedback) {
      return null;
    }

    return {
      id: feedback.id,
      rating: feedback.rating,
      feedbackText: feedback.feedbackText || "",
      meetingCompleted: feedback.meetingCompleted || false,
    };
  }

  async checkPendingFeedback(userId: string) {
    // Get all introduction requests where user is the requester
    const requests =
      await this.introductionsService.getIntroductionRequestsByRequesterId(
        userId
      );

    const pendingFeedbackRequests = requests.filter((req: AnyType) =>
      isPendingRequesterFeedback(req)
    );

    const pendingCount = pendingFeedbackRequests.length;
    const pendingRequestIds = pendingFeedbackRequests.map(
      (req: AnyType) => req.id
    );

    return [
      {
        pending_count: pendingCount,
        pending_request_ids: pendingRequestIds,
      },
    ];
  }

  async getUserReviews(
    userId: string,
    query: GetReviewsQueryDto
  ): Promise<ReviewsListResponseDto> {
    const { page } = query;
    const { limit } = query;
    const offset = (page - 1) * limit;

    // Get total count of reviews for this user
    const totalCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.introductionFeedback)
      .where(eq(schema.introductionFeedback.feedbackToUserId, userId));

    const totalReviews = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalReviews / limit);

    // Calculate average rating from ALL reviews (not just paginated ones)
    const avgRatingResult = await this.db
      .select({
        avgRating: sql<number>`AVG(CAST(${schema.introductionFeedback.rating} AS NUMERIC))`,
      })
      .from(schema.introductionFeedback)
      .where(eq(schema.introductionFeedback.feedbackToUserId, userId));

    const avgRating =
      avgRatingResult[0]?.avgRating !== null
        ? Math.round(Number(avgRatingResult[0]?.avgRating) * 100) / 100
        : undefined;

    // Get paginated reviews with reviewer information
    const reviews = await this.db
      .select({
        id: schema.introductionFeedback.id,
        rating: schema.introductionFeedback.rating,
        feedbackText: schema.introductionFeedback.feedbackText,
        createdAt: schema.introductionFeedback.createdAt,
        reviewerFirstName: schema.users.firstName,
        reviewerLastName: schema.users.lastName,
        reviewerFullName: schema.users.fullName,
      })
      .from(schema.introductionFeedback)
      .innerJoin(
        schema.users,
        eq(schema.introductionFeedback.feedbackFromUserId, schema.users.id)
      )
      .where(eq(schema.introductionFeedback.feedbackToUserId, userId))
      .orderBy(desc(schema.introductionFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform reviews to response format
    const reviewResponses: ReviewResponseDto[] = reviews.map((review) => {
      // Get reviewer name: prefer fullName, fallback to firstName + lastName, fallback to "Anonymous"
      let requesterName = "Anonymous";
      if (review.reviewerFullName) {
        requesterName = review.reviewerFullName;
      } else if (review.reviewerFirstName || review.reviewerLastName) {
        requesterName = [review.reviewerFirstName, review.reviewerLastName]
          .filter(Boolean)
          .join(" ");
      }

      return {
        id: review.id,
        rating: Number(review.rating),
        comments: review.feedbackText || undefined,
        created_at: review.createdAt.toISOString(),
        requester_name: requesterName,
      };
    });

    return {
      reviews: reviewResponses,
      totalReviews,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      avgRating,
    };
  }

  private async getIntroductionFeedback(
    introductionId: string,
    feedbackFromUserId: string,
    feedbackType: "meeting_feedback" | "peer_feedback"
  ) {
    return await this.db.query.introductionFeedback.findFirst({
      where: and(
        eq(schema.introductionFeedback.introductionId, introductionId),
        eq(schema.introductionFeedback.feedbackFromUserId, feedbackFromUserId),
        eq(schema.introductionFeedback.feedbackType, feedbackType)
      ),
    });
  }
}
