import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { toUTC, utcDayjs } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class NoResponseHandlerService {
  private readonly logger = new Logger(NoResponseHandlerService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Check for potential connectors with no response after 48 hours
   * Runs every 2 hours
   */
  async checkNoResponse48h(): Promise<void> {
    try {
      const fortyEightHoursAgo = utcDayjs().subtract(48, "hour").toDate();

      // Query pending potential connectors older than 48 hours
      const pendingConnectorEntries = await this.db
        .select()
        .from(schema.introductionPotentialConnectors)
        .where(
          and(
            eq(
              schema.introductionPotentialConnectors.status,
              IntroductionStatus.PENDING
            ),
            lt(
              schema.introductionPotentialConnectors.createdAt,
              fortyEightHoursAgo
            )
          )
        );

      if (pendingConnectorEntries.length === 0) {
        this.logger.log("No pending connector entries to process");
        return;
      }

      // Get no_response_48h rule for idempotency check
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

      // Group connector entries by requestId
      const entriesByRequest = new Map<
        string,
        schema.IntroductionPotentialConnector[]
      >();
      for (const entry of pendingConnectorEntries) {
        const { requestId } = entry;
        if (!entriesByRequest.has(requestId)) {
          entriesByRequest.set(requestId, []);
        }
        entriesByRequest.get(requestId)!.push(entry);
      }

      let totalProcessedConnectors = 0;
      let totalUpdatedRequests = 0;
      const processedUsers = new Set<string>();

      // Process each request's connectors in a transaction
      for (const [requestId, connectorEntries] of entriesByRequest.entries()) {
        try {
          const result = await this.processExpiredConnectorsForRequest(
            requestId,
            connectorEntries,
            noResponseRule,
            processedUsers
          );
          totalProcessedConnectors += result.processedConnectors;
          if (result.requestUpdated) {
            totalUpdatedRequests++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to process expired connectors for request ${requestId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      this.logger.log(
        `✅ Processed ${totalProcessedConnectors} expired connector entries across ${totalUpdatedRequests} updated requests`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in checkNoResponse48h: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Process expired connectors for a single request in a transaction
   */
  private async processExpiredConnectorsForRequest(
    requestId: string,
    connectorEntries: schema.IntroductionPotentialConnector[],
    noResponseRule: schema.TrustScoreRule,
    processedUsers: Set<string>
  ): Promise<{ processedConnectors: number; requestUpdated: boolean }> {
    let processedConnectors = 0;
    let requestUpdated = false;

    await this.db.transaction(async (tx) => {
      // CHANGED: First update the request to make it available in global marketplace
      requestUpdated = await this.updateRequestExpiration(tx, requestId);

      // Process each connector entry
      for (const entry of connectorEntries) {
        // Update connector entry status to expired
        await tx
          .update(schema.introductionPotentialConnectors)
          .set({
            status: IntroductionStatus.EXPIRED,
            declineReason: "timeout_48h",
            updatedAt: toUTC(),
          })
          .where(eq(schema.introductionPotentialConnectors.id, entry.id));

        // Check if we've already processed this user in this cron run
        if (!processedUsers.has(entry.potentialConnectorId)) {
          const penaltyApplied = await this.applyNoResponsePenalty(
            tx,
            entry,
            noResponseRule
          );

          if (penaltyApplied) {
            processedConnectors++;
            processedUsers.add(entry.potentialConnectorId);
          }
        } else {
          this.logger.debug(
            `User ${entry.potentialConnectorId} already processed in this run, skipping trust score update`
          );
        }
      }
    });

    return { processedConnectors, requestUpdated };
  }

  /**
   * Calculate the connector's average response rate
   * Response rate = (accepted + declined + failed) / total finalized requests * 100
   */
  private async calculateConnectorResponseRate(
    tx: PostgresJsDatabase<typeof schema>,
    connectorId: string
  ): Promise<{
    responseRate: number;
    total: number;
    responded: number;
  }> {
    const result = await tx.execute(
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
    tx: PostgresJsDatabase<typeof schema>,
    userId: string,
    ruleId: string
  ): Promise<number> {
    const history = await tx
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
   * Apply trust score penalty based on response rate analysis
   */
  private async applyNoResponsePenalty(
    tx: PostgresJsDatabase<typeof schema>,
    connectorEntry: schema.IntroductionPotentialConnector,
    noResponseRule: schema.TrustScoreRule
  ): Promise<boolean> {
    const connectorId = connectorEntry.potentialConnectorId;

    // Get the response rate threshold from config_params
    const configParams =
      (noResponseRule.configParams as Record<string, unknown>) || {};
    const minAvgSuccess = Number(configParams.min_avg_success ?? 80);

    // Calculate current response rate
    const { responseRate, total, responded } =
      await this.calculateConnectorResponseRate(tx, connectorId);

    // Check current net points for this rule (0 or 1 due to toggle behavior)
    const netPoints = await this.getNetPointsForRule(
      tx,
      connectorId,
      noResponseRule.id
    );

    this.logger.debug(
      `Connector ${connectorId} has response rate ${responseRate.toFixed(1)}% (${responded}/${total}), threshold: ${minAvgSuccess}%, current net points: ${netPoints}`
    );

    // Get the user's current trust score
    const user = await tx.query.users.findFirst({
      where: eq(schema.users.id, connectorId),
    });

    if (!user) {
      this.logger.error(`User not found for connector ${connectorId}`);
      return false;
    }

    const currentScore = user.trustScore ? Number(user.trustScore) : 0;
    const rulePoints = Number(noResponseRule.points);

    // Only deduct if response rate is below threshold AND we haven't already deducted (netPoints >= 0)
    if (responseRate < minAvgSuccess && netPoints >= 0) {
      // Response rate below threshold and no point deducted yet - deduct point
      try {
        const newScore = currentScore - Math.abs(rulePoints);

        // 3. Record history
        await tx.insert(schema.userTrustScoreHistory).values({
          userId: connectorId,
          ruleId: noResponseRule.id,
          previousScore: currentScore.toString(),
          newScore: newScore.toString(),
          pointsChange: (-Math.abs(rulePoints)).toString(),
          actionType: "SUBTRACT",
          evidence: {
            connectorEntryId: connectorEntry.id,
            requestId: connectorEntry.requestId,
            currentResponseRate: responseRate,
            minAvgSuccess,
            responded,
            total,
            reason: "avg_response_rate_below_threshold",
          },
          triggeredBy: "SYSTEM",
          triggeredAt: toUTC(),
        });

        // 4. Update user score
        await tx
          .update(schema.users)
          .set({
            trustScore: newScore,
            updatedAt: toUTC(),
          })
          .where(eq(schema.users.id, connectorId));

        this.logger.log(
          `✅ DEDUCTED trust score for user ${connectorId}: ${currentScore} -> ${newScore} (-${Math.abs(rulePoints)}) | Response rate: ${responseRate.toFixed(1)}% < ${minAvgSuccess}%`
        );

        return true;
      } catch (error) {
        this.logger.error(
          `Failed to update trust score for connector ${connectorId}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        return false;
      }
    } else {
      // No action needed (either already deducted or no deduction needed)
      this.logger.debug(
        `No trust score action needed for connector ${connectorId} - response rate ${responseRate.toFixed(1)}%, threshold: ${minAvgSuccess}%, current net points: ${netPoints}`
      );
      return false;
    }
  }

  /**
   * Update the introduction_requests table to make it visible in the marketplace
   * This is now executed BEFORE processing individual connector entries
   */
  private async updateRequestExpiration(
    tx: PostgresJsDatabase<typeof schema>,
    requestId: string
  ): Promise<boolean> {
    // Get all connector entries for this request to check if anyone accepted
    const allEntries = await tx
      .select()
      .from(schema.introductionPotentialConnectors)
      .where(eq(schema.introductionPotentialConnectors.requestId, requestId));

    // Check if any connector has accepted
    const acceptedEntry = allEntries.find(
      (e) => e.status === IntroductionStatus.ACCEPTED
    );

    if (acceptedEntry) {
      this.logger.debug(
        `Request ${requestId} has an accepted connector, skipping request update`
      );
      return false;
    }

    // Update the introduction request to be marketplace visible
    // This happens BEFORE processing individual connector penalties
    await tx
      .update(schema.introductionRequests)
      .set({
        autoExpired: true,
        expiredAt: toUTC(),
        isMarketplaceVisible: true,
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionRequests.id, requestId));

    this.logger.log(`Request ${requestId} marked as available on marketplace`);
    return true;
  }
}
