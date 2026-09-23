import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { toUTC } from "utils/dayjs";
import { AnyType } from "../../types/common";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly keyMode: string;
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    // Safe diagnostic descriptor — never log the full secret key.
    if (apiKey.startsWith("sk_live_")) {
      this.keyMode = "LIVE";
    } else if (apiKey.startsWith("sk_test_")) {
      this.keyMode = "TEST";
    } else {
      this.keyMode = "UNKNOWN";
    }
    this.keyPrefix = apiKey.slice(0, 11);
    this.stripe = new Stripe(apiKey, { apiVersion: "2025-10-29.clover" });
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: AnyType
  ): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata,
    });
    this.logger.log(
      `------------------STRIPE_SERVICE :: CREATE_CUSTOMER : created ${customer.id} keyMode=${this.keyMode} prefix=${this.keyPrefix}... NODE_ENV=${process.env.NODE_ENV}`
    );
    return customer;
  }

  async getCustomer(
    customerId: string
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(customerId);
  }

  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    return this.stripe.customers.del(customerId);
  }

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, params);
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async listPaymentMethods(
    customerId: string,
    type = "card"
  ): Promise<Stripe.PaymentMethod[]> {
    const methods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: type as AnyType,
    });
    return methods.data;
  }

  async detachPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    metadata?: AnyType
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
      capture_method: "manual",
    });
  }

  /**
   * Creates a PaymentIntent with manual capture.
   * Confirms the payment immediately using the provided payment method.
   * Standard manual capture provides a 7-day authorization window.
   *
   * Note: Extended authorization (30 days) requires Stripe account eligibility.
   * See: https://stripe.com/docs/payments/extended-authorization
   */
  async createAndConfirmPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    metadata?: Stripe.MetadataParam,
    useExtendedAuth = false // Disabled by default - requires Stripe account eligibility
  ): Promise<Stripe.PaymentIntent> {
    const options: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: "manual",
      confirm: true,
      off_session: true,
      metadata,
    };

    // Extended authorization allows holding funds for up to 30 days
    // Only enable if Stripe account is configured for flexible payments
    if (useExtendedAuth) {
      options.payment_method_options = {
        card: {
          request_extended_authorization: "if_available",
          request_incremental_authorization: "if_available",
        },
      };
    }

    return this.stripe.paymentIntents.create(options);
  }

  /**
   * Creates a PaymentIntent that captures immediately (automatic capture)
   * and confirms it off-session using the provided payment method.
   *
   * Used for one-shot charges where there is no need for an authorization
   * window (e.g. success-fee bonus on interview booking).
   *
   * Pass `idempotencyKey` for charges that must never double-fire under
   * concurrency — Stripe returns the original PaymentIntent for a repeated key
   * instead of creating a second charge. `latest_charge` is expanded so callers
   * can read the receipt URL off the returned intent.
   */
  async createAndCaptureNow(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    metadata?: Stripe.MetadataParam,
    idempotencyKey?: string
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        capture_method: "automatic",
        confirm: true,
        off_session: true,
        expand: ["latest_charge"],
        metadata,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );
  }

  /**
   * Retrieves a PaymentIntent by ID.
   */
  async getPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async capturePaymentIntent(
    paymentIntentId: string,
    amount?: number
  ): Promise<Stripe.PaymentIntent> {
    const captureParams: Stripe.PaymentIntentCaptureParams = {
      expand: ["latest_charge"],
    };
    if (amount) {
      captureParams.amount_to_capture = amount;
    }
    return this.stripe.paymentIntents.capture(paymentIntentId, captureParams);
  }

  async cancelPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  /**
   * Creates a refund for a captured PaymentIntent.
   * @param paymentIntentId - The PaymentIntent to refund
   * @param amountCents - Optional amount in cents. If not provided, refunds the full amount.
   * @param reason - Optional reason for the refund (duplicate, fraudulent, requested_by_customer)
   * @param metadata - Optional metadata to attach to the refund
   */
  async createRefund(
    paymentIntentId: string,
    amountCents?: number,
    reason?: "duplicate" | "fraudulent" | "requested_by_customer",
    metadata?: Stripe.MetadataParam
  ): Promise<Stripe.Refund> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata,
    };

    if (amountCents !== undefined) {
      if (amountCents <= 0) {
        throw new Error("Refund amount must be greater than 0 cents");
      }
      refundParams.amount = amountCents;
    }

    if (reason) {
      refundParams.reason = reason;
    }

    return this.stripe.refunds.create(refundParams);
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: AnyType,
    coupon?: string,
    trialDays?: number
  ): Promise<Stripe.Subscription> {
    const params: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      metadata,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    };

    if (trialDays) {
      params.trial_period_days = trialDays;
    }

    if (coupon) {
      params.discounts = [
        coupon.startsWith("promo_") ? { promotion_code: coupon } : { coupon },
      ];
    }

    return this.stripe.subscriptions.create(params);
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /** Cancels a Stripe subscription immediately (billing stops; retains audit trail in Stripe). */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET"
    );
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  }

  /**
   * Creates a Stripe Customer Portal Session for subscription management
   * @param customerId - Stripe customer ID
   * @param returnUrl - URL to redirect to after portal session ends
   * @returns Stripe Billing Portal Session with URL
   */
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string,
    subscriptionId?: string,
    subscriptionItemId?: string,
    newPriceId?: string
  ): Promise<Stripe.BillingPortal.Session> {
    // Basic session configuration
    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };

    // Add flow data for subscription update if all required parameters are provided
    if (subscriptionId && subscriptionItemId && newPriceId) {
      params.flow_data = {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: subscriptionId,
          items: [
            {
              id: subscriptionItemId,
              price: newPriceId,
            },
          ],
        },
      };
    }

    return this.stripe.billingPortal.sessions.create(params);
  }
  /**
   * Create a customer-specific coupon for invites
   */
  async createCustomerSpecificCoupon(params: {
    inviteId: string;
    email: string;
    planId: string;
    expiresAt: Date;
    stripeCustomerId?: string;
    stripeProductId: string;
  }): Promise<{ id: string; code: string; promotionCodeId?: string }> {
    const couponId = this.generateCouponCode(10);
    const expiresAtDate =
      params.expiresAt instanceof Date
        ? params.expiresAt
        : toUTC(params.expiresAt);

    if (isNaN(expiresAtDate.getTime())) {
      throw new Error(`Invalid expiration date: ${params.expiresAt}`);
    }

    const redeemBy = Math.floor(expiresAtDate.getTime() / 1000);

    const coupon = await this.stripe.coupons.create({
      id: couponId,
      percent_off: 100, // 100% discount
      duration: "once", // One-time use
      max_redemptions: 1, // Can only be used once
      redeem_by: redeemBy,
      applies_to: {
        products: [params.stripeProductId],
      },
      metadata: {
        invite_id: params.inviteId,
        user_email: params.email,
        plan_id: params.planId,
      },
    });

    let code = coupon.id;
    let promotionCodeId: string | undefined;

    // If customer exists, create a Customer-Restricted Promotion Code
    if (params.stripeCustomerId) {
      // Generate a user-friendly code
      const customCode = this.generateCouponCode(10);

      const promotionCode = await this.stripe.promotionCodes.create({
        promotion: {
          type: "coupon",
          coupon: coupon.id,
        } as AnyType, // Cast to AnyType to avoid type definition mismatch if SDK types are outdated
        customer: params.stripeCustomerId,
        code: customCode,
        max_redemptions: 1,
        metadata: {
          invite_id: params.inviteId,
          plan_id: params.planId,
        },
      });

      this.logger.log(
        `Created Customer-Restricted Promo Code: { id: ${promotionCode.id}, code: ${promotionCode.code} } for Customer: ${params.stripeCustomerId}`
      );
      code = promotionCode.code;
      promotionCodeId = promotionCode.id;
    } else {
      this.logger.log(`Created Coupon: ${coupon.id}`);
    }

    return { id: coupon.id, code, promotionCodeId };
  }

  private generateCouponCode(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
