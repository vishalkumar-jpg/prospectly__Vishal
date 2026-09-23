import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { FeedbackTrustScoreJobData } from "./trust-score-queue.types";

interface FeedbackStats {
  reviewCount: number;
  averageRating: number;
}

@Injectable()
export class FeedbackTrustScoreService {
  private readonly logger = new Logger(FeedbackTrustScoreService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Calculate average peer feedback rating and review count for a connector
   */
  async calculateFeedbackStats(connectorId: string): Promise<FeedbackStats> {
    this.logger.log(`Calculating feedback stats for connector ${connectorId}`);

    // Get all peer feedback for this connector
    const allPeerFeedback = await this.db
      .select()
      .from(schema.introductionFeedback)
      .where(
        and(
          eq(schema.introductionFeedback.feedbackToUserId, connectorId),
          eq(schema.introductionFeedback.feedbackType, "peer_feedback")
        )
      );

    if (allPeerFeedback.length === 0) {
      return {
        reviewCount: 0,
        averageRating: 0,
      };
    }

    const ratings = allPeerFeedback
      .map((f) => Number(f.rating))
      .filter((r) => !isNaN(r));

    const reviewCount = ratings.length;
    const averageRating =
      reviewCount > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount
        : 0;

    this.logger.log(
      `Connector ${connectorId} has ${reviewCount} reviews with average rating ${averageRating.toFixed(2)}`
    );

    return {
      reviewCount,
      averageRating,
    };
  }

  /**
   * Calculate net points for positive_peer_reviews rule
   * Net Points = (Total ADD points) - (Total SUBTRACT points)
   */
  async getNetPointsForPeerReviews(
    connectorId: string,
    ruleId: string
  ): Promise<number> {
    const history = await this.db
      .select()
      .from(schema.userTrustScoreHistory)
      .where(
        and(
          eq(schema.userTrustScoreHistory.userId, connectorId),
          eq(schema.userTrustScoreHistory.ruleId, ruleId)
        )
      );

    let netPoints = 0;
    for (const entry of history) {
      const change = Number(entry.pointsChange);
      netPoints += change;
    }

    this.logger.log(
      `Net points for connector ${connectorId}, rule ${ruleId}: ${netPoints}`
    );

    return netPoints;
  }

  /**
   * Get the active positive_peer_reviews rule
   */
  async getPeerReviewsRule(): Promise<schema.TrustScoreRule | null> {
    const rule = await this.db.query.trustScoreRules.findFirst({
      where: and(
        eq(schema.trustScoreRules.triggerEvent, "positive_peer_reviews"),
        eq(schema.trustScoreRules.isActive, true),
        isNull(schema.trustScoreRules.deletedAt)
      ),
    });

    return rule || null;
  }

  /**
   * Award peer review credit to connector
   */
  private async awardPeerReviewCredit(
    connectorId: string,
    rule: schema.TrustScoreRule,
    stats: FeedbackStats
  ): Promise<void> {
    this.logger.log(`Awarding peer review credit to connector ${connectorId}`);

    // Get current user score
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, connectorId),
    });

    if (!user) {
      throw new Error(`Connector profile not found: ${connectorId}`);
    }

    const currentScore = user.trustScore ? Number(user.trustScore) : 0;
    const rulePoints = Number(rule.points);
    const newScore = Math.min(10, currentScore + rulePoints);
    const pointsChange = rulePoints;

    // Record history and update score in a transaction
    await this.db.transaction(async (tx) => {
      // Record history
      // Get rule configuration for thresholds
      const configParams = rule.configParams as Record<string, unknown>;
      const minReviews = Number(configParams.min_reviews || 2);
      const minAvgRating = Number(configParams.min_avg_rating || 4);

      await tx.insert(schema.userTrustScoreHistory).values({
        userId: connectorId,
        ruleId: rule.id,
        previousScore: currentScore.toString(),
        newScore: newScore.toString(),
        pointsChange: pointsChange.toString(),
        actionType: "ADD",
        evidence: {
          reviewCount: stats.reviewCount,
          averageRating: stats.averageRating,
          minReviews,
          minAvgRating,
          reason: "peer_feedback_threshold_met",
        },
        triggeredBy: "SYSTEM",
        triggeredAt: toUTC(),
      });

      // Update user score
      await tx
        .update(schema.users)
        .set({
          trustScore: newScore,
          updatedAt: toUTC(),
        })
        .where(eq(schema.users.id, connectorId));
    });

    this.logger.log(
      `Awarded ${pointsChange} points to connector ${connectorId}: ${currentScore} -> ${newScore} (${stats.reviewCount} reviews, avg ${stats.averageRating.toFixed(2)})`
    );
  }

  /**
   * Deduct peer review credit from connector
   */
  private async deductPeerReviewCredit(
    connectorId: string,
    rule: schema.TrustScoreRule,
    stats: FeedbackStats,
    netPoints: number
  ): Promise<void> {
    this.logger.log(
      `Deducting peer review credit from connector ${connectorId}`
    );

    // Get current user score
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, connectorId),
    });

    if (!user) {
      throw new Error(`Connector profile not found: ${connectorId}`);
    }

    const currentScore = user.trustScore ? Number(user.trustScore) : 0;
    const pointsToDeduct = netPoints; // Deduct the net points
    const newScore = Math.max(0, currentScore - pointsToDeduct);
    const pointsChange = -pointsToDeduct;

    // Record history and update score in a transaction
    await this.db.transaction(async (tx) => {
      // Record history
      // Get rule configuration for thresholds
      const configParams = rule.configParams as Record<string, unknown>;
      const minReviews = Number(configParams.min_reviews || 2);
      const minAvgRating = Number(configParams.min_avg_rating || 4);

      await tx.insert(schema.userTrustScoreHistory).values({
        userId: connectorId,
        ruleId: rule.id,
        previousScore: currentScore.toString(),
        newScore: newScore.toString(),
        pointsChange: pointsChange.toString(),
        actionType: "SUBTRACT",
        evidence: {
          reviewCount: stats.reviewCount,
          averageRating: stats.averageRating,
          minReviews,
          minAvgRating,
          reason: "peer_feedback_threshold_not_met",
          netPointsBeforeDeduction: netPoints,
        },
        triggeredBy: "SYSTEM",
        triggeredAt: toUTC(),
      });

      // Update user score
      await tx
        .update(schema.users)
        .set({
          trustScore: newScore,
          updatedAt: toUTC(),
        })
        .where(eq(schema.users.id, connectorId));
    });

    this.logger.log(
      `Deducted ${pointsToDeduct} points from connector ${connectorId}: ${currentScore} -> ${newScore} (${stats.reviewCount} reviews, avg ${stats.averageRating.toFixed(2)})`
    );
  }

  /**
   * Main processing method - handles toggle logic for peer review credits
   */
  async processFeedbackTrustScore(
    jobData: FeedbackTrustScoreJobData
  ): Promise<void> {
    const { connectorId, feedbackId, requestId } = jobData;

    this.logger.log(
      `Processing feedback trust score for connector ${connectorId}, feedback ${feedbackId}, request ${requestId}`
    );

    try {
      // 1. Get the positive_peer_reviews rule
      const rule = await this.getPeerReviewsRule();
      if (!rule) {
        this.logger.warn(
          "No active positive_peer_reviews rule found - skipping"
        );
        return;
      }

      // 2. Get rule configuration
      const configParams = rule.configParams as Record<string, unknown>;
      const minReviews = Number(configParams.min_reviews || 2);
      const minAvgRating = Number(configParams.min_avg_rating || 4);

      this.logger.log(
        `Rule config: min_reviews=${minReviews}, min_avg_rating=${minAvgRating}`
      );

      // 3. Calculate feedback stats
      const stats = await this.calculateFeedbackStats(connectorId);

      // 4. Get current net points for this rule
      const netPoints = await this.getNetPointsForPeerReviews(
        connectorId,
        rule.id
      );

      // 5. Determine if threshold is met
      const meetsThreshold =
        stats.reviewCount >= minReviews && stats.averageRating >= minAvgRating;

      this.logger.log(
        `Connector ${connectorId}: ${stats.reviewCount} reviews (need ${minReviews}), avg ${stats.averageRating.toFixed(2)} (need ${minAvgRating}), net points: ${netPoints}, meets threshold: ${meetsThreshold}`
      );

      // 6. Toggle logic
      if (meetsThreshold && netPoints === 0) {
        // Award credit
        await this.awardPeerReviewCredit(connectorId, rule, stats);
      } else if (!meetsThreshold && netPoints > 0) {
        // Deduct credit
        await this.deductPeerReviewCredit(connectorId, rule, stats, netPoints);
      } else if (meetsThreshold && netPoints > 0) {
        // Already has credit and maintains threshold
        this.logger.log(
          `Connector ${connectorId} already has credit and maintains threshold - no action needed`
        );
      } else {
        // Does not meet threshold and has no credit
        this.logger.log(
          `Connector ${connectorId} does not meet threshold and has no credit - no action needed`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing feedback trust score for connector ${connectorId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
