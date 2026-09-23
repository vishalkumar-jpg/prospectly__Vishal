import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { AnyType } from "types/common";
import { GetSubscriptionHistoryQueryDto } from "../subscriptions.dto";

@Injectable()
export class SubscriptionHistoryHelper {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Get subscription transaction history for a user
   * @param userId - User ID
   * @returns Array of subscription transactions
   */
  async getSubscriptionHistory(
    userId: string,
    query: GetSubscriptionHistoryQueryDto
  ) {
    const { db } = this;
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;

    const [transactions, totalCountResult] = await Promise.all([
      db.query.subscriptionTransactions.findMany({
        where: eq(schema.subscriptionTransactions.userId, userId),
        with: {
          subscription: {
            with: {
              subscriptionPlan: true,
            },
          },
          fromPlan: true,
          toPlan: true,
        },
        orderBy: desc(schema.subscriptionTransactions.createdAt),
        limit,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.subscriptionTransactions)
        .where(eq(schema.subscriptionTransactions.userId, userId)),
    ]);

    const total = Number(totalCountResult[0]?.count || 0);

    return {
      transactions: transactions.map((tx) => {
        const fromPlan = tx.fromPlan as AnyType;
        const toPlan = tx.toPlan as AnyType;
        const subscription = tx.subscription as AnyType;
        const subPlan = subscription?.subscriptionPlan as AnyType;

        return {
          id: tx.id,
          transactionType: tx.transactionType,
          fromPlan: fromPlan
            ? {
                id: fromPlan.id,
                name: fromPlan.name,
              }
            : null,
          toPlan: toPlan
            ? {
                id: toPlan.id,
                name: toPlan.name,
              }
            : null,
          amount: tx.amount ? Number(tx.amount) : null,
          currency: tx.currency,
          stripeEventId: tx.stripeEventId,
          metadata: tx.metadata || {},
          createdAt: tx.createdAt,
          subscription: subscription
            ? {
                id: subscription.id,
                plan: subPlan
                  ? {
                      id: subPlan.id,
                      name: subPlan.name,
                    }
                  : null,
              }
            : null,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
