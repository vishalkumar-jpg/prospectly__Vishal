import { Injectable, Logger, Inject } from "@nestjs/common";
import { utcDayjs } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, sql, gte, inArray } from "drizzle-orm";
import type { SpendingStatsResponse } from "../requester-spending.response";
import {
  REQUESTER_SPENDING_MESSAGES,
  REQUESTER_SPENDING_TXN_TYPES,
} from "../requester-spending.constants";

@Injectable()
export class SpendingStatsService {
  private readonly logger = new Logger(SpendingStatsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getStats(userId: string): Promise<SpendingStatsResponse> {
    this.logger.log(REQUESTER_SPENDING_MESSAGES.INFO.FETCHING_STATS(userId));

    const txn = schema.recruitmentInterviewTransactions;
    // All real money the recruiter spent — interview/referral charges, the flat
    // one-time deposit, the flat fee top-up, the candidate success fee, and the
    // success-fee top-up (see REQUESTER_SPENDING_TXN_TYPES). Kept identical to the
    // list feed so the headline totals match the transaction list.
    const baseWhere = and(
      eq(txn.recruiterId, userId),
      inArray(txn.transactionType, [...REQUESTER_SPENDING_TXN_TYPES]),
      isNull(txn.deletedAt)
    );
    const monthStart = utcDayjs().startOf("month").toDate();

    const [captured, authorized, thisMonth] = await Promise.all([
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${txn.totalAmount}), 0)` })
        .from(txn)
        .where(and(baseWhere, eq(txn.status, "captured"))),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${txn.totalAmount}), 0)` })
        .from(txn)
        .where(and(baseWhere, eq(txn.status, "authorized"))),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${txn.totalAmount}), 0)` })
        .from(txn)
        .where(
          and(
            baseWhere,
            eq(txn.status, "captured"),
            gte(txn.capturedAt, monthStart)
          )
        ),
    ]);

    return {
      totalSpent: Number(captured[0]?.total ?? 0),
      upcomingPayments: Number(authorized[0]?.total ?? 0),
      spentThisMonth: Number(thisMonth[0]?.total ?? 0),
    };
  }
}
