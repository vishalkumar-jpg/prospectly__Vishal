import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

interface SuccessRateStats {
  totalAccepted: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
}

@Injectable()
export class SuccessRateTrustScoreService {
  private readonly logger = new Logger(SuccessRateTrustScoreService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Calculate success rate statistics for a connector
   */
  async calculateSuccessRateStats(
    connectorId: string
  ): Promise<SuccessRateStats> {
    // Get all accepted requests for this connector with completion status
    const acceptedRequests = await this.db
      .select({
        requestId: schema.introductionPotentialConnectors.requestId,
        meetingCompleted:
          schema.introductionRequests.meetingCompletedByRequester,
      })
      .from(schema.introductionPotentialConnectors)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.introductionPotentialConnectors.requestId,
          schema.introductionRequests.id
        )
      )
      .where(
        and(
          eq(
            schema.introductionPotentialConnectors.potentialConnectorId,
            connectorId
          ),
          eq(schema.introductionPotentialConnectors.status, "accepted")
        )
      );

    // Get failed attempts for this connector
    const failedAttempts = await this.db
      .select()
      .from(schema.introductionFulfillmentAttempts)
      .where(
        eq(schema.introductionFulfillmentAttempts.connectorId, connectorId)
      );

    // Calculate stats
    const successfulCount = acceptedRequests.filter(
      (r) => r.meetingCompleted === true
    ).length;
    const failedCount = failedAttempts.length;
    const totalAccepted = successfulCount + failedCount;
    const successRate =
      totalAccepted > 0
        ? Number(((successfulCount / totalAccepted) * 100).toFixed(2))
        : 0;

    this.logger.log(
      `Connector ${connectorId}: ${successfulCount} successful, ${failedCount} failed, ${totalAccepted} total, ${successRate.toFixed(2)}% success rate`
    );

