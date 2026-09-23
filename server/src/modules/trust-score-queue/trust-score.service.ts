import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import * as schema from "database/schema";
import { ContactSourceStatusService } from "modules/contact-source-status/contact-source-status.service";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  TrustScoreQueueJobData,
  TrustScoreJobResult,
} from "./trust-score-queue.types";

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  // Trigger events that require average response rate check
  private readonly responseRateTriggerEvents = ["response_within_48h"];

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contactSourceStatusService: ContactSourceStatusService
  ) {}

  /**
   * Calculate net points for a specific rule
   * Net Points = (Total ADD points) - (Total SUBTRACT points)
   * This ensures toggle behavior - user can only have 0 or 1 point at any time
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
   * Calculate response rate statistics for a connector
   * Returns percentage of 48h responses
   */
  private async calculateResponseRateStats(userId: string): Promise<{
    totalResponses: number;
    responsesWithin48h: number;
    average48hRate: number;
  }> {
    // Query for response statistics
    const result = await this.db.execute(
      sql<{
        total_responses: number;
        responses_within_48h: number;
      }>`
        SELECT 
          COUNT(*) AS total_responses,
          COUNT(CASE WHEN (updated_at - created_at) <= INTERVAL '48 hours' THEN 1 END) AS responses_within_48h
        FROM 
          introduction_potential_connectors
        WHERE 
          potential_connector_id = ${userId}
          AND status = 'accepted'
          AND updated_at IS NOT NULL
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (
          result as {
            rows: Array<{
              total_responses: number;
              responses_within_48h: number;
            }>;
          }
        ).rows[0];
    const totalResponses = Number(stats?.total_responses ?? 0);
    const responsesWithin48h = Number(stats?.responses_within_48h ?? 0);

    const average48hRate =
      totalResponses > 0 ? (responsesWithin48h / totalResponses) * 100 : 0;

    return {
      totalResponses,
      responsesWithin48h,
      average48hRate,
    };
  }

  /**
   * Calculate the average response rate for a connector
   * Response rate = (accepted + declined) / total finalized requests * 100
   */
  private async calculateAverageResponseRate(userId: string): Promise<number> {
    const result = await this.db.execute(
      sql<{ responded: number; total: number }>`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')) as responded,
          COUNT(*) as total
        FROM introduction_potential_connectors
        WHERE potential_connector_id = ${userId}
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
      return 100;
    }

    return (responded / total) * 100;
  }

  /**
   * Check and deduct response rate points if average has dropped below threshold
   * This handles the case where a user previously earned points but their average has now dropped
   */
  private async checkAndDeductResponseRatePoints(
    userId: string,
    currentAvgRate: number,
    minAvgThreshold: number
  ): Promise<void> {
    const responseRateRules = await this.db
      .select()
      .from(schema.trustScoreRules)
      .where(
        and(
          inArray(
            schema.trustScoreRules.triggerEvent,
            this.responseRateTriggerEvents
          ),
          eq(schema.trustScoreRules.isActive, true),
          isNull(schema.trustScoreRules.deletedAt)
        )
      );

    if (responseRateRules.length === 0) {
      return;
    }

    // Check net points for each rule to determine if deduction is needed
    const rulesToDeduct: Array<{ ruleId: string; netPoints: number }> = [];

    for (const rule of responseRateRules) {
      const netPoints = await this.getNetPointsForRule(userId, rule.id);

      if (netPoints > 0) {
        // User currently has points for this rule, can deduct
        rulesToDeduct.push({ ruleId: rule.id, netPoints });
      } else {
        this.logger.log(
          `User ${userId} has net points = ${netPoints} for rule ${rule.triggerEvent} - skipping deduction (already at 0 or negative)`
        );
      }
    }

    if (rulesToDeduct.length === 0) {
      return; // No points to deduct
    }

    // Get current user score
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      this.logger.error(`User not found for deduction: ${userId}`);
      return;
    }

    let currentScore = user.trustScore ? Number(user.trustScore) : 0;

    // Deduct points for each rule that currently has net points > 0
    await this.db.transaction(async (tx) => {
      for (const ruleToDeduct of rulesToDeduct) {
        const pointsToDeduct = ruleToDeduct.netPoints;
        const newScore = Math.max(0, currentScore - pointsToDeduct);

        // Record deduction history
        await tx.insert(schema.userTrustScoreHistory).values({
          userId,
          ruleId: ruleToDeduct.ruleId,
          previousScore: currentScore.toString(),
          newScore: newScore.toString(),
          pointsChange: (-pointsToDeduct).toString(),
          actionType: "SUBTRACT",
          evidence: {
            reason: "avg_response_rate_dropped",
            currentAvgRate,
            minAvgThreshold,
            netPointsBeforeDeduction: pointsToDeduct,
          },
          triggeredBy: "SYSTEM",
          triggeredAt: toUTC(),
        });

        currentScore = newScore;

        this.logger.log(
          `Deducted ${pointsToDeduct} points from user ${userId} for rule ${ruleToDeduct.ruleId} - avg response rate ${currentAvgRate.toFixed(1)}% below threshold ${minAvgThreshold}%`
        );
      }

      // Update user's final score
      await tx
        .update(schema.users)
        .set({
          trustScore: currentScore,
          updatedAt: toUTC(),
        })
        .where(eq(schema.users.id, userId));
    });
  }

  /**
   * Process response rate average check
   * Calculates average response rates and toggles response_within_48h points
   */
  async processResponseRateAverageCheck(
    job: TrustScoreQueueJobData
  ): Promise<TrustScoreJobResult> {
    const { userId, evidence } = job;

    this.logger.log(
      `Processing response rate average check for user ${userId}`
    );

    try {
      // 1. Calculate response rate statistics
      const stats = await this.calculateResponseRateStats(userId);

      this.logger.log(
        `Response stats for user ${userId}: ${stats.responsesWithin48h}/${stats.totalResponses} within 48h (${stats.average48hRate.toFixed(1)}%)`
      );

      // 2. Get the response_within_48h rule
      const response48hRule = await this.getActiveRuleByTriggerEvent(
        "response_within_48h"
      );

      if (!response48hRule) {
        return {
          success: false,
          userId,
          triggerEvent: "check_response_rate_average",
          reason: "Rule not found",
        };
      }

      // 3. Get threshold from config_params
      const response48hThreshold = response48hRule.configParams
        ? Number(
            (response48hRule.configParams as Record<string, unknown>)
              .min_avg_response ?? 85
          )
        : 85;

      // 4. Check if response_within_48h points should be toggled
      const response48hNetPoints = await this.getNetPointsForRule(
        userId,
        response48hRule.id
      );
      const shouldHave48hPoints = stats.average48hRate >= response48hThreshold;

      if (shouldHave48hPoints && response48hNetPoints === 0) {
        // Award response_within_48h points
        this.logger.log(
          `Awarding response_within_48h points to user ${userId} - avg ${stats.average48hRate.toFixed(1)}% >= ${response48hThreshold}%`
        );
        return await this.processTrustScoreEvent({
          userId,
          triggerEvent: "response_within_48h",
          evidence: {
            ...evidence,
            average48hRate: stats.average48hRate,
            responsesWithin48h: stats.responsesWithin48h,
            totalResponses: stats.totalResponses,
            minAvgResponse: response48hThreshold,
          },
          triggeredAt: toUTC(),
        });
      } else if (!shouldHave48hPoints && response48hNetPoints > 0) {
        // Deduct response_within_48h points
        this.logger.log(
          `Deducting response_within_48h points from user ${userId} - avg ${stats.average48hRate.toFixed(1)}% < ${response48hThreshold}%`
        );
        await this.checkAndDeductResponseRatePoints(
          userId,
          stats.average48hRate,
          response48hThreshold
        );
        return {
          success: true,
          userId,
          triggerEvent: "check_response_rate_average",
          reason: "Response within 48h points deducted",
        };
      } else if (shouldHave48hPoints && response48hNetPoints > 0) {
        // Already has points and maintains threshold
        this.logger.log(
          `User ${userId} already has response_within_48h points and maintains threshold (${stats.average48hRate.toFixed(1)}% >= ${response48hThreshold}%)`
        );
      }

      return {
        success: false,
        userId,
        triggerEvent: "check_response_rate_average",
        reason: "No action needed",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing response rate average check for user ${userId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      return {
        success: false,
        userId,
        triggerEvent: "check_response_rate_average",
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch active rule by trigger event
   */
  async getActiveRuleByTriggerEvent(
    triggerEvent: string
  ): Promise<schema.TrustScoreRule | null> {
    const rule = await this.db.query.trustScoreRules.findFirst({
      where: and(
        eq(schema.trustScoreRules.triggerEvent, triggerEvent),
        eq(schema.trustScoreRules.isActive, true),
        isNull(schema.trustScoreRules.deletedAt)
      ),
    });

    return rule || null;
  }

  /**
   * Map trigger event to source type for contact imports
   */
  private getSourceTypeFromTriggerEvent(triggerEvent: string): string | null {
    const triggerToSourceMap: Record<string, string> = {
      google_contact_import: "google_import",
      microsoft_contact_import: "microsoft_import",
      apple_contact_import: "apple_import",
      csv_manual_upload: "csv",
      linkedin_zip_import: "linkedin_import",
    };

    return triggerToSourceMap[triggerEvent] || null;
  }

  /**
   * Check if rule conditions are met
   */
  async checkRuleConditions(
    rule: schema.TrustScoreRule,
    evidence: Record<string, unknown>,
    userId: string
  ): Promise<boolean> {
    // Check configurable parameters
    if (rule.isConfigurable && rule.configParams) {
      const configParams = rule.configParams as Record<string, unknown>;

      // Check min_contacts threshold for contact import rules
      if (configParams.min_contacts !== undefined) {
        const sourceType = this.getSourceTypeFromTriggerEvent(
          rule.triggerEvent
        );
        if (sourceType) {
          try {
            let cumulativeCount =
              await this.contactSourceStatusService.getContactCountBySource(
                userId,
                sourceType
              );

            // For CSV imports, also check "csv_import" source type since both may be used
            if (sourceType === "csv") {
              const csvImportCount =
                await this.contactSourceStatusService.getContactCountBySource(
                  userId,
                  "csv_import"
                );
              cumulativeCount += csvImportCount;
            }

            const minContacts = Number(configParams.min_contacts);

            if (cumulativeCount < minContacts) {
              this.logger.log(
                `Contact import threshold not met: ${cumulativeCount} < ${minContacts} (source: ${sourceType})`
              );
              return false;
            }

            this.logger.log(
              `Contact import threshold met: ${cumulativeCount} >= ${minContacts} (source: ${sourceType})`
            );
          } catch (error) {
            this.logger.error(
              `Failed to check contact count for source ${sourceType}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
            // If we can't check the count, don't award points
            return false;
          }
        }
      }

      // Check response time threshold
      // Skip this check for response rate rules (response_within_48h)
      // as they now use average-based calculation instead of individual response time
      if (
        configParams.response_time_hours !== undefined &&
        !this.responseRateTriggerEvents.includes(rule.triggerEvent)
      ) {
        const responseTime = evidence.responseTimeHours;
        if (!responseTime || responseTime > configParams.response_time_hours) {
          this.logger.log(
            `Response time ${responseTime} exceeds threshold ${configParams.response_time_hours}`
          );
          return false;
        }
      }

      // Check success rate threshold
      if (configParams.success_rate_threshold !== undefined) {
        const { successRate } = evidence;
        if (!successRate || successRate < configParams.success_rate_threshold) {
          this.logger.log(
            `Success rate ${successRate} below threshold ${configParams.success_rate_threshold}`
          );
          return false;
        }
      }

      // Check peer reviews threshold
      if (
        configParams.min_reviews !== undefined &&
        configParams.min_avg_rating !== undefined
      ) {
        const { reviewCount } = evidence;
        const avgRating = evidence.averageRating;
        if (
          !reviewCount ||
          reviewCount < configParams.min_reviews ||
          !avgRating ||
          avgRating < configParams.min_avg_rating
        ) {
          this.logger.log(
            `Peer reviews: count=${reviewCount}, avg=${avgRating} - below threshold`
          );
          return false;
        }
      }

      // Check min_avg_response threshold for response rate rules (response_within_48h)
      if (configParams.min_avg_response !== undefined) {
        const minAvgResponse = Number(configParams.min_avg_response);
        const avgResponseRate = await this.calculateAverageResponseRate(userId);

        if (avgResponseRate < minAvgResponse) {
          this.logger.log(
            `Average response rate ${avgResponseRate.toFixed(1)}% below threshold ${minAvgResponse}% for rule: ${rule.triggerEvent}`
          );

          // Check and deduct previously awarded points if avg has dropped
          await this.checkAndDeductResponseRatePoints(
            userId,
            avgResponseRate,
            minAvgResponse
          );

          return false;
        }

        this.logger.log(
          `Average response rate ${avgResponseRate.toFixed(1)}% meets threshold ${minAvgResponse}% for rule: ${rule.triggerEvent}`
        );
      }
    }

    return true;
  }

  /**
   * Calculate new trust score
   */
  async calculateTrustScore(
    userId: string,
    rule: schema.TrustScoreRule,
    _evidence: Record<string, unknown>
  ): Promise<{ newScore: number; pointsChange: number }> {
    // Get current user score
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const currentScore = user.trustScore ? Number(user.trustScore) : 0;
    const rulePoints = Number(rule.points);

    let newScore: number;
    let pointsChange: number;

    switch (rule.actionType) {
      case "ADD":
        newScore = Math.min(10, currentScore + rulePoints);
        pointsChange = rulePoints;
        break;
      case "SUBTRACT":
        newScore = Math.max(0, currentScore - rulePoints);
        pointsChange = -rulePoints;
        break;
      case "SET":
        newScore = Math.min(10, Math.max(0, rulePoints));
        pointsChange = newScore - currentScore;
        break;
      default:
        throw new Error(`Unknown action type: ${rule.actionType}`);
    }

    return { newScore, pointsChange };
  }

  /**
   * Record history entry
   */
  async recordHistory(
    userId: string,
    ruleId: string,
    previousScore: number,
    newScore: number,
    pointsChange: number,
    actionType: string,
    evidence: Record<string, unknown>,
    triggeredBy: "SYSTEM" | "ADMIN" | "USER_ACTION" = "USER_ACTION"
  ): Promise<void> {
    await this.db.insert(schema.userTrustScoreHistory).values({
      userId,
      ruleId,
      previousScore: previousScore.toString(),
      newScore: newScore.toString(),
      pointsChange: pointsChange.toString(),
      actionType,
      evidence,
      triggeredBy,
      triggeredAt: toUTC(),
    });
  }

  /**
   * Update user trust score
   */
  async updateUserScore(userId: string, newScore: number): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        trustScore: newScore,
        updatedAt: toUTC(),
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Main method - process trust score event
   */
  async processTrustScoreEvent(
    job: TrustScoreQueueJobData
  ): Promise<TrustScoreJobResult> {
    const { userId, triggerEvent, evidence, triggeredAt } = job;

    this.logger.log(
      `Processing trust score event for user ${userId}, trigger: ${triggerEvent}`
    );

    try {
      // Route to specialized handler for response rate average check
      if (triggerEvent === "check_response_rate_average") {
        return await this.processResponseRateAverageCheck(job);
      }

      // 1. Get active rule
      const rule = await this.getActiveRuleByTriggerEvent(triggerEvent);
      if (!rule) {
        this.logger.warn(
          `No active rule found for trigger event: ${triggerEvent}`
        );
        return {
          success: false,
          userId,
          triggerEvent,
          reason: "No active rule found",
        };
      }

      // 1.5. Check if this is a one-time rule and user has already earned it
      const oneTimeRuleSlugs = [
        "google_contact_import",
        "microsoft_contact_import",
        "apple_contact_import",
        "csv_manual_upload",
        "linkedin_zip_import",
      ];

      if (oneTimeRuleSlugs.includes(rule.slug)) {
        const existingHistory =
          await this.db.query.userTrustScoreHistory.findFirst({
            where: and(
              eq(schema.userTrustScoreHistory.userId, userId),
              eq(schema.userTrustScoreHistory.ruleId, rule.id)
            ),
          });

        if (existingHistory) {
          this.logger.log(
            `User ${userId} has already earned points for rule: ${rule.slug}`
          );
          return {
            success: false,
            userId,
            triggerEvent,
            reason: "Already earned",
          };
        }
      }

      // 2. Check conditions
      const conditionsMet = await this.checkRuleConditions(
        rule,
        evidence,
        userId
      );
      if (!conditionsMet) {
        this.logger.log(
          `Rule conditions not met for rule: ${rule.slug} (${rule.name})`
        );
        return {
          success: false,
          userId,
          triggerEvent,
          reason: "Conditions not met",
        };
      }

      // 3. Calculate new score
      const { newScore, pointsChange } = await this.calculateTrustScore(
        userId,
        rule,
        evidence
      );

      // 4. Get current score for history
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      const previousScore = user?.trustScore ? Number(user.trustScore) : 0;

      // 5. Record history and update score in a transaction
      await this.db.transaction(async (tx) => {
        // Record history
        await tx.insert(schema.userTrustScoreHistory).values({
          userId,
          ruleId: rule.id,
          previousScore: previousScore.toString(),
          newScore: newScore.toString(),
          pointsChange: pointsChange.toString(),
          actionType: rule.actionType,
          evidence,
          triggeredBy: "USER_ACTION",
          triggeredAt: toUTC(triggeredAt),
        });

        // Update user score
        await tx
          .update(schema.users)
          .set({
            trustScore: newScore,
            updatedAt: toUTC(),
          })
          .where(eq(schema.users.id, userId));
      });

      this.logger.log(
        `Trust score updated for user ${userId}: ${previousScore} -> ${newScore} (${pointsChange > 0 ? "+" : ""}${pointsChange}) via rule: ${rule.name}`
      );

      return {
        success: true,
        userId,
        triggerEvent,
        previousScore,
        newScore,
        pointsChange,
        ruleId: rule.id.toString(),
        ruleName: rule.name,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing trust score event for user ${userId}, trigger: ${triggerEvent}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      return {
        success: false,
        userId,
        triggerEvent,
        error: errorMessage,
      };
    }
  }
}
