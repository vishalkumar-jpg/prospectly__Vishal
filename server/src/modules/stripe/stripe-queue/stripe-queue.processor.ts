import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { ProfilesService } from "modules/profiles/profiles.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC, utcDayjs } from "utils/dayjs";
import { CreateCustomerJobData } from "./stripe-queue.types";
import { STRIPE_QUEUE_NAME, STRIPE_JOB_TYPES } from "./stripe-queue.constants";
import { StripeService } from "../stripe.service";
import { SubscriptionDbService } from "../../webhooks/stripe/services/subscription-db.service";

@Processor(STRIPE_QUEUE_NAME)
export class StripeQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(StripeQueueProcessor.name);

  constructor(
    @Inject(StripeService) private readonly stripeService: StripeService,
    @Inject(ProfilesService) private readonly profilesService: ProfilesService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly subscriptionDbService: SubscriptionDbService
  ) {
    super();
  }

  async process(job: Job<CreateCustomerJobData>): Promise<void> {
    const { data, id, name } = job;
    const { userId, email, fullName } = data;

    try {
      if (name === STRIPE_JOB_TYPES.CREATE_CUSTOMER) {
        await this.processCreateCustomer(userId, email, fullName);
      } else {
        throw new Error(`Unknown job type: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Stripe job ${id} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  private async processCreateCustomer(
    userId: string,
    email: string,
    fullName?: string
  ): Promise<void> {
    // Check if profile exists
    const profile = await this.profilesService.getProfileById(userId);

    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    // Check if customer already exists
    if (profile.stripeCustomerId) {
      return;
    }

    // Create customer on Stripe
    const customer = await this.stripeService.createCustomer(email, fullName, {
      userId,
    });

    // Update profile with Stripe customer ID
    await this.profilesService.updateProfile(userId, {
      stripeCustomerId: customer.id,
    } as AnyType);

    this.logger.log(
      `Stripe customer created successfully for user ${userId}: ${customer.id}`
    );

    // Assign free plan to the newly created customer
    try {
      await this.assignFreePlanToUser(userId, customer.id);
    } catch (error) {
      this.logger.error(
        `Failed to assign free plan to user ${userId}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private async assignFreePlanToUser(
    userId: string,
    stripeCustomerId: string
  ): Promise<void> {
    // Query for the default plan (free plan)
    const freePlan = await this.db.query.subscriptionPlan.findFirst({
      where: and(
        eq(schema.subscriptionPlan.defaultPlan, true),
        eq(schema.subscriptionPlan.isActive, true),
        isNull(schema.subscriptionPlan.deletedAt)
      ),
    });

    if (!freePlan) {
      throw new Error("Default plan not found");
    }

    // Query for a price ID for the free plan (prefer yearly if available, otherwise any available price)
    // First try to get yearly price
    const selectedPrice = await this.db.query.subscriptionPlanPrice.findFirst({
      where: and(
        eq(schema.subscriptionPlanPrice.subscriptionPlanId, freePlan.id),
        eq(schema.subscriptionPlanPrice.interval, "year"),
        isNull(schema.subscriptionPlanPrice.deletedAt)
      ),
    });

    if (!selectedPrice) {
      throw new Error(`No price found for default plan ${freePlan.id}`);
    }

    // Create Stripe subscription with metadata
    const subscription = await this.stripeService.createSubscription(
      stripeCustomerId,
      selectedPrice.stripePriceId,
      {
        userId,
        planId: freePlan.id,
        planName: freePlan.name,
        isDefaultPlan: "true",
      }
    );

    // Start date: today
    // End date: one year from today
    const currentPeriodStart = toUTC();
    const currentPeriodEnd = utcDayjs().add(1, "year").toDate();

    // Insert user subscription record via service to ensure transaction logging
    await this.subscriptionDbService.createUserSubscription({
      userId,
      subscriptionPlanId: freePlan.id,
      priceId: selectedPrice.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false, // Free plan is not set to cancel
      canceledAt: null, // New subscription, not canceled
    });

    // Sync max_concurrent_requests from the free plan to user profile
    try {
      await this.profilesService.updateMaxConcurrentRequests(
        userId,
        freePlan.id
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync max_concurrent_requests for user ${userId} during free plan assignment: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      // Don't throw - allow the subscription creation to succeed even if sync fails
    }

    this.logger.log(
      `Free plan assigned successfully to user ${userId}. Stripe subscription ID: ${subscription.id}`
    );
  }
}