    return {
      totalAccepted,
      successfulCount,
      failedCount,
      successRate,
    };
  }

  /**
   * Calculate net points for high_success_rate rule
   * Net Points = (Total ADD points) - (Total SUBTRACT points)
   */
  async getNetPointsForSuccessRate(
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
   * Get the active high_success_rate rule
   */
  async getSuccessRateRule(): Promise<schema.TrustScoreRule | null> {
    const rule = await this.db.query.trustScoreRules.findFirst({
      where: and(
        eq(schema.trustScoreRules.triggerEvent, "high_success_rate"),
        eq(schema.trustScoreRules.isActive, true),
        isNull(schema.trustScoreRules.deletedAt)
      ),
    });

    return rule || null;
  }

  /**
   * Award success rate credit to connector
   */
  private async awardSuccessRateCredit(
    connectorId: string,
    rule: schema.TrustScoreRule,
    stats: SuccessRateStats
  ): Promise<void> {
    this.logger.log(`Awarding success rate credit to connector ${connectorId}`);

    const rulePoints = Number(rule.points);
    const pointsChange = rulePoints;

    // Record history and update score in a transaction
    await this.db.transaction(async (tx) => {
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, connectorId),
      });

      if (!user) {
        throw new Error(`Connector profile not found: ${connectorId}`);
      }

      const currentScore = user.trustScore ? Number(user.trustScore) : 0;
      const newScore = Math.min(10, currentScore + rulePoints);

      // Get rule configuration for thresholds
      const configParams = rule.configParams as Record<string, unknown>;
      const minRequests = Number(configParams.min_requests || 2);
      const minAvgSuccess = Number(configParams.min_avg_success || 85);

      await tx.insert(schema.userTrustScoreHistory).values({
        userId: connectorId,
        ruleId: rule.id,
        previousScore: currentScore.toString(),
        newScore: newScore.toString(),
        pointsChange: pointsChange.toString(),
        actionType: "ADD",
        evidence: {
          totalAccepted: stats.totalAccepted,
          successfulCount: stats.successfulCount,
          failedCount: stats.failedCount,
          successRate: Math.round(stats.successRate * 100) / 100,
          minRequests,
          minAvgSuccess,
          reason: "high_success_rate_threshold_met",
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

      this.logger.log(
        `✅ Awarded ${pointsChange} points to connector ${connectorId}: ${currentScore} -> ${newScore} (${stats.totalAccepted} requests, ${stats.successRate.toFixed(2)}% success)`
      );
    });
  }

  /**
   * Deduct success rate credit from connector
   */
  private async deductSuccessRateCredit(
    connectorId: string,
    rule: schema.TrustScoreRule,
    stats: SuccessRateStats,
    netPoints: number
  ): Promise<void> {
    this.logger.log(
      `Deducting success rate credit from connector ${connectorId}`
    );

    const pointsToDeduct = netPoints; // Deduct the net points
    const pointsChange = -pointsToDeduct;

    // Record history and update score in a transaction
    await this.db.transaction(async (tx) => {
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, connectorId),
      });

      if (!user) {
        throw new Error(`Connector profile not found: ${connectorId}`);
      }

      const currentScore = user.trustScore ? Number(user.trustScore) : 0;
      const newScore = Math.max(0, currentScore - pointsToDeduct);

      // Get rule configuration for thresholds
      const configParams = rule.configParams as Record<string, unknown>;
      const minRequests = Number(configParams.min_requests || 2);
      const minAvgSuccess = Number(configParams.min_avg_success || 85);

      await tx.insert(schema.userTrustScoreHistory).values({
        userId: connectorId,
        ruleId: rule.id,
        previousScore: currentScore.toString(),
        newScore: newScore.toString(),
        pointsChange: pointsChange.toString(),
        actionType: "SUBTRACT",
        evidence: {
          totalAccepted: stats.totalAccepted,
          successfulCount: stats.successfulCount,
          failedCount: stats.failedCount,
          successRate: Math.round(stats.successRate * 100) / 100,
          minRequests,
          minAvgSuccess,
          reason: "high_success_rate_threshold_not_met",
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

      this.logger.log(
        `✅ Deducted ${pointsToDeduct} points from connector ${connectorId}: ${currentScore} -> ${newScore} (${stats.totalAccepted} requests, ${stats.successRate.toFixed(2)}% success)`
      );
    });
  }

  /**
   * Main processing method - handles toggle logic for success rate credits
   * Can be called by both job handler and cron service
   */
  async processSuccessRateTrustScore(connectorId: string): Promise<void> {
    this.logger.log(
      `Processing success rate trust score for connector ${connectorId}`
    );

    try {
      // 1. Get the high_success_rate rule
      const rule = await this.getSuccessRateRule();
      if (!rule) {
        this.logger.warn("No active high_success_rate rule found - skipping");
        return;
      }

      // 2. Get rule configuration
      const configParams = rule.configParams as Record<string, unknown>;
      const minRequests = Number(configParams.min_requests || 2);
      const minAvgSuccess = Number(configParams.min_avg_success || 85);

      this.logger.log(
        `Rule config: min_requests=${minRequests}, min_avg_success=${minAvgSuccess}%`
      );

      // 3. Calculate success rate stats
      const stats = await this.calculateSuccessRateStats(connectorId);

      // 4. Check if connector has minimum required requests
      if (stats.totalAccepted < minRequests) {
        this.logger.log(
          `Connector ${connectorId} has only ${stats.totalAccepted} requests (need ${minRequests} minimum) - skipping`
        );
        return;
      }

      // 5. Get current net points for this rule
      const netPoints = await this.getNetPointsForSuccessRate(
        connectorId,
        rule.id
      );

      // 6. Determine if threshold is met
      const meetsThreshold = stats.successRate >= minAvgSuccess;

      this.logger.log(
        `📊 Connector ${connectorId}: ${stats.successfulCount} successful, ${stats.failedCount} failed, ${stats.successRate.toFixed(2)}% success rate (need ${minAvgSuccess}%), net points: ${netPoints}, meets threshold: ${meetsThreshold}`
      );

      // 7. Toggle logic
      if (meetsThreshold && netPoints === 0) {
        // Award credit
        await this.awardSuccessRateCredit(connectorId, rule, stats);
      } else if (!meetsThreshold && netPoints > 0) {
        // Deduct credit
        await this.deductSuccessRateCredit(connectorId, rule, stats, netPoints);
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
        `Error processing success rate trust score for connector ${connectorId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
