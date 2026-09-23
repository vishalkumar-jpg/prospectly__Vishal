import { Injectable, Inject, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { ProfilesService } from "modules/profiles/profiles.service";
import { EmailsService } from "modules/emails/emails.service";
import { utcDayjs } from "utils/dayjs";
import { SubscriptionDbService } from "../services/subscription-db.service";
import { SUBSCRIPTION_TRANSACTION_TYPES } from "../stripe.constants";

@Injectable()
export class InvoicePaidHandler {
  private readonly logger = new Logger(InvoicePaidHandler.name);

  constructor(
    @Inject(SubscriptionDbService)
    private readonly dbService: SubscriptionDbService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(EmailsService)
    private readonly emailsService: EmailsService
  ) {}

  /**
   * Handle invoice.paid webhook
   * Updates subscription status to "active" if it was missed during subscription.updated webhook
   */
  async handle(event: Stripe.Event): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;

      const subscriptionId = invoice.parent.subscription_details
        .subscription as string;

      // Find subscription in database
      const existingSubscription =
        await this.dbService.findSubscriptionByStripeId(subscriptionId);

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database for invoice ${invoice.id}`
        );
        return;
      }

      // Update subscription status to "active"
      await this.dbService.updateUserSubscription(subscriptionId, {
        status: "active",
      });

      // Update user's max_concurrent_requests to subscription plan value
      try {
        await this.profilesService.updateMaxConcurrentRequests(
          existingSubscription.userId,
          existingSubscription.subscriptionPlanId
        );
        this.logger.log(
          `Updated max_concurrent_requests to subscription plan value for user ${existingSubscription.userId} from invoice.paid webhook`
        );
      } catch (error) {
        this.logger.error(
          `Failed to update max_concurrent_requests for user ${existingSubscription.userId} during invoice payment success: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't throw - allow the subscription update to succeed even if sync fails
      }

      this.logger.log(
        `Updated subscription ${subscriptionId} status to "active" from invoice.paid webhook`
      );

      // Send purchase email for new subscriptions or plan updates
      if (
        invoice.billing_reason === "subscription_create" ||
        invoice.billing_reason === "subscription_update"
      ) {
        // Skip email if amount is 0
        if (invoice.total === 0) {
          this.logger.debug(
            `Skipping purchase email for subscription ${subscriptionId} because amount is 0`
          );
        } else {
          try {
            const user = await this.profilesService.getProfileById(
              existingSubscription.userId
            );
            const plan = await this.dbService.findPlanById(
              existingSubscription.subscriptionPlanId
            );

            // Try to find the price to get the interval
            const price = await this.dbService.findPriceById(
              existingSubscription.priceId || ""
            );
            const interval = price?.interval || "month";
            const amountValue = invoice.total / 100; // Stripe amounts are in cents

            if (user && plan) {
              const currency = invoice.currency.toUpperCase();
              const tempFormatter = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
              });
              const fractionDigits =
                tempFormatter.resolvedOptions().maximumFractionDigits;

              const formattedAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
              }).format(amountValue);

              // Check if this is an upgrade from a previous plan
              const allSubs = await this.dbService.findAllSubscriptionsByUserId(
                user.id
              );

              // Identify the immediate previous subscription record for that user
              const previousSub = allSubs
                .filter((s) => s.id !== existingSubscription.id)
                .sort(
                  (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
                )[0];

              const isUpgrade =
                previousSub &&
                previousSub.subscriptionPlanId !==
                  existingSubscription.subscriptionPlanId;

              const transactionType = isUpgrade
                ? SUBSCRIPTION_TRANSACTION_TYPES.UPGRADED
                : SUBSCRIPTION_TRANSACTION_TYPES.CREATED;
              const fromPlanId = isUpgrade
                ? previousSub.subscriptionPlanId
                : null;

              await this.dbService.recordSubscriptionTransaction({
                userId: existingSubscription.userId,
                subscriptionId: existingSubscription.id,
                transactionType,
                amount: amountValue,
                currency: invoice.currency,
                fromPlanId,
                toPlanId: existingSubscription.subscriptionPlanId,
                stripeEventId: event.id,
                metadata: {
                  stripe_price_id: existingSubscription.priceId || undefined,
                  subscription_plan_price_id:
                    existingSubscription.priceId || undefined,
                  price: amountValue,
                  interval,
                },
              });

              if (isUpgrade) {
                let oldPlanName = "Previous Plan";
                if (previousSub) {
                  const oldPlan = await this.dbService.findPlanById(
                    previousSub.subscriptionPlanId
                  );
                  if (oldPlan) oldPlanName = oldPlan.name;
                }

                await this.emailsService.sendSubscriptionUpgradeEmail({
                  to: user.email || "",
                  userName: user.fullName || "User",
                  oldPlanName,
                  newPlanName: plan.name,
                  amount: formattedAmount,
                  interval,
                });
                this.logger.log(
                  `Sent upgrade (from existing user) email to user ${user.id} for subscription ${subscriptionId}`
                );
              } else {
                await this.emailsService.sendSubscriptionPurchaseEmail({
                  to: user.email || "",
                  userName: user.fullName || "User",
                  planName: plan.name,
                  amount: formattedAmount,
                  interval,
                });
                this.logger.log(
                  `Sent purchase email to user ${user.id} for subscription ${subscriptionId}`
                );
              }
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send subscription purchase email for user ${existingSubscription.userId}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
            );
          }
        }
      }
      // Send renewal email for recurring billing
      if (invoice.billing_reason === "subscription_cycle") {
        // Skip email if amount is 0
        if (invoice.total === 0) {
          this.logger.debug(
            `Skipping renewal email for subscription ${subscriptionId} because amount is 0`
          );
        } else {
          try {
            const user = await this.profilesService.getProfileById(
              existingSubscription.userId
            );
            const plan = await this.dbService.findPlanById(
              existingSubscription.subscriptionPlanId
            );

            // Try to find the price to get the interval
            const price = await this.dbService.findPriceById(
              existingSubscription.priceId || ""
            );
            const interval = price?.interval || "month";
            const amountValue = invoice.total / 100;

            // Record renewal transaction
            await this.dbService.recordSubscriptionTransaction({
              userId: existingSubscription.userId,
              subscriptionId: existingSubscription.id,
              transactionType: SUBSCRIPTION_TRANSACTION_TYPES.RENEWED,
              amount: amountValue,
              currency: invoice.currency,
              toPlanId: existingSubscription.subscriptionPlanId,
              stripeEventId: event.id,
              metadata: {
                stripe_price_id: existingSubscription.priceId || undefined,
                subscription_plan_price_id:
                  existingSubscription.priceId || undefined,
                price: amountValue,
                interval,
              },
            });

            if (user && plan) {
              const currency = invoice.currency.toUpperCase();
              const tempFormatter = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
              });
              const fractionDigits =
                tempFormatter.resolvedOptions().maximumFractionDigits;

              const formattedAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
              }).format(amountValue);

              // Next billing date is the end of the period covered by this invoice
              const nextBillingDateUnix = invoice.lines.data[0]?.period?.end;
              const nextBillingDate = nextBillingDateUnix
                ? utcDayjs(nextBillingDateUnix * 1000).format("DD-MM-YYYY")
                : existingSubscription.currentPeriodEnd
                  ? utcDayjs(existingSubscription.currentPeriodEnd).format(
                      "DD-MM-YYYY"
                    )
                  : "next billing cycle";

              await this.emailsService.sendSubscriptionRenewalEmail({
                to: user.email || "",
                userName: user.fullName || "User",
                planName: plan.name,
                amount: formattedAmount,
                interval,
                nextBillingDate,
              });
              this.logger.log(
                `Sent renewal email to user ${user.id} for subscription ${subscriptionId}`
              );
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send subscription renewal email for user ${existingSubscription.userId}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling invoice.paid webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
