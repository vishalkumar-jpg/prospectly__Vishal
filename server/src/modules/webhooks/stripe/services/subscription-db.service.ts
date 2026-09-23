import { Injectable, Inject, Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull, inArray } from "drizzle-orm";
import * as schema from "database/schema";
import {
  SubscriptionTransactionMetadata,
  SUBSCRIPTION_TRANSACTION_TYPES,
} from "../stripe.constants";

@Injectable()
export class SubscriptionDbService {
  private readonly logger = new Logger(SubscriptionDbService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Find subscription by Stripe subscription ID
   */
  async findSubscriptionByStripeId(
    stripeSubscriptionId: string
  ): Promise<schema.UserSubscription | null> {
    const subscription = await this.db.query.userSubscription.findFirst({
      where: eq(
        schema.userSubscription.stripeSubscriptionId,
        stripeSubscriptionId
      ),
    });

    return subscription || null;
  }

  /**
   * Create a new user subscription
   */
  async createUserSubscription(
    subscriptionData: typeof schema.userSubscription.$inferInsert
  ): Promise<schema.UserSubscription> {
    const [subscription] = await this.db
      .insert(schema.userSubscription)
      .values(subscriptionData)
      .returning();

    this.logger.log(
      `Created subscription ${subscription.stripeSubscriptionId} for user ${subscription.userId}`
    );

    // Record 'created' transaction
    try {
      const price = await this.findPriceById(subscriptionData.priceId);
      const amountValue = price ? Number(price.price) : 0;
      const currency = "usd";

      await this.recordSubscriptionTransaction({
        userId: subscriptionData.userId,
        subscriptionId: subscription.id,
        transactionType: SUBSCRIPTION_TRANSACTION_TYPES.CREATED,
        amount: amountValue,
        currency,
        toPlanId: subscriptionData.subscriptionPlanId,
        metadata: {
          stripe_price_id: price?.stripePriceId,
          subscription_plan_price_id: price?.id,
          price: amountValue,
          interval: price?.interval || undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record creation transaction for subscription ${subscription.id}: ${err}`
      );
      // Don't fail the main flow
    }

    return subscription;
  }

  /**
   * Update an existing user subscription
   */
  async updateUserSubscription(
    stripeSubscriptionId: string,
    updateData: Partial<typeof schema.userSubscription.$inferInsert>
  ): Promise<schema.UserSubscription> {
    const [subscription] = await this.db
      .update(schema.userSubscription)
      .set({
        ...updateData,
        updatedAt: toUTC(),
      })
      .where(
        eq(schema.userSubscription.stripeSubscriptionId, stripeSubscriptionId)
      )
      .returning();

    this.logger.log(
      `Updated subscription ${stripeSubscriptionId} for user ${subscription.userId}`
    );

    return subscription;
  }

  /**
   * Convert existing subscription to free plan
   */
  async convertSubscriptionToFreePlan(
    oldStripeSubscriptionId: string,
    newStripeSubscriptionId: string,
    freePlanId: string,
    freePriceId: string
  ): Promise<schema.UserSubscription> {
    const [subscription] = await this.db
      .update(schema.userSubscription)
      .set({
        subscriptionPlanId: freePlanId,
        priceId: freePriceId,
        stripeSubscriptionId: newStripeSubscriptionId,
        status: "active",
        currentPeriodStart: toUTC(),
        currentPeriodEnd: (() => {
          const d = toUTC();
          d.setFullYear(d.getFullYear() + 1);
          return d;
        })(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: toUTC(),
      })
      .where(
        eq(
          schema.userSubscription.stripeSubscriptionId,
          oldStripeSubscriptionId
        )
      )
      .returning();

    return subscription;
  }

  /**
   * Find all active or trialing subscriptions for a user
   */
  async findActiveSubscriptionsByUserId(
    userId: string
  ): Promise<schema.UserSubscription[]> {
    const subscriptions = await this.db.query.userSubscription.findMany({
      where: and(
        eq(schema.userSubscription.userId, userId),
        inArray(schema.userSubscription.status, ["active", "trialing"]),
        isNull(schema.userSubscription.deletedAt)
      ),
    });

    return subscriptions;
  }

  /**
   * Find plan by ID
   */
  async findPlanById(planId: string): Promise<schema.SubscriptionPlan | null> {
    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: eq(schema.subscriptionPlan.id, planId),
    });

    return plan || null;
  }

  /**
   * Find plan price by ID
   */
  async findPriceById(
    priceId: string
  ): Promise<schema.SubscriptionPlanPrice | null> {
    const price = await this.db.query.subscriptionPlanPrice.findFirst({
      where: eq(schema.subscriptionPlanPrice.id, priceId),
    });

    return price || null;
  }

  /**
   * Find all subscriptions for a user (including inactive)
   */
  async findAllSubscriptionsByUserId(
    userId: string
  ): Promise<schema.UserSubscription[]> {
    const subscriptions = await this.db.query.userSubscription.findMany({
      where: eq(schema.userSubscription.userId, userId),
    });

    return subscriptions;
  }

  /**
   * Record a subscription transaction
   */
  async recordSubscriptionTransaction(data: {
    userId: string;
    subscriptionId: string;
    transactionType: string;
    amount?: number | string;
    currency?: string;
    fromPlanId?: string | null;
    toPlanId?: string | null;
    stripeEventId?: string;
    metadata?: SubscriptionTransactionMetadata;
  }): Promise<void> {
    try {
      await this.db.insert(schema.subscriptionTransactions).values({
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        transactionType: data.transactionType,
        amount:
          data.amount !== undefined && data.amount !== null
            ? String(data.amount)
            : undefined,
        currency: data.currency,
        fromPlanId: data.fromPlanId,
        toPlanId: data.toPlanId,
        stripeEventId: data.stripeEventId,
        metadata: data.metadata,
        createdAt: toUTC(),
      });

      this.logger.log(
        `Recorded subscription transaction '${data.transactionType}' for user ${data.userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to record subscription transaction for user ${data.userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
