import { Injectable, Logger, Inject } from "@nestjs/common";
import Stripe from "stripe";
import { StripeService } from "modules/stripe/stripe.service";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { V2ThinEvent } from "modules/stripe/stripe-v2.types";
import { SubscriptionUpdatedHandler } from "./handlers/subscription-updated.handler";
import { SubscriptionDeletedHandler } from "./handlers/subscription-deleted.handler";
import { InvoicePaidHandler } from "./handlers/invoice-paid.handler";
import { InvoiceFailedHandler } from "./handlers/invoice-failed.handler";
import { PayoutAccountUpdatedHandler } from "./handlers/payout-account-updated.handler";
import { OutboundPaymentStatusHandler } from "./handlers/outbound-payment-status.handler";
import { ChargeRefundedHandler } from "./handlers/charge-refunded.handler";
import {
  V2_ACCOUNT_EVENT_TYPES,
  V2_OUTBOUND_PAYMENT_EVENT_TYPES,
} from "./stripe.constants";

@Injectable()
export class StripeWebhooksService {
  private readonly logger = new Logger(StripeWebhooksService.name);

  constructor(
    @Inject(StripeService) private readonly stripeService: StripeService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService,
    @Inject(SubscriptionUpdatedHandler)
    private readonly subscriptionUpdatedHandler: SubscriptionUpdatedHandler,
    @Inject(SubscriptionDeletedHandler)
    private readonly subscriptionDeletedHandler: SubscriptionDeletedHandler,
    @Inject(InvoicePaidHandler)
    private readonly invoicePaidHandler: InvoicePaidHandler,
    @Inject(InvoiceFailedHandler)
    private readonly invoiceFailedHandler: InvoiceFailedHandler,
    @Inject(PayoutAccountUpdatedHandler)
    private readonly payoutAccountUpdatedHandler: PayoutAccountUpdatedHandler,
    @Inject(OutboundPaymentStatusHandler)
    private readonly outboundPaymentStatusHandler: OutboundPaymentStatusHandler,
    @Inject(ChargeRefundedHandler)
    private readonly chargeRefundedHandler: ChargeRefundedHandler
  ) {}

  /**
   * Main entry point for handling v1 Stripe webhooks (charges, subscriptions).
   */
  async handleStripeWebhook(payload: Buffer, signature: string) {
    const event = this.stripeService.constructWebhookEvent(payload, signature);
    await this.routeEvent(event);
  }

  /**
   * Entry point for v2 Global Payouts "thin event" webhooks (recipient account
   * capability changes and OutboundPayment status updates).
   */
  async handleStripeV2Webhook(payload: Buffer, signature: string) {
    const event = this.stripePayoutsService.verifyV2WebhookEvent(
      payload,
      signature
    );
    await this.routeV2Event(event);
  }

  private async routeEvent(event: Stripe.Event) {
    switch (event.type) {
      case "customer.subscription.updated":
        await this.subscriptionUpdatedHandler.handle(event);
        break;
      case "customer.subscription.deleted":
        await this.subscriptionDeletedHandler.handle(event);
        break;
      case "invoice.paid":
        await this.invoicePaidHandler.handle(event);
        break;
      case "invoice.payment_failed":
        await this.invoiceFailedHandler.handle(event);
        break;
      case "charge.refunded":
        await this.chargeRefundedHandler.handle(event);
        break;
      case "charge.refund.updated":
        await this.chargeRefundedHandler.handleRefundUpdated(event);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
        break;
    }
  }

  /**
   * Routes v2 thin events by their exact `type` (mirrors the v1 `switch`).
   * Unknown types are logged and ignored — never mis-routed.
   */
  private async routeV2Event(event: V2ThinEvent) {
    const type = event.type ?? "";

    if ((V2_OUTBOUND_PAYMENT_EVENT_TYPES as readonly string[]).includes(type)) {
      await this.outboundPaymentStatusHandler.handle(event);
      return;
    }

    if ((V2_ACCOUNT_EVENT_TYPES as readonly string[]).includes(type)) {
      await this.payoutAccountUpdatedHandler.handle(event);
      return;
    }

    this.logger.debug(`Ignoring v2 event type (no handler): ${type}`);
  }
}
