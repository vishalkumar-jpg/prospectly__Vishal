import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { CreditBalanceHelper } from "./helpers/credit-balance.helper";
import { CreditImportMetricsHelper } from "./credit-import-metrics.helper";
import {
  CreditBalance,
  CreditHistoryResponse,
  CreditRuleForUI,
} from "./credits.types";
import { CREDIT_MESSAGES } from "./credits.constants";

/**
 * Credits Service
 *
 * Main service for credit operations - balance, rules, and history.
 */
@Injectable()
export class CreditsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly creditBalanceHelper: CreditBalanceHelper,
    private readonly creditImportMetricsHelper: CreditImportMetricsHelper
  ) {}

  /**
   * Get user's current credit balance
   */
  async getMyCreditBalance(userId: string): Promise<CreditBalance> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { creditBalance: true, updatedAt: true },
    });

    if (!user) {
      throw new NotFoundException(CREDIT_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    return {
      balance: parseFloat(String(user.creditBalance)),
      lastUpdated: user.updatedAt?.toISOString() || toUTC().toISOString(),
    };
  }

  /**
   * Get credit rules with earned/pending status for UI
   */
  async getCreditRulesForUI(userId: string): Promise<CreditRuleForUI[]> {
    // Get all active credit rules
    const rules = await this.db.query.creditRulesSchema.findMany({
      where: and(
        eq(schema.creditRulesSchema.isActive, true),
        isNull(schema.creditRulesSchema.deletedAt)
      ),
    });

    // Get user's awarded credits
    const awards = await this.db.query.userCreditAwards.findMany({
      where: eq(schema.userCreditAwards.userId, userId),
    });

    const awardsByProvider = new Map(
      awards.map((a) => [a.provider.toLowerCase(), a])
    );

    // Build response with earned status
    const result: CreditRuleForUI[] = [];

    for (const rule of rules) {
      const provider = rule.provider.toLowerCase();
      const award = awardsByProvider.get(provider);
      const importedContactsCount =
        await this.creditImportMetricsHelper.getCumulativeImportedForUserProvider(
          userId,
          provider
        );

      result.push({
        id: rule.id,
        provider: rule.provider,
        threshold: parseInt(String(rule.contactImport), 10),
        credits: parseFloat(String(rule.credits)),
        isEarned: !!award,
        earnedAt: award?.awardedAt?.toISOString(),
        importedContactsCount,
      });
    }

    return result;
  }

  /**
   * Get paginated credit history for user
   */
  async getMyCreditHistory(
    userId: string,
    limit = 10,
    offset = 0
  ): Promise<CreditHistoryResponse> {
    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userCreditHistory)
      .where(eq(schema.userCreditHistory.userId, userId));

    const totalItems = countResult[0]?.count || 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalItems / limit);

    // Get history entries
    const history = await this.db
      .select()
      .from(schema.userCreditHistory)
      .where(eq(schema.userCreditHistory.userId, userId))
      .orderBy(desc(schema.userCreditHistory.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with introduction details for "used" transactions
    const requestIds = history
      .filter((h) => h.introductionRequestId)
      .map((h) => h.introductionRequestId as string);

    const introDetailsMap = new Map<
      string,
      { title: string; requesterName: string }
    >();

    if (requestIds.length > 0) {
      const introductions = await this.db
        .select({
          id: schema.introductionRequests.id,
          meetingTitle: schema.introductionRequests.meetingTitle,
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
            requestIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );

      for (const intro of introductions) {
        introDetailsMap.set(intro.id, {
          title: intro.meetingTitle || "Introduction",
          requesterName:
            [intro.requesterFirstName, intro.requesterLastName]
              .filter(Boolean)
              .join(" ") || "Unknown",
        });
      }
    }

    // Build response
    const enrichedHistory = history.map((entry) => {
      const introDetails = entry.introductionRequestId
        ? introDetailsMap.get(entry.introductionRequestId)
        : null;

      return {
        id: entry.id,
        transactionType: entry.transactionType as "earned" | "used",
        provider: entry.provider || undefined,
        amount: parseFloat(String(entry.amount)),
        balanceBefore: parseFloat(String(entry.balanceBefore)),
        balanceAfter: parseFloat(String(entry.balanceAfter)),
        enrichedContactsCount: entry.enrichedContactsCount || undefined,
        introductionTitle: introDetails?.title,
        requesterName: introDetails?.requesterName,
        createdAt: entry.createdAt.toISOString(),
        evidence: entry.evidence as Record<string, unknown> | undefined,
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
}
