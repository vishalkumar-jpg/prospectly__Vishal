import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class TrustScoreFeedbackService {
  private readonly logger = new Logger(TrustScoreFeedbackService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getMyFeedback(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    feedbacks: Array<{
      id: string;
      rating: number;
      feedbackText: string | null;
      feedbackFromUser: {
        id: string;
        fullName: string | null;
        company: string | null;
        profilePhotoUrl: string | null;
      };
      introductionRequest: {
        id: string;
        contactName: string;
      };
      createdAt: string;
    }>;
    stats: {
      averageRating: number;
      totalCount: number;
      ratingDistribution: { [rating: number]: number };
    };
  }> {
    // Get all feedback where user is the recipient
    const allFeedback = await this.db.query.introductionFeedback.findMany({
      where: eq(schema.introductionFeedback.feedbackToUserId, userId),
      orderBy: [desc(schema.introductionFeedback.createdAt)],
      with: {
        profile_feedbackFromUserId: {
          columns: {
            id: true,
            fullName: true,
            company: true,
            profilePhotoUrl: true,
          },
        },
        introductionRequest: {
          columns: {
            id: true,
            contactName: true,
          },
        },
      },
    });

    // Filter out incomplete feedback (missing relations) before calculating stats
    const validFeedback = allFeedback.filter(
      (feedback) =>
        feedback.profile_feedbackFromUserId && feedback.introductionRequest
    );

    // Calculate statistics based on valid feedback only
    const totalCount = validFeedback.length;
    const ratings = validFeedback.map((f) => Number(f.rating));
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

    // Calculate rating distribution
    const ratingDistribution: { [rating: number]: number } = {};
    for (const rating of ratings) {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    }

    // Paginate valid feedback
    const paginatedFeedback = validFeedback.slice(offset, offset + limit);

    // Format feedback data
    const feedbacks = paginatedFeedback.map((feedback) => {
      const f = feedback as AnyType;
      return {
        id: f.id,
        rating: Number(f.rating),
        feedbackText: f.feedbackText,
        feedbackFromUser: {
          id: f.profile_feedbackFromUserId?.id,
          fullName: f.profile_feedbackFromUserId?.fullName,
          company: f.profile_feedbackFromUserId?.company || null,
          profilePhotoUrl:
            f.profile_feedbackFromUserId?.profilePhotoUrl || null,
        },
        introductionRequest: {
          id: f.introductionRequest?.id,
          contactName: f.introductionRequest?.contactName || "",
        },
        createdAt: f.createdAt.toISOString(),
      };
    });

    return {
      feedbacks,
      stats: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalCount,
        ratingDistribution,
      },
    };
  }

  /**
   * Get feedback statistics only
   */
  async getMyStats(userId: string): Promise<{
    averageRating: number;
    totalCount: number;
    ratingDistribution: { [rating: number]: number };
  }> {
    const allFeedback = await this.db.query.introductionFeedback.findMany({
      where: eq(schema.introductionFeedback.feedbackToUserId, userId),
      columns: {
        rating: true,
      },
    });

    const totalCount = allFeedback.length;
    const ratings = allFeedback.map((f) => Number(f.rating));
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

    // Calculate rating distribution
    const ratingDistribution: { [rating: number]: number } = {};
    for (const rating of ratings) {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalCount,
      ratingDistribution,
    };
  }
}
