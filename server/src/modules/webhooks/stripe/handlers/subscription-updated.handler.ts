import { Injectable, Inject, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { ProfilesService } from "modules/profiles/profiles.service";
import { EmailsService } from "modules/emails/emails.service";
import { SubscriptionMapperService } from "../services/subscription-mapper.service";
import { SubscriptionDbService } from "../services/subscription-db.service";
import { SUBSCRIPTION_TRANSACTION_TYPES } from "../stripe.constants";

@Injectable()
export class SubscriptionUpdatedHandler {
  private readonly logger = new Logger(SubscriptionUpdatedHandler.name);

  constructor(
    @Inject(SubscriptionMapperService)
    private readonly mapperService: SubscriptionMapperService,
    @Inject(SubscriptionDbService)
    private readonly dbService: SubscriptionDbService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(EmailsService)
    private readonly emailsService: EmailsService
  ) {}

  /**
   * Handle customer.subscription.updated webhook
   */
  async handle(event: Stripe.Event): Promise<void> {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID
      const user =
        await this.mapperService.findUserByStripeCustomerId(customerId);
      if (!user) {
        this.logger.warn(`User not found for customer ${customerId}`);
        return;
      }

      // Get Stripe price ID from subscription
      const stripePriceId = subscription.items.data[0]?.price.id;
      if (!stripePriceId) {
        this.logger.error(
          `No price ID found in subscription ${subscription.id}`
        );
        return;
      }

      // Map Stripe price ID to internal subscription plan price
      const planPrice =
        await this.mapperService.findSubscriptionPlanPriceByStripePriceId(
          stripePriceId
        );
      if (!planPrice) {
        this.logger.error(
          `Subscription plan price not found for Stripe price ID ${stripePriceId}`
        );
        return;
      }

      // Map Stripe subscription to update format
      const updateData = this.mapperService.mapStripeSubscriptionToUpdateData(
        subscription,
        planPrice
      );

      // Get existing subscription to compare plans
      const existingSub = await this.dbService.findSubscriptionByStripeId(
        subscription.id
      );

      // Update existing subscription
      await this.dbService.updateUserSubscription(subscription.id, updateData);

      // Sync max_concurrent_requests from the plan to user profile
      try {
        await this.profilesService.updateMaxConcurrentRequests(
          user.id,
          planPrice.subscriptionPlanId
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync max_concurrent_requests for user ${user.id} during subscription update: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't throw - allow the subscription update to succeed even if sync fails
      }

      // Check for upgrade/plan change
      const previousAttributes = event.data.previous_attributes as AnyType;
      if (
        previousAttributes &&
        previousAttributes.items &&
        user.email &&
        planPrice
      ) {
        try {
          const newPlan = await this.dbService.findPlanById(
            planPrice.subscriptionPlanId
          );
          let oldPlanName = "Previous Plan";
          let oldPriceValue: number | null = null;
          let oldPlanId = null;
          let oldInterval: string | null = null;

          if (existingSub) {
            const oldPlan = await this.dbService.findPlanById(
              existingSub.subscriptionPlanId
            );
            if (oldPlan) {
              oldPlanName = oldPlan.name;
              oldPlanId = oldPlan.id;
            }
            if (existingSub.priceId) {
              const oldPrice = await this.dbService.findPriceById(
                existingSub.priceId
              );
              if (oldPrice) {
                oldPriceValue = Number(oldPrice.price);
                oldInterval = oldPrice.interval;
                this.logger.log(
                  `Found old price for sub ${existingSub.id}: price=${oldPriceValue}, interval=${oldInterval}`
                );
              } else {
                this.logger.warn(
                  `Could not resolve old price for subscription ${existingSub.id} (priceId: ${existingSub.priceId})`
                );
              }
            } else {
              this.logger.warn(
                `Existing subscription ${existingSub.id} has no priceId`
              );
            }
          }

          // Only send email if the plan has actually changed
          if (
            existingSub &&
            (existingSub.subscriptionPlanId !== planPrice.subscriptionPlanId ||
              existingSub.priceId !== planPrice.id)
          ) {
            const priceValue = Number(planPrice.price) || 0;

            // Determine transaction type
            let transactionType: string =
              SUBSCRIPTION_TRANSACTION_TYPES.UPDATED;

            if (oldPriceValue === null) {
              // specific logic for unknown old price - default to UPDATED
              transactionType = SUBSCRIPTION_TRANSACTION_TYPES.UPDATED;
            } else if (priceValue > oldPriceValue) {
              transactionType = SUBSCRIPTION_TRANSACTION_TYPES.UPGRADED;
            } else if (priceValue < oldPriceValue) {
              transactionType = SUBSCRIPTION_TRANSACTION_TYPES.DOWNGRADED;
            }

            try {
              await this.dbService.recordSubscriptionTransaction({
                userId: user.id,
                subscriptionId: existingSub.id,
                transactionType,
                amount: priceValue,
                currency: subscription.currency,
                fromPlanId: oldPlanId,
                toPlanId: planPrice.subscriptionPlanId,
                stripeEventId: event.id,
                metadata: {
                  stripe_price_id: stripePriceId,
                  subscription_plan_price_id: planPrice.id,
                  price: priceValue,
                  interval: planPrice.interval,
                  from_interval: oldInterval,
                },
              });
            } catch (dbError) {
              this.logger.error(
                `Failed to record subscription transaction for user ${user.id} (sub: ${existingSub.id}): ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
                dbError instanceof Error ? dbError.stack : undefined
              );
              // continue execution to send emails
            }

            const isUpgrade =
              oldPriceValue !== null && priceValue > oldPriceValue;
            const isDowngrade =
              oldPriceValue !== null && priceValue < oldPriceValue;

            if (priceValue === 0) {
              this.logger.debug(
                `Skipping plan-change email for subscription ${subscription.id} because amount is 0`
              );
            } else if (!isUpgrade && !isDowngrade) {
              this.logger.debug(
                `Skipping plan-change email for subscription ${subscription.id} because price did not increase or decrease`
              );
            } else {
              const currency = subscription.currency?.toUpperCase() || "USD";
              const formattedAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
              }).format(priceValue);

              const emailParams = {
                to: user.email,
                userName: user.fullName || "User",
                oldPlanName,
                newPlanName: newPlan?.name || "Premium Plan",
                amount: formattedAmount,
                interval: planPrice.interval || "month",
              };

              if (isUpgrade) {
                const result =
                  await this.emailsService.sendSubscriptionUpgradeEmail(
                    emailParams
                  );
                if (result?.success) {
                  this.logger.log(
                    `Sent upgrade email to user ${user.id} for subscription ${subscription.id}`
                  );
                } else {
                  const sendError =
                    result && "error" in result ? result.error : undefined;
                  this.logger.error(
                    `SUBSCRIPTION_UPDATED_HANDLER :: handle :: ERROR :: ${sendError ?? "Failed to send upgrade email"}`
                  );
                }
              } else {
                const result =
                  await this.emailsService.sendSubscriptionDowngradeEmail(
                    emailParams
                  );
                if (result?.success) {
                  this.logger.log(
                    `Sent downgrade email to user ${user.id} for subscription ${subscription.id}`
                  );
                } else {
                  const sendError =
                    result && "error" in result ? result.error : undefined;
                  this.logger.error(
                    `SUBSCRIPTION_UPDATED_HANDLER :: handle :: ERROR :: ${sendError ?? "Failed to send downgrade email"}`
                  );
                }
              }
            }
          }
        } catch (emailError) {
          this.logger.error(
            `SUBSCRIPTION_UPDATED_HANDLER :: handle :: ERROR :: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling subscription.updated webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
