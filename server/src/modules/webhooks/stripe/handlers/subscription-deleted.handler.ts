import { Injectable, Inject, Logger } from "@nestjs/common";
import { utcDayjs } from "utils/dayjs";
import Stripe from "stripe";
import { StripeService } from "modules/stripe/stripe.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { EmailsService } from "modules/emails/emails.service";
import { SubscriptionMapperService } from "../services/subscription-mapper.service";
import { SubscriptionDbService } from "../services/subscription-db.service";
import { SUBSCRIPTION_TRANSACTION_TYPES } from "../stripe.constants";

@Injectable()
export class SubscriptionDeletedHandler {
  private readonly logger = new Logger(SubscriptionDeletedHandler.name);

  constructor(
    @Inject(SubscriptionMapperService)
    private readonly mapperService: SubscriptionMapperService,
    @Inject(SubscriptionDbService)
    private readonly dbService: SubscriptionDbService,
    @Inject(StripeService)
    private readonly stripeService: StripeService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(EmailsService)
    private readonly emailsService: EmailsService
  ) {}

  /**
   * Handle customer.subscription.deleted webhook
   */
  async handle(event: Stripe.Event): Promise<void> {
    try {
      this.logger.log(`Handling subscription.deleted webhook: ${event.id}`);

      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID
      const user =
        await this.mapperService.findUserByStripeCustomerId(customerId);

      if (!user) {
        this.logger.warn(`User not found for customer ${customerId}`);
        return;
      }

      // Find the subscription record by Stripe subscription ID
      const existingSubscription =
        await this.dbService.findSubscriptionByStripeId(subscription.id);

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${subscription.id} not found in database, skipping`
        );
        return;
      }

      // Check if user has any other active subscriptions
      const activeSubscriptions =
        await this.dbService.findActiveSubscriptionsByUserId(user.id);

      // Filter out the current subscription being deleted
      const otherActiveSubscriptions = activeSubscriptions.filter(
        (sub) => sub.stripeSubscriptionId !== subscription.id
      );

      // Only convert to free plan if user has NO other active subscriptions
      if (otherActiveSubscriptions.length > 0) {
        this.logger.log(
          `User ${user.id} has ${otherActiveSubscriptions.length} other active subscription(s), skipping free plan assignment`
        );
        return;
      }

      // Find default free plan
      const freePlan = await this.mapperService.findDefaultFreePlan();
      const freePrice = await this.mapperService.findFreePlanPrice(freePlan.id);

      // Create new Stripe subscription for free plan
      const newStripeSubscription = await this.stripeService.createSubscription(
        customerId,
        freePrice.stripePriceId,
        {
          userId: user.id,
          planId: freePlan.id,
          planName: freePlan.name,
          isDefaultPlan: "true",
        }
      );

      // Convert the existing subscription record to free plan
      await this.dbService.convertSubscriptionToFreePlan(
        subscription.id,
        newStripeSubscription.id,
        freePlan.id,
        freePrice.id
      );

      // Sync max_concurrent_requests from the free plan to user profile
      try {
        await this.profilesService.updateMaxConcurrentRequests(
          user.id,
          freePlan.id
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync max_concurrent_requests for user ${user.id} during subscription cancellation: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't throw - allow the subscription cancellation to succeed even if sync fails
      }

      this.logger.log(
        `Converted subscription ${subscription.id} to free plan for user ${user.id}. New Stripe subscription: ${newStripeSubscription.id}`
      );

      // Send cancellation email
      try {
        if (!user.email || typeof user.email !== "string") {
          this.logger.warn(
            `User ${user.id} has no valid email address, skipping cancellation email`
          );
          return;
        }

        const oldPlan = await this.dbService.findPlanById(
          existingSubscription.subscriptionPlanId
        );

        // Record cancellation transaction
        await this.dbService.recordSubscriptionTransaction({
          userId: user.id,
          subscriptionId: existingSubscription.id,
          transactionType: SUBSCRIPTION_TRANSACTION_TYPES.CANCELED,
          amount: "0",
          currency: subscription.currency,
          fromPlanId: existingSubscription.subscriptionPlanId,
          toPlanId: freePlan.id,
          stripeEventId: event.id,
          metadata: {
            stripe_price_id: existingSubscription.priceId || undefined,
            subscription_plan_price_id:
              existingSubscription.priceId || undefined,
            price: 0,
            interval: undefined,
          },
        });

        await this.emailsService.sendSubscriptionCancellationEmail({
          to: user.email,
          userName: user.fullName || "User",
          planName: oldPlan?.name || "Premium Plan",
          effectiveDate: utcDayjs().format("DD-MM-YYYY"),
        });
      } catch (emailError) {
        this.logger.error(
          `Failed to send subscription cancellation email for user ${user.id}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
        );
        // Don't throw - allow the process to finish
      }
    } catch (error) {
      this.logger.error(
        `Error handling subscription.deleted webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
