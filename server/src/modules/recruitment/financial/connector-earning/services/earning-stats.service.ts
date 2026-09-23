import { Injectable, Inject } from "@nestjs/common";
import { utcDayjs } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, sql, gte, lte, inArray } from "drizzle-orm";
import type { ConnectorEarningStatsResponse } from "../connector-earning.response";

/**
 * Global stat aggregates for the Connector Earning page.
 *
 * All four queries use the same base filter (self + connector + not deleted)
 * and run in parallel. Numeric sums are wrapped in COALESCE so an empty
 * result set returns 0 instead of null.
 *
 * - totalEarnings        : lifetime completed earnings
 * - totalEarningsThisMonth / LastMonth : used by the frontend to compute the
 *                                        month-over-month delta badge
 * - pendingPayouts       : everything non-terminal that is on its way to the
 *                          user (pending, processing, onboarding_pending)
 */
@Injectable()
export class EarningStatsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getStats(userId: string): Promise<ConnectorEarningStatsResponse> {
    const ph = schema.recruitmentPayoutHistory;
    const baseWhere = and(
      eq(ph.recipientId, userId),
      eq(ph.payoutType, "connector"),
      isNull(ph.deletedAt)
    );

    // Use utcDayjs (never `new Date()`) so month boundaries stay consistent
    // across deployments regardless of server-local timezone.
    const startOfThisMonth = utcDayjs().startOf("month").toDate();
    const startOfLastMonth = utcDayjs()
      .subtract(1, "month")
      .startOf("month")
      .toDate();
    const endOfLastMonth = utcDayjs()
      .subtract(1, "month")
      .endOf("month")
      .toDate();

    const completedFilter = eq(ph.processingStatus, "completed");
    const pendingFilter = inArray(ph.processingStatus, [
      "pending",
      "queued",
      "processing",
      "onboarding_pending",
    ]);

    const [totalRow, thisMonthRow, lastMonthRow, pendingRow] =
      await Promise.all([
        this.db
          .select({
            total: sql<string>`COALESCE(SUM(${ph.recipientAmount}), 0)`,
          })
          .from(ph)
          .where(and(baseWhere, completedFilter)),
        this.db
          .select({
            total: sql<string>`COALESCE(SUM(${ph.recipientAmount}), 0)`,
          })
          .from(ph)
          .where(
            and(baseWhere, completedFilter, gte(ph.createdAt, startOfThisMonth))
          ),
        this.db
          .select({
            total: sql<string>`COALESCE(SUM(${ph.recipientAmount}), 0)`,
          })
          .from(ph)
          .where(
            and(
              baseWhere,
              completedFilter,
              gte(ph.createdAt, startOfLastMonth),
              lte(ph.createdAt, endOfLastMonth)
            )
          ),
        this.db
          .select({
            total: sql<string>`COALESCE(SUM(${ph.recipientAmount}), 0)`,
          })
          .from(ph)
          .where(and(baseWhere, pendingFilter)),
      ]);

    return {
      totalEarnings: Number(totalRow[0]?.total ?? 0),
      totalEarningsThisMonth: Number(thisMonthRow[0]?.total ?? 0),
      totalEarningsLastMonth: Number(lastMonthRow[0]?.total ?? 0),
      pendingPayouts: Number(pendingRow[0]?.total ?? 0),
    };
  }
}
