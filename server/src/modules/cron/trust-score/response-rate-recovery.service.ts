import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class ResponseRateRecoveryService {
  private readonly logger = new Logger(ResponseRateRecoveryService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Check and restore points for a specific connector if they've improved their response rate
   * This is called immediately after a connector accepts or declines a request
   */
  async checkAndRestorePointsForConnector(connectorId: string): Promise<void> {
    this.logger.log(
      `🔍 Checking response rate recovery for connector ${connectorId}...`
    );

    try {
      // Get no_response_48h rule
      const noResponseRule = await this.db.query.trustScoreRules.findFirst({
        where: and(
          eq(schema.trustScoreRules.triggerEvent, "no_response_48h"),
          eq(schema.trustScoreRules.isActive, true),
          isNull(schema.trustScoreRules.deletedAt)
        ),
      });

      if (!noResponseRule) {
        this.logger.warn("No active no_response_48h rule found");
        return;
      }

      // Check if this connector has negative net points from this rule
      const netPoints = await this.getNetPointsForRule(
        connectorId,
        noResponseRule.id
      );

      // Only proceed if they have been penalized (negative net points)
      if (netPoints >= 0) {
        this.logger.debug(
          `Connector ${connectorId} has no penalty to recover (net points: ${netPoints})`
        );
        return;
      }

      // Calculate current response rate
      const { responseRate, total, responded } =
        await this.calculateConnectorResponseRate(connectorId);

      // Get threshold from config
      const configParams =
        (noResponseRule.configParams as Record<string, unknown>) || {};
      const minAvgSuccess = Number(configParams.min_avg_success ?? 80);

      this.logger.debug(
        `Connector ${connectorId} - Response rate: ${responseRate.toFixed(1)}% (${responded}/${total}), Threshold: ${minAvgSuccess}%, Net points: ${netPoints}`
      );

      // If response rate is now above threshold, restore the points
      if (responseRate >= minAvgSuccess) {
        await this.restorePoints(
          connectorId,
          noResponseRule,
          responseRate,
          minAvgSuccess,
          responded,
          total
        );
      } else {
        this.logger.debug(
          `Connector ${connectorId} response rate ${responseRate.toFixed(1)}% still below threshold ${minAvgSuccess}%`
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error checking recovery for connector ${connectorId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Periodic check for all connectors who have been penalized
   * Runs every 6 hours to check if any penalized connectors have improved
   */
  async checkAllPenalizedConnectors(): Promise<void> {
    this.logger.log(
      "🔄 Running periodic check for penalized connectors recovery..."
    );

    try {
      // Get no_response_48h rule
      const noResponseRule = await this.db.query.trustScoreRules.findFirst({
        where: and(
          eq(schema.trustScoreRules.triggerEvent, "no_response_48h"),
          eq(schema.trustScoreRules.isActive, true),
          isNull(schema.trustScoreRules.deletedAt)
        ),
      });

      if (!noResponseRule) {
        this.logger.warn("No active no_response_48h rule found");
        return;
      }

      // Find all users with negative net points for this rule
      const penalizedUsers = await this.findPenalizedUsers(noResponseRule.id);

      if (penalizedUsers.length === 0) {
        this.logger.log("No penalized connectors found");
        return;
      }

      this.logger.log(
        `Found ${penalizedUsers.length} penalized connectors to check`
      );

      // Get threshold from config
      const configParams =
        (noResponseRule.configParams as Record<string, unknown>) || {};
      const minAvgSuccess = Number(configParams.min_avg_success ?? 80);

      let restoredCount = 0;

      // Check each penalized user
      for (const userId of penalizedUsers) {
        try {
          const { responseRate, total, responded } =
            await this.calculateConnectorResponseRate(userId);

          this.logger.debug(
            `Checking ${userId} - Response rate: ${responseRate.toFixed(1)}% (${responded}/${total}), Threshold: ${minAvgSuccess}%`
          );

          // If response rate is now above threshold, restore the points
          if (responseRate >= minAvgSuccess) {
            await this.restorePoints(
              userId,
              noResponseRule,
              responseRate,
              minAvgSuccess,
              responded,
              total
            );
            restoredCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to check recovery for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      this.logger.log(
        `✅ Periodic recovery check complete: ${restoredCount}/${penalizedUsers.length} connectors had points restored`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in periodic recovery check: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Find all users who have negative net points for a specific rule
   */
  private async findPenalizedUsers(ruleId: string): Promise<string[]> {
    const result = await this.db.execute(
      sql<{ user_id: string; net_points: number }>`
        SELECT 
          user_id,
          SUM(CAST(points_change AS DECIMAL)) as net_points
        FROM user_trust_score_history
        WHERE rule_id = ${ruleId}
        GROUP BY user_id
        HAVING SUM(CAST(points_change AS DECIMAL)) < 0
      `
    );

    const users = Array.isArray(result)
      ? result
      : (result as { rows: Array<{ user_id: string; net_points: number }> })
          .rows;

    return users.map((row) => row.user_id);
  }

  /**
   * Calculate the connector's average response rate
   * Response rate = (accepted + declined) / total finalized requests * 100
   */
  private async calculateConnectorResponseRate(connectorId: string): Promise<{
    responseRate: number;
    total: number;
    responded: number;
  }> {
    const result = await this.db.execute(
      sql<{ responded: number; total: number }>`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('accepted', 'declined', 'failed')) as responded,
          COUNT(*) as total
        FROM introduction_potential_connectors
        WHERE potential_connector_id = ${connectorId}
          AND status != 'pending'
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as { rows: Array<{ responded: number; total: number }> })
          .rows[0];

    const responded = Number(stats?.responded ?? 0);
    const total = Number(stats?.total ?? 0);

    if (total === 0) {
      // No finalized requests yet, consider as 100% (benefit of the doubt)
      return { responseRate: 100, total: 0, responded: 0 };
    }

    return {
      responseRate: (responded / total) * 100,
      total,
      responded,
    };
  }

  /**
   * Get net points for a specific rule and user
   * Net Points = (Total ADD points) - (Total SUBTRACT points)
   */
  private async getNetPointsForRule(
    userId: string,
    ruleId: string
  ): Promise<number> {
    const history = await this.db
      .select()
      .from(schema.userTrustScoreHistory)
      .where(
        and(
          eq(schema.userTrustScoreHistory.userId, userId),
          eq(schema.userTrustScoreHistory.ruleId, ruleId)
        )
      );

    let netPoints = 0;
    for (const entry of history) {
      const change = Number(entry.pointsChange);
      netPoints += change;
    }

    return netPoints;
  }

  /**
   * Restore points for a connector who has improved their response rate
   */
  private async restorePoints(
    connectorId: string,
    noResponseRule: schema.TrustScoreRule,
    responseRate: number,
    minAvgSuccess: number,
    responded: number,
    total: number
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Get the user's current trust score
      const user = await tx.query.users.findFirst({
        where: eq(schema.users.id, connectorId),
      });

      if (!user) {
        throw new Error(`User not found for connector ${connectorId}`);
      }

      const currentScore = user.trustScore ? Number(user.trustScore) : 0;
      const rulePoints = Number(noResponseRule.points);
      const newScore = Math.min(10, currentScore + Math.abs(rulePoints));

      // Record history
      await tx.insert(schema.userTrustScoreHistory).values({
        userId: connectorId,
        ruleId: noResponseRule.id,
        previousScore: currentScore.toString(),
        newScore: newScore.toString(),
        pointsChange: Math.abs(rulePoints).toString(),
        actionType: "ADD",
        evidence: {
          currentResponseRate: responseRate,
          minAvgSuccess,
          responded,
          total,
          reason: "response_rate_recovery_above_threshold",
          recoveryType: "automatic",
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
        `✅ RESTORED trust score for user ${connectorId}: ${currentScore} -> ${newScore} (+${Math.abs(rulePoints)}) | Response rate: ${responseRate.toFixed(1)}% >= ${minAvgSuccess}%`
      );
    });
  }
}
