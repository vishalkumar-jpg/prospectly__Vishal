import { Injectable, Inject, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { ProfilesService } from "modules/profiles/profiles.service";
import { SubscriptionDbService } from "../services/subscription-db.service";
import { SubscriptionMapperService } from "../services/subscription-mapper.service";

@Injectable()
export class InvoiceFailedHandler {
  private readonly logger = new Logger(InvoiceFailedHandler.name);

  constructor(
    @Inject(SubscriptionDbService)
    private readonly dbService: SubscriptionDbService,
    @Inject(SubscriptionMapperService)
    private readonly mapperService: SubscriptionMapperService,
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Handle invoice.payment_failed webhook
   * Updates subscription status to "past_due" if it was missed during subscription.updated webhook
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

      // Update subscription status to "past_due"
      await this.dbService.updateUserSubscription(subscriptionId, {
        status: "past_due",
      });

      // Update user's max_concurrent_requests to free plan value
      try {
        const freePlan = await this.mapperService.findDefaultFreePlan();
        if (!freePlan) {
          this.logger.warn(
            `Free plan not found, skipping max_concurrent_requests update for user ${existingSubscription.userId}`
          );
        } else {
          await this.profilesService.updateMaxConcurrentRequests(
            existingSubscription.userId,
            freePlan.id
          );
          this.logger.log(
            `Updated max_concurrent_requests to free plan value for user ${existingSubscription.userId} from invoice.payment_failed webhook`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to update max_concurrent_requests for user ${existingSubscription.userId} during invoice payment failure: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined
        );
        // Don't throw - allow the subscription update to succeed even if sync fails
      }

      this.logger.log(
        `Updated subscription ${subscriptionId} status to "past_due" from invoice.payment_failed webhook`
      );
    } catch (error) {
      this.logger.error(
        `Error handling invoice.payment_failed webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
