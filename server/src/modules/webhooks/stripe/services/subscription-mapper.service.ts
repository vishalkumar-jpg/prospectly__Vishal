import { Injectable, Inject, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";

@Injectable()
export class SubscriptionMapperService {
  private readonly logger = new Logger(SubscriptionMapperService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Find user profile by Stripe customer ID
   */
  async findUserByStripeCustomerId(
    customerId: string
  ): Promise<schema.User | null> {
    const profile = await this.db.query.users.findFirst({
      where: eq(schema.users.stripeCustomerId, customerId),
    });

    return profile || null;
  }

  /**
   * Find subscription plan price by Stripe price ID
   */
  async findSubscriptionPlanPriceByStripePriceId(
    stripePriceId: string
  ): Promise<schema.SubscriptionPlanPrice | null> {
    const price = await this.db.query.subscriptionPlanPrice.findFirst({
      where: and(
        eq(schema.subscriptionPlanPrice.stripePriceId, stripePriceId),
        isNull(schema.subscriptionPlanPrice.deletedAt)
      ),
    });

    return price || null;
  }

  /**
   * Convert Unix timestamp to Date
   */
  convertUnixTimestampToDate(timestamp: number): Date {
    return toUTC(timestamp * 1000);
  }

  /**
   * Map Stripe subscription to internal subscription data structure
   */
  mapStripeSubscriptionToInternal(
    subscription: AnyType,
    userId: string,
    planPrice: schema.SubscriptionPlanPrice
  ): typeof schema.userSubscription.$inferInsert {
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      this.logger.error("No subscription items found");
      return;
    }

    this.logger.log(
      `Mapping Stripe subscription ${subscription.id} to internal. Raw timestamps:  item_start=${subscriptionItem?.current_period_start}, item_end=${subscriptionItem?.current_period_end}, trial_end=${subscription.trial_end}`
    );

    // Defensive checks for timestamps
    const start =
      subscriptionItem?.current_period_start ||
      Math.floor(toUTC().valueOf() / 1000);
    const end =
      subscriptionItem?.current_period_end || start + 30 * 24 * 60 * 60;

    return {
      userId,
      subscriptionPlanId: planPrice.subscriptionPlanId,
      stripeSubscriptionId: subscription.id,
      priceId: planPrice.id,
      status: subscription.status,
      currentPeriodStart: this.convertUnixTimestampToDate(start),
      currentPeriodEnd: this.convertUnixTimestampToDate(end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at
        ? this.convertUnixTimestampToDate(subscription.canceled_at)
        : null,
      trialEnd: subscription.trial_end
        ? this.convertUnixTimestampToDate(subscription.trial_end)
        : null,
    };
  }

  /**
   * Map Stripe subscription to update data structure
   */
  mapStripeSubscriptionToUpdateData(
    subscription: AnyType,
    planPrice: schema.SubscriptionPlanPrice
  ): Partial<typeof schema.userSubscription.$inferInsert> {
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      this.logger.error("No subscription items found");
      return;
    }

    const start =
      subscriptionItem.current_period_start ||
      Math.floor(toUTC().valueOf() / 1000);
    const end =
      subscriptionItem.current_period_end || start + 30 * 24 * 60 * 60;

    const updateData: Partial<typeof schema.userSubscription.$inferInsert> = {
      subscriptionPlanId: planPrice.subscriptionPlanId,
      priceId: planPrice.id,
      status: subscription.status,
      currentPeriodStart: this.convertUnixTimestampToDate(start),
      currentPeriodEnd: this.convertUnixTimestampToDate(end),
    };
    return updateData;
  }

  /**
   * Find the default free plan
   */
  async findDefaultFreePlan(): Promise<schema.SubscriptionPlan | null> {
    const freePlan = await this.db.query.subscriptionPlan.findFirst({
      where: and(
        eq(schema.subscriptionPlan.defaultPlan, true),
        eq(schema.subscriptionPlan.isActive, true),
        isNull(schema.subscriptionPlan.deletedAt)
      ),
    });

    return freePlan || null;
  }

  /**
   * Find a price for the free plan (prefer yearly interval, fallback to any available)
   */
  async findFreePlanPrice(
    freePlanId: string
  ): Promise<schema.SubscriptionPlanPrice | null> {
    // First try to get yearly price
    const yearlyPrice = await this.db.query.subscriptionPlanPrice.findFirst({
      where: and(
        eq(schema.subscriptionPlanPrice.subscriptionPlanId, freePlanId),
        eq(schema.subscriptionPlanPrice.interval, "year"),
        isNull(schema.subscriptionPlanPrice.deletedAt)
      ),
    });

    if (yearlyPrice) {
      return yearlyPrice;
    }

    // Fallback to any available price
    const anyPrice = await this.db.query.subscriptionPlanPrice.findFirst({
      where: and(
        eq(schema.subscriptionPlanPrice.subscriptionPlanId, freePlanId),
        isNull(schema.subscriptionPlanPrice.deletedAt)
      ),
    });

    return anyPrice || null;
  }
}
