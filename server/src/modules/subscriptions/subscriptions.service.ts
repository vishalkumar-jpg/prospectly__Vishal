import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, desc, asc, or, inArray } from "drizzle-orm";
import { StripeService } from "modules/stripe/stripe.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { appConfig } from "config/app.config";
import { toUTC } from "utils/dayjs";
import {
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_STATUS,
} from "./subscriptions.constants";
import {
  SubscriptionPlansResponseDto,
  SubscriptionPlanDto,
  CurrentSubscriptionDto,
} from "./subscriptions.response";

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Get all active subscription plans with their monthly and yearly prices
   * @returns List of subscription plans with prices
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlansResponseDto> {
    const { db } = this;

    // Fetch all active subscription plans
    const plans = await db
      .select()
      .from(schema.subscriptionPlan)
      .where(
        and(
          eq(schema.subscriptionPlan.isActive, true),
          isNull(schema.subscriptionPlan.deletedAt)
        )
      )
      .orderBy(
        desc(schema.subscriptionPlan.defaultPlan),
        asc(schema.subscriptionPlan.createdAt)
      );

    // Fetch all prices for these plans
    const planIds = plans.map((plan) => plan.id);
    let prices: (typeof schema.subscriptionPlanPrice.$inferSelect)[] = [];

    if (planIds.length > 0) {
      prices = await db
        .select()
        .from(schema.subscriptionPlanPrice)
        .where(
          and(
            or(
              ...planIds.map((id) =>
                eq(schema.subscriptionPlanPrice.subscriptionPlanId, id)
              )
            ),
            isNull(schema.subscriptionPlanPrice.deletedAt)
          )
        );
    }

    // Group prices by plan ID and interval
    const pricesByPlan = new Map<
      string,
      { monthly: (typeof prices)[0] | null; yearly: (typeof prices)[0] | null }
    >();

    plans.forEach((plan) => {
      pricesByPlan.set(plan.id, { monthly: null, yearly: null });
    });

    prices.forEach((price) => {
      const planPrices = pricesByPlan.get(price.subscriptionPlanId);
      if (planPrices) {
        if (price.interval === SUBSCRIPTION_INTERVAL.MONTH) {
          planPrices.monthly = price;
        } else if (price.interval === SUBSCRIPTION_INTERVAL.YEAR) {
          planPrices.yearly = price;
        }
      }
    });

    // Transform to response format
    const plansResponse: SubscriptionPlanDto[] = plans.map((plan) => {
      const planPrices = pricesByPlan.get(plan.id) || {
        monthly: null,
        yearly: null,
      };

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPrice: planPrices.monthly
          ? {
              id: planPrices.monthly.id,
              price: planPrices.monthly.price || "0",
              stripePriceId: planPrices.monthly.stripePriceId,
            }
          : null,
        yearlyPrice: planPrices.yearly
          ? {
              id: planPrices.yearly.id,
              price: planPrices.yearly.price || "0",
              stripePriceId: planPrices.yearly.stripePriceId,
            }
          : null,
        features: (plan.feature as Record<string, unknown>) || {},
        isDefault: plan.defaultPlan || false,
      };
    });

    return {
      plans: plansResponse,
    };
  }

  /**
   * Get current active subscription for a user
   * @param userId - User ID
   * @returns Current subscription with plan details or null
   */
  async getCurrentSubscription(
    userId: string
  ): Promise<CurrentSubscriptionDto | null> {
    const { db } = this;

    // Query for active subscription with plan details using relations
    const subscription = await db.query.userSubscription.findFirst({
      where: and(
        eq(schema.userSubscription.userId, userId),
        inArray(schema.userSubscription.status, [
          SUBSCRIPTION_STATUS.ACTIVE,
          SUBSCRIPTION_STATUS.TRIALING,
        ]),
        isNull(schema.userSubscription.deletedAt)
      ),
      with: {
        subscriptionPlan: true,
      },
      orderBy: desc(schema.userSubscription.createdAt),
    });

    if (!subscription || !subscription.subscriptionPlan) {
      return null;
    }

    const plan = subscription.subscriptionPlan;

    // Fetch price details if available
    let priceDetails: { interval: string; price: string } | null = null;
    if (subscription.priceId) {
      const priceParams = await db.query.subscriptionPlanPrice.findFirst({
        where: eq(schema.subscriptionPlanPrice.id, subscription.priceId),
      });
      if (priceParams) {
        priceDetails = {
          interval: priceParams.interval || "",
          price: priceParams.price || "0",
        };
      }
    }

    return {
      id: subscription.id,
      plan: {
        id: (plan as AnyType).id,
        name: (plan as AnyType).name,
        description: (plan as AnyType).description,
        features: ((plan as AnyType).feature as Record<string, unknown>) || {},
        isDefault: (plan as AnyType).defaultPlan || false,
      },
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      priceId: subscription.priceId,
      interval: priceDetails?.interval,
      amount: priceDetails?.price,
    };
  }

  /**
   * Get plan details by ID
   * @param planId - Plan ID
   * @returns Plan details with prices or null
   */
  async getPlanById(planId: string): Promise<SubscriptionPlanDto | null> {
    const { db } = this;

    const plan = await db.query.subscriptionPlan.findFirst({
      where: and(
        eq(schema.subscriptionPlan.id, planId),
        eq(schema.subscriptionPlan.isActive, true),
        isNull(schema.subscriptionPlan.deletedAt)
      ),
      with: {
        prices: {
          where: isNull(schema.subscriptionPlanPrice.deletedAt),
        },
      },
    });

    if (!plan) {
      return null;
    }

    const monthlyPrice = plan.prices.find(
      (p) => p.interval === SUBSCRIPTION_INTERVAL.MONTH
    );
    const yearlyPrice = plan.prices.find(
      (p) => p.interval === SUBSCRIPTION_INTERVAL.YEAR
    );

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPrice: monthlyPrice
        ? {
            id: monthlyPrice.id,
            price: monthlyPrice.price || "0",
            stripePriceId: monthlyPrice.stripePriceId,
          }
        : null,
      yearlyPrice: yearlyPrice
        ? {
            id: yearlyPrice.id,
            price: yearlyPrice.price || "0",
            stripePriceId: yearlyPrice.stripePriceId,
          }
        : null,
      features: (plan.feature as Record<string, unknown>) || {},
      isDefault: plan.defaultPlan || false,
    };
  }

  /**
   * Validate if user has access to a required feature
   * @param userId - User ID
   * @param requiredFeature - Feature key to check
   * @returns true if user has access, false otherwise
   */
  async validateSubscriptionAccess(
    userId: string,
    requiredFeature: string
  ): Promise<boolean> {
    const { db } = this;

    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      // User has no subscription, check if default plan has the feature
      const defaultPlan = await db.query.subscriptionPlan.findFirst({
        where: and(
          eq(schema.subscriptionPlan.defaultPlan, true),
          eq(schema.subscriptionPlan.isActive, true),
          isNull(schema.subscriptionPlan.deletedAt)
        ),
      });

      if (!defaultPlan) {
        return false;
      }

      const features = defaultPlan.feature as Record<string, unknown>;
      return features[requiredFeature] === true;
    }

    // Check if user's current plan has the feature
    const plan = await db.query.subscriptionPlan.findFirst({
      where: eq(schema.subscriptionPlan.id, subscription.plan.id),
    });

    if (!plan) {
      return false;
    }

    const features = plan.feature as Record<string, unknown>;
    return features[requiredFeature] === true;
  }

  /**
   * Create a Stripe Customer Portal Session for subscription upgrade with deep linking
   * @param userId - User ID
   * @param planId - Subscription plan ID to upgrade to
   * @param interval - Billing interval ('month' or 'year')
   * @returns Customer Portal session URL
   */
  async createUpgradePortalSession(
    userId: string,
    planId: string,
    interval: string
  ): Promise<string> {
    // Get or create Stripe customer
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      // Create Stripe customer if it doesn't exist
      const customer = await this.stripeService.createCustomer(
        profile.email || "",
        profile.fullName || undefined,
        { userId }
      );
      customerId = customer.id;

      // Update profile with Stripe customer ID
      await this.profilesService.updateProfile(userId, {
        stripeCustomerId: customerId,
      } as AnyType);
    }

    // Validate interval
    if (
      interval !== SUBSCRIPTION_INTERVAL.MONTH &&
      interval !== SUBSCRIPTION_INTERVAL.YEAR
    ) {
      throw new BadRequestException(
        "Invalid interval. Must be 'month' or 'year'"
      );
    }

    // Get the target plan and validate it exists (only select name for error message)
    const targetPlan = await this.db
      .select({
        id: schema.subscriptionPlan.id,
        name: schema.subscriptionPlan.name,
      })
      .from(schema.subscriptionPlan)
      .where(
        and(
          eq(schema.subscriptionPlan.id, planId),
          eq(schema.subscriptionPlan.isActive, true),
          isNull(schema.subscriptionPlan.deletedAt)
        )
      )
      .limit(1);

    if (!targetPlan || targetPlan.length === 0) {
      throw new NotFoundException("Subscription plan not found");
    }

    const plan = targetPlan[0];

    // Get the target price for the selected interval (only select stripePriceId)
    const targetPrice = await this.db
      .select({
        stripePriceId: schema.subscriptionPlanPrice.stripePriceId,
      })
      .from(schema.subscriptionPlanPrice)
      .where(
        and(
          eq(schema.subscriptionPlanPrice.subscriptionPlanId, planId),
          eq(schema.subscriptionPlanPrice.interval, interval),
          isNull(schema.subscriptionPlanPrice.deletedAt)
        )
      )
      .limit(1);

    if (!targetPrice || targetPrice.length === 0) {
      throw new NotFoundException(
        `Price not found for plan ${plan.name} with ${interval}ly billing`
      );
    }

    const price = targetPrice[0];

    // Get user's current subscription (only select stripeSubscriptionId)
    const existingSubscription = await this.db
      .select({
        stripeSubscriptionId: schema.userSubscription.stripeSubscriptionId,
      })
      .from(schema.userSubscription)
      .where(
        and(
          eq(schema.userSubscription.userId, userId),
          inArray(schema.userSubscription.status, [
            SUBSCRIPTION_STATUS.ACTIVE,
            SUBSCRIPTION_STATUS.TRIALING,
          ]),
          isNull(schema.userSubscription.deletedAt)
        )
      )
      .orderBy(desc(schema.userSubscription.createdAt))
      .limit(1);

    if (
      !existingSubscription ||
      existingSubscription.length === 0 ||
      !existingSubscription[0].stripeSubscriptionId
    ) {
      throw new BadRequestException(
        "No active subscription found. Please contact support."
      );
    }

    const subscription = existingSubscription[0];

    // Get the Stripe subscription to retrieve subscription item ID
    const stripeSubscription = await this.stripeService.getSubscription(
      subscription.stripeSubscriptionId
    );

    // Get the first subscription item ID (most subscriptions have one item)
    const subscriptionItemId = stripeSubscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error("No subscription items found in current subscription");
    }

    // Construct return URL
    const baseUrl = appConfig.frontendUrl;
    const returnUrl = `${baseUrl}/profile/subscriptions?upgrade=success`;

    // Create Customer Portal session with deep linking to upgrade flow
    const session = await this.stripeService.createCustomerPortalSession(
      customerId,
      returnUrl,
      subscription.stripeSubscriptionId,
      subscriptionItemId,
      price.stripePriceId
    );

    if (!session.url) {
      throw new Error("Failed to create portal session URL");
    }

    return session.url;
  }

  /**
   * Manually sync subscription status from Stripe to DB
   * Useful when webhooks are delayed or failed
   * @param userId - User ID
   */
  async syncSubscriptionStatus(userId: string): Promise<void> {
    const { db } = this;

    // Get current local subscription
    const localSub = await db.query.userSubscription.findFirst({
      where: and(
        eq(schema.userSubscription.userId, userId),
        inArray(schema.userSubscription.status, [
          SUBSCRIPTION_STATUS.ACTIVE,
          SUBSCRIPTION_STATUS.TRIALING,
        ]),
        isNull(schema.userSubscription.deletedAt)
      ),
    });

    if (!localSub || !localSub.stripeSubscriptionId) {
      return;
    }

    try {
      // Fetch latest from Stripe
      const stripeSub: AnyType = await this.stripeService.getSubscription(
        localSub.stripeSubscriptionId
      );

      // Check if price/plan has changed
      const currentPriceId = stripeSub.items.data[0]?.price.id;
      if (!currentPriceId) return;

      // Find identifying local price
      const localPrice = await db.query.subscriptionPlanPrice.findFirst({
        where: eq(schema.subscriptionPlanPrice.stripePriceId, currentPriceId),
      });

      if (!localPrice) return;

      // If mismatch, update DB
      // Safely access properties handling both snake_case/camelCase and checking items fallback
      const getProp = (obj: AnyType, snake: string, camel: string) =>
        obj?.[snake] ?? obj?.[camel];
      const getFirstItem = (sub: AnyType) =>
        sub?.items?.data?.[0] ?? sub?.items?.[0];

      let currentPeriodStartTs = getProp(
        stripeSub,
        "current_period_start",
        "currentPeriodStart"
      );
      let currentPeriodEndTs = getProp(
        stripeSub,
        "current_period_end",
        "currentPeriodEnd"
      );

      // Fallback to first item if root timestamps are missing
      if (
        typeof currentPeriodStartTs !== "number" ||
        typeof currentPeriodEndTs !== "number"
      ) {
        const item = getFirstItem(stripeSub);
        if (item) {
          if (typeof currentPeriodStartTs !== "number") {
            currentPeriodStartTs = getProp(
              item,
              "current_period_start",
              "currentPeriodStart"
            );
          }
          if (typeof currentPeriodEndTs !== "number") {
            currentPeriodEndTs = getProp(
              item,
              "current_period_end",
              "currentPeriodEnd"
            );
          }
        }
      }

      const cancelAtPeriodEndVal = getProp(
        stripeSub,
        "cancel_at_period_end",
        "cancelAtPeriodEnd"
      );
      const trialEndTs = getProp(stripeSub, "trial_end", "trialEnd");
      const canceledAtTs = getProp(stripeSub, "canceled_at", "canceledAt");

      // Ensure we have valid timestamps
      if (
        typeof currentPeriodStartTs !== "number" ||
        typeof currentPeriodEndTs !== "number"
      ) {
        this.logger.error(
          `Invalid timestamps from Stripe for sub ${localSub.stripeSubscriptionId}: start=${currentPeriodStartTs}, end=${currentPeriodEndTs}`
        );
        return;
      }

      const currentPeriodEndDate = toUTC(currentPeriodEndTs * 1000);

      if (
        localSub.priceId !== localPrice.id ||
        localSub.status !== stripeSub.status ||
        localSub.currentPeriodEnd?.getTime() !== currentPeriodEndDate.getTime()
      ) {
        await db
          .update(schema.userSubscription)
          .set({
            priceId: localPrice.id,
            subscriptionPlanId: localPrice.subscriptionPlanId,
            status: stripeSub.status,
            currentPeriodStart: toUTC(currentPeriodStartTs * 1000),
            currentPeriodEnd: currentPeriodEndDate,
            cancelAtPeriodEnd: !!cancelAtPeriodEndVal,
            trialEnd: trialEndTs ? toUTC(trialEndTs * 1000) : null,
            canceledAt: canceledAtTs ? toUTC(canceledAtTs * 1000) : null,
            updatedAt: toUTC(),
          })
          .where(eq(schema.userSubscription.id, localSub.id));

        this.logger.log(
          `Synced subscription ${localSub.id} with Stripe (Plan: ${localPrice.subscriptionPlanId})`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync subscription for user ${userId}: ${error}`
      );
    }
  }

  /**
   * Create a Stripe Customer Portal Session for subscription management
   * @param userId - User ID
   * @returns Portal session URL
   */
  async createCustomerPortalSession(userId: string): Promise<string> {
    // Get user profile
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    // Check if user has Stripe customer ID
    if (!profile.stripeCustomerId) {
      throw new BadRequestException(
        "No Stripe customer found. Please upgrade to a paid plan first."
      );
    }

    // Verify user has an active subscription
    const subscription = await this.db.query.userSubscription.findFirst({
      where: and(
        eq(schema.userSubscription.userId, userId),
        inArray(schema.userSubscription.status, [
          SUBSCRIPTION_STATUS.ACTIVE,
          SUBSCRIPTION_STATUS.TRIALING,
        ]),
        isNull(schema.userSubscription.deletedAt)
      ),
    });

    if (!subscription) {
      throw new BadRequestException(
        "No active subscription found. Please upgrade to a paid plan first."
      );
    }

    // Construct return URL
    const baseUrl = appConfig.frontendUrl;
    const returnUrl = `${baseUrl}/profile/subscriptions`;

    // Create portal session
    const session = await this.stripeService.createCustomerPortalSession(
      profile.stripeCustomerId,
      returnUrl
    );

    if (!session.url) {
      throw new Error("Failed to create portal session URL");
    }

    return session.url;
  }
}
