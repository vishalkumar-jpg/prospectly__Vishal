import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TRUST_SCORE_MESSAGES } from "../trust-score-queue/trust-score-queue.constants";

@Injectable()
export class TrustScoreService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Get current user's trust score
   */
  async getMyScore(userId: string): Promise<{
    trustScore: number;
    lastUpdated: string;
  }> {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!profile) {
      throw new NotFoundException(TRUST_SCORE_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    const trustScore = profile.trustScore ? Number(profile.trustScore) : 0;
    const lastUpdated =
      profile.updatedAt?.toISOString() || toUTC().toISOString();

    return {
      trustScore,
      lastUpdated,
    };
  }

  /**
   * Calculate net points for all rules for a user
   * Returns a map of ruleId -> netPoints
   */
  private async getNetPointsForAllRules(
    userId: string
  ): Promise<Map<string, number>> {
    const history = await this.db
      .select()
      .from(schema.userTrustScoreHistory)
      .where(eq(schema.userTrustScoreHistory.userId, userId));

    const netPointsMap = new Map<string, number>();

    for (const entry of history) {
      const { ruleId } = entry;
      const change = Number(entry.pointsChange);
      const current = netPointsMap.get(ruleId) || 0;
      netPointsMap.set(ruleId, current + change);
    }

    return netPointsMap;
  }

  /**
   * Calculate response rate statistics for a connector
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
   * Calculate peer review statistics for a connector
   */
  private async calculatePeerReviewStats(userId: string): Promise<{
    reviewCount: number;
    averageRating: number;
  }> {
    const allPeerFeedback = await this.db
      .select()
      .from(schema.introductionFeedback)
      .where(
        and(
          eq(schema.introductionFeedback.feedbackToUserId, userId),
          eq(schema.introductionFeedback.feedbackType, "peer_feedback")
        )
      );

    if (allPeerFeedback.length === 0) {
      return { reviewCount: 0, averageRating: 0 };
    }

    const ratings = allPeerFeedback
      .map((f) => Number(f.rating))
      .filter((r) => !isNaN(r));

    const reviewCount = ratings.length;
    const averageRating =
      reviewCount > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount
        : 0;

    return { reviewCount, averageRating };
  }

  /**
   * Calculate success rate statistics for a connector
   */
  private async calculateSuccessRateStats(userId: string): Promise<{
    totalAccepted: number;
    successfulCount: number;
    failedCount: number;
    successRate: number;
  }> {
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
            userId
          ),
          eq(schema.introductionPotentialConnectors.status, "accepted")
        )
      );

    // Get failed attempts for this connector
    const failedAttempts = await this.db
      .select()
      .from(schema.introductionFulfillmentAttempts)
      .where(eq(schema.introductionFulfillmentAttempts.connectorId, userId));

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

    return {
      totalAccepted,
      successfulCount,
      failedCount,
      successRate,
    };
  }

  /**
   * Get history entries for a specific rule
   */
  private async getRuleHistory(
    userId: string,
    ruleId: string
  ): Promise<
    Array<{
      triggeredAt: Date;
      actionType: string;
      pointsChange: number;
      evidence: Record<string, unknown> | null;
    }>
  > {
    const history = await this.db.query.userTrustScoreHistory.findMany({
      where: and(
        eq(schema.userTrustScoreHistory.userId, userId),
        eq(schema.userTrustScoreHistory.ruleId, ruleId)
      ),
      orderBy: [desc(schema.userTrustScoreHistory.triggeredAt)],
    });

    return history.map((entry) => ({
      triggeredAt: entry.triggeredAt,
      actionType: entry.actionType,
      pointsChange: Number(entry.pointsChange),
      evidence: entry.evidence as Record<string, unknown> | null,
    }));
  }

  /**
   * Generate progress information for response rate rules
   */
  private generateProgressInfo(
    slug: string,
    configParams: Record<string, unknown> | null,
    stats: {
      totalResponses: number;
      responsesWithin48h: number;
      average48hRate: number;
    }
  ): {
    currentPercentage: number;
    requiredPercentage: number;
    totalResponses: number;
    qualifyingResponses: number;
    status: "earned" | "close" | "needs_improvement";
    message: string;
  } {
    const requiredPercentage = configParams?.min_avg_response
      ? Number(configParams.min_avg_response)
      : 85;

    const currentPercentage = stats.average48hRate;
    const qualifyingResponses = stats.responsesWithin48h;

    // Determine status
    let status: "earned" | "close" | "needs_improvement";
    if (currentPercentage >= requiredPercentage) {
      status = "earned";
    } else if (currentPercentage >= requiredPercentage - 10) {
      status = "close";
    } else {
      status = "needs_improvement";
    }

    // Generate user-friendly message
    let message: string;
    const diff = Math.abs(requiredPercentage - currentPercentage);
    const ruleName = "48-hour response";

    if (stats.totalResponses === 0) {
      message = "Start responding to introduction requests to earn this point";
    } else if (status === "earned") {
      if (currentPercentage === 100) {
        message = `Perfect! You're maintaining 100% ${ruleName} rate`;
      } else {
        message = `Great job! You're maintaining ${currentPercentage.toFixed(1)}% ${ruleName} rate`;
      }
    } else if (status === "close") {
      message = `You're at ${currentPercentage.toFixed(0)}% - just ${diff.toFixed(0)}% away from earning this point!`;
    } else {
      message = `Current: ${currentPercentage.toFixed(0)}% - Improve to ${requiredPercentage}% to earn this point`;
    }

    return {
      currentPercentage: Math.round(currentPercentage * 10) / 10,
      requiredPercentage,
      totalResponses: stats.totalResponses,
      qualifyingResponses,
      status,
      message,
    };
  }

  /**
   * Get earned and pending trust score rules for current user
   */
  async getMyRules(userId: string): Promise<{
    earned: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      earnedAt: string;
      evidence: Record<string, unknown> | null;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }>;
    pending: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      actionUrl?: string;
      actionLabel?: string;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }>;
    deductions: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      triggeredAt?: string;
      evidence: Record<string, unknown> | null;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }>;
  }> {
    // Get all active trust score rules (ordered by priority ascending - 1 first)
    const allRules = await this.db.query.trustScoreRules.findMany({
      where: and(
        eq(schema.trustScoreRules.isActive, true),
        isNull(schema.trustScoreRules.deletedAt)
      ),
      orderBy: [asc(schema.trustScoreRules.priority)],
    });

    // Get user's trust score history
    const userHistory = await this.db.query.userTrustScoreHistory.findMany({
      where: eq(schema.userTrustScoreHistory.userId, userId),
      orderBy: [desc(schema.userTrustScoreHistory.triggeredAt)],
      with: {
        rule: true,
      },
    });

    // Calculate net points for all rules
    const netPointsMap = await this.getNetPointsForAllRules(userId);

    // Define toggle-based rules that need net points check
    const toggleRuleSlugs = [
      "response_within_48h",
      "positive_peer_reviews",
      "high_success_rate",
    ];

    // Calculate response rate stats once for efficiency (for progress info)
    const responseRateSlugs = ["response_within_48h"];
    let responseStats: Awaited<
      ReturnType<typeof this.calculateResponseRateStats>
    > | null = null;

    // Create a map of earned rule IDs (get the most recent earning for each rule)
    const earnedRuleMap = new Map<string, (typeof userHistory)[0]>();
    for (const historyEntry of userHistory) {
      if (!earnedRuleMap.has(historyEntry.ruleId)) {
        earnedRuleMap.set(historyEntry.ruleId, historyEntry);
      }
    }

    // Separate earned and pending rules
    const earned: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      earnedAt: string;
      evidence: Record<string, unknown> | null;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }> = [];

    const pending: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      actionUrl?: string;
      actionLabel?: string;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }> = [];

    const deductions: Array<{
      ruleId: string;
      slug: string;
      name: string;
      description: string | null;
      points: number;
      priority: number;
      actionType: string;
      triggeredAt?: string;
      evidence: Record<string, unknown> | null;
      configParams?: Record<string, unknown>;
      progressInfo?: {
        currentPercentage: number;
        requiredPercentage: number;
        totalResponses: number;
        qualifyingResponses: number;
        status: "earned" | "close" | "needs_improvement";
        message: string;
      };
      history?: Array<{
        triggeredAt: string;
        actionType: string;
        pointsChange: number;
        evidence: Record<string, unknown> | null;
      }>;
    }> = [];

    for (const rule of allRules) {
      const historyEntry = earnedRuleMap.get(rule.id);
      const ruleData = {
        ruleId: rule.id,
        slug: rule.slug,
        name: rule.name,
        description: rule.description,
        points: Number(rule.points),
        priority: rule.priority ?? 0,
        actionType: rule.actionType,
        configParams: rule.configParams
          ? (rule.configParams as Record<string, unknown>)
          : undefined,
      };

      // Calculate progress info for response rate, high success, and peer reviews rules
      let progressInfo:
        | {
            currentPercentage: number;
            requiredPercentage: number;
            totalResponses: number;
            qualifyingResponses: number;
            status: "earned" | "close" | "needs_improvement";
            message: string;
            // Optionals for peer reviews
            requiredCount?: number;
            currentAverage?: number;
            currentCount?: number;
          }
        | undefined;

      // Fetch history for response rate rules
      let ruleHistory:
        | Array<{
            triggeredAt: string;
            actionType: string;
            pointsChange: number;
            evidence: Record<string, unknown> | null;
          }>
        | undefined;

      if (responseRateSlugs.includes(rule.slug)) {
        if (!responseStats) {
          responseStats = await this.calculateResponseRateStats(userId);
        }
        progressInfo = this.generateProgressInfo(
          rule.slug,
          rule.configParams as Record<string, unknown> | null,
          responseStats
        );

        // Fetch history for this rule
        const history = await this.getRuleHistory(userId, rule.id);
        if (history.length > 0) {
          ruleHistory = history.map((entry) => ({
            triggeredAt: entry.triggeredAt.toISOString(),
            actionType: entry.actionType,
            pointsChange: entry.pointsChange,
            evidence: entry.evidence,
          }));
        }
      } else if (rule.slug === "high_success_rate") {
        // Calculate success rate statistics from introductions table
        const config = rule.configParams as Record<string, unknown> | undefined;
        const requiredPercentage = config?.min_success_rate
          ? Number(config.min_success_rate)
          : 85;

        // Fetch actual success rate stats
        const successStats = await this.calculateSuccessRateStats(userId);
        const currentPercentage = successStats.successRate;
        const { totalAccepted } = successStats;
        const { successfulCount } = successStats;

        progressInfo = {
          currentPercentage,
          requiredPercentage,
          totalResponses: totalAccepted,
          qualifyingResponses: successfulCount,
          status:
            currentPercentage >= requiredPercentage
              ? "earned"
              : currentPercentage >= requiredPercentage - 10
                ? "close"
                : "needs_improvement",
          message: `Achieve a success rate of at least ${requiredPercentage}% on introductions to earn points.`,
        };

        // Fetch history for this rule
        const history = await this.getRuleHistory(userId, rule.id);
        if (history.length > 0) {
          ruleHistory = history.map((entry) => ({
            triggeredAt: entry.triggeredAt.toISOString(),
            actionType: entry.actionType,
            pointsChange: entry.pointsChange,
            evidence: entry.evidence,
          }));
        }
      } else if (rule.slug === "positive_peer_reviews") {
        // Calculate peer review statistics from feedback table
        const config = rule.configParams as Record<string, unknown> | undefined;
        const requiredAverage = config?.min_avg_rating
          ? Number(config.min_avg_rating)
          : 4.5;
        const requiredCount = config?.min_reviews
          ? Number(config.min_reviews)
          : 2;

        // Fetch actual feedback stats
        const feedbackStats = await this.calculatePeerReviewStats(userId);
        const currentAverage = feedbackStats.averageRating;
        const currentCount = feedbackStats.reviewCount;

        // Convert rating (0-5 scale) to percentage (0-100%) for progress bar
        const currentPercentage = currentAverage * 20; // 5 stars = 100%
        const requiredPercentage = requiredAverage * 20; // 4.5 stars = 90%

        progressInfo = {
          currentPercentage,
          requiredPercentage,
          totalResponses: currentCount, // Total reviews received
          qualifyingResponses: currentCount, // All peer feedback counts
          status:
            currentAverage >= requiredAverage && currentCount >= requiredCount
              ? "earned"
              : currentAverage >= requiredAverage - 0.5
                ? "close"
                : "needs_improvement",
          message: `Maintain an average peer review rating of at least ${requiredAverage} stars from ${requiredCount} reviews to earn points.`,
          requiredCount,
          currentAverage,
          currentCount,
        };
      }

      if (historyEntry && historyEntry.rule) {
        // For toggle rules, check net points to determine if currently earned
        if (toggleRuleSlugs.includes(rule.slug)) {
          const netPoints = netPointsMap.get(rule.id) || 0;

          if (netPoints > 0) {
            // Currently earned (net points > 0)
            const rulesWithoutEvidence = [
              "high_success_rate",
              "no_response_48h",
              "response_within_48h",
            ];
            const shouldExcludeEvidence = rulesWithoutEvidence.includes(
              rule.slug.toLowerCase()
            );

            // Only add to earned if it's a positive achievement (not a deduction)
            if (Number(rule.points) > 0 && rule.actionType !== "SUBTRACT") {
              earned.push({
                ...ruleData,
                earnedAt: historyEntry.triggeredAt.toISOString(),
                evidence: shouldExcludeEvidence
                  ? null
                  : ((historyEntry.evidence ?? {}) as Record<string, unknown>),
                progressInfo,
                history: ruleHistory,
              });
            } else if (
              rule.actionType === "SUBTRACT" ||
              Number(rule.points) < 0
            ) {
              // Add deduction rules to deductions array for user awareness
              deductions.push({
                ...ruleData,
                triggeredAt: historyEntry.triggeredAt.toISOString(),
                evidence: shouldExcludeEvidence
                  ? null
                  : ((historyEntry.evidence ?? {}) as Record<string, unknown>),
                progressInfo,
                history: ruleHistory,
              });
            }
          } else {
            // Was earned but deducted (net points <= 0) - show as pending
            if (Number(rule.points) > 0) {
              const actionInfo = this.getActionUrlForRule(rule.slug, rule.name);
              pending.push({
                ...ruleData,
                actionUrl: actionInfo.url,
                actionLabel: actionInfo.label,
                progressInfo,
                history: ruleHistory,
              });
            }
          }
        } else {
          // Non-toggle rules - use existing logic (if history exists, it's earned)
          const rulesWithoutEvidence = [
            "high_success_rate",
            "no_response_48h",
            "response_within_48h",
          ];
          const shouldExcludeEvidence = rulesWithoutEvidence.includes(
            rule.slug.toLowerCase()
          );

          // Only add to earned if it's a positive achievement (not a deduction)
          if (Number(rule.points) > 0 && rule.actionType !== "SUBTRACT") {
            earned.push({
              ...ruleData,
              earnedAt: historyEntry.triggeredAt.toISOString(),
              evidence: shouldExcludeEvidence
                ? null
                : ((historyEntry.evidence ?? {}) as Record<string, unknown>),
              progressInfo,
              history: ruleHistory,
            });
          } else if (
            rule.actionType === "SUBTRACT" ||
            Number(rule.points) < 0
          ) {
            // Add deduction rules to deductions array for user awareness
            deductions.push({
              ...ruleData,
              triggeredAt: historyEntry.triggeredAt.toISOString(),
              evidence: shouldExcludeEvidence
                ? null
                : ((historyEntry.evidence ?? {}) as Record<string, unknown>),
              progressInfo,
              history: ruleHistory,
            });
          }
        }
      } else {
        // Rule is pending (never earned)
        // Only show positive rules in pending (negative rules like no_response_48h, dispute_declined shouldn't be actionable)
        if (Number(rule.points) > 0) {
          const actionInfo = this.getActionUrlForRule(rule.slug, rule.name);
          pending.push({
            ...ruleData,
            actionUrl: actionInfo.url,
            actionLabel: actionInfo.label,
            progressInfo,
            history: ruleHistory,
          });
        }
      }
    }

    // Sort all arrays by priority (ascending) to ensure correct order in response
    // Lower priority value = displayed first (1 first, then 2, 3, etc.)
    earned.sort((a, b) => a.priority - b.priority);
    pending.sort((a, b) => a.priority - b.priority);
    deductions.sort((a, b) => a.priority - b.priority);

    return { earned, pending, deductions };
  }

  /**
   * Get trust score history for current user with enriched evidence details
   */
  async getMyHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{
    history: Array<{
      id: number;
      ruleId: number;
      ruleName: string;
      ruleSlug: string;
      previousScore: number;
      newScore: number;
      pointsChange: number;
      actionType: string;
      evidence: Record<string, unknown>;
      triggeredAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    // Get total count first
    const totalCountResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userTrustScoreHistory)
      .where(eq(schema.userTrustScoreHistory.userId, userId));

    const totalItems = totalCountResult[0]?.count || 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalItems / limit);

    const history = await this.db.query.userTrustScoreHistory.findMany({
      where: eq(schema.userTrustScoreHistory.userId, userId),
      orderBy: [desc(schema.userTrustScoreHistory.triggeredAt)],
      limit,
      offset,
      with: {
        rule: true,
      },
    });

    // Collect all unique request IDs from evidence to fetch introduction details
    const requestIds = new Set<string>();
    const feedbackIds = new Set<string>();

    for (const entry of history) {
      const evidence = entry.evidence as Record<string, unknown> | null;
      if (evidence?.requestId && typeof evidence.requestId === "string") {
        requestIds.add(evidence.requestId);
      }
      if (evidence?.feedbackId && typeof evidence.feedbackId === "string") {
        feedbackIds.add(evidence.feedbackId);
      }
    }

    // Fetch introduction request details in bulk
    const introductionDetailsMap = new Map<
      string,
      { title: string; requesterName: string; prospectName: string }
    >();

    if (requestIds.size > 0) {
      const introductions = await this.db
        .select({
          id: schema.introductionRequests.id,
          meetingTitle: schema.introductionRequests.meetingTitle,
          contactName: schema.introductionRequests.contactName,
          requesterFirstName: schema.users.firstName,
          requesterLastName: schema.users.lastName,
        })
        .from(schema.introductionRequests)
        .leftJoin(
          schema.users,
          eq(schema.introductionRequests.requesterId, schema.users.id)
        )
        .where(
          sql`${schema.introductionRequests.id} IN (${sql.join(
            Array.from(requestIds).map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );

      for (const intro of introductions) {
        introductionDetailsMap.set(intro.id, {
          title: intro.meetingTitle || "Untitled Introduction",
          requesterName:
            [intro.requesterFirstName, intro.requesterLastName]
              .filter(Boolean)
              .join(" ") || "Unknown",
          prospectName: intro.contactName || "Unknown",
        });
      }
    }

    // Fetch feedback details in bulk
    const feedbackDetailsMap = new Map<
      string,
      { rating: number; feedbackText: string | null; fromUserName: string }
    >();

    if (feedbackIds.size > 0) {
      const feedbacks = await this.db
        .select({
          id: schema.introductionFeedback.id,
          rating: schema.introductionFeedback.rating,
          feedbackText: schema.introductionFeedback.feedbackText,
          fromUserFirstName: schema.users.firstName,
          fromUserLastName: schema.users.lastName,
        })
        .from(schema.introductionFeedback)
        .leftJoin(
          schema.users,
          eq(schema.introductionFeedback.feedbackFromUserId, schema.users.id)
        )
        .where(
          sql`${schema.introductionFeedback.id} IN (${sql.join(
            Array.from(feedbackIds).map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );

      for (const feedback of feedbacks) {
        feedbackDetailsMap.set(feedback.id, {
          rating: feedback.rating ? Number(feedback.rating) : 0,
          feedbackText: feedback.feedbackText,
          fromUserName:
            [feedback.fromUserFirstName, feedback.fromUserLastName]
              .filter(Boolean)
              .join(" ") || "Anonymous",
        });
      }
    }

    const enrichedHistory = history.map((entry) => {
      const evidence = (entry.evidence ?? {}) as Record<string, unknown>;
      const enrichedEvidence: Record<string, unknown> = { ...evidence };

      // Enrich with introduction request details
      if (evidence.requestId && typeof evidence.requestId === "string") {
        const introDetails = introductionDetailsMap.get(evidence.requestId);
        if (introDetails) {
          enrichedEvidence.introductionTitle = introDetails.title;
          enrichedEvidence.requesterName = introDetails.requesterName;
          enrichedEvidence.prospectName = introDetails.prospectName;
        }
      }

      // Enrich with feedback details
      if (evidence.feedbackId && typeof evidence.feedbackId === "string") {
        const feedbackDetails = feedbackDetailsMap.get(evidence.feedbackId);
        if (feedbackDetails) {
          enrichedEvidence.feedbackRating = feedbackDetails.rating;
          enrichedEvidence.feedbackText = feedbackDetails.feedbackText;
          enrichedEvidence.feedbackFromUser = feedbackDetails.fromUserName;
        }
      }

      const { rule } = entry as AnyType;
      return {
        id: Number(entry.id),
        ruleId: Number(entry.ruleId),
        ruleName: rule?.name || "",
        ruleSlug: rule?.slug || "",
        previousScore: entry.previousScore ? Number(entry.previousScore) : 0,
        newScore: entry.newScore ? Number(entry.newScore) : 0,
        pointsChange: entry.pointsChange ? Number(entry.pointsChange) : 0,
        actionType: entry.actionType,
        evidence: enrichedEvidence,
        triggeredAt: entry.triggeredAt.toISOString(),
      };
    });

    return {
      history: enrichedHistory,
      pagination: {
        page: currentPage,
        limit,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };
  }

  /**
   * Map trust score rule slug to action URL and label
   */
  private getActionUrlForRule(
    slug: string,
    _name: string
  ): { url?: string; label?: string } {
    const actionMap: Record<string, { url: string; label: string }> = {
      phone_verified: {
        url: "/profile/user-profile",
        label: "Verify Phone",
      },
      linkedin_oauth_connected: {
        url: "/profile/user-profile",
        label: "Connect LinkedIn",
      },
      google_contact_import: {
        url: "/getting-started?step=1",
        label: "Import Google Contacts",
      },
      microsoft_contact_import: {
        url: "/getting-started?step=1",
        label: "Import Microsoft Contacts",
      },
      apple_contact_import: {
        url: "/getting-started?step=1",
        label: "Import Apple Contacts",
      },
      csv_manual_upload: {
        url: "/getting-started?step=1",
        label: "Upload CSV",
      },
      response_within_48h: {
        url: "/prospecting/incoming-requests/inbox",
        label: "Respond Quickly",
      },
      positive_peer_reviews: {
        url: "/prospecting/my-prospects/open-request",
        label: "Get Positive Reviews",
      },
      high_success_rate: {
        url: "/prospecting/incoming-requests/inbox",
        label: "Maintain High Success Rate",
      },
      linkedin_zip_import: {
        url: "/getting-started?step=1",
        label: "Import LinkedIn Contacts",
      },
    };

    return actionMap[slug] || {};
  }
}
