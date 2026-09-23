import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import {
  STRIPE_V2_API_VERSION,
  V2CapabilityStatus,
  V2RecipientAccount,
  V2AccountLink,
  V2PayoutMethod,
  V2PayoutMethodList,
  V2OutboundPayment,
  V2ThinEvent,
  CreateOutboundPaymentParams,
} from "../../stripe-v2.types";

/**
 * Low-level Stripe Global Payouts (v2) API client. Connectors/candidates are paid
 * via Stripe Global Payouts: a v2 recipient account collects a local bank account
 * through Stripe-hosted onboarding, then an OutboundPayment moves funds from the
 * platform USD Financial Account to the recipient's local currency.
 *
 * This is the only payouts service exported from the module — it backs both the
 * payout action services and the external payout/webhook consumers.
 */
@Injectable()
export class StripePayoutsService {
  private readonly logger = new Logger(StripePayoutsService.name);
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    this.stripe = new Stripe(apiKey, { apiVersion: "2025-10-29.clover" });
  }

  /**
   * Issues a raw request against a v2 (preview) endpoint. The v2 Money
   * Management / Global Payouts APIs are not yet typed in stripe-node, so all
   * v2 calls funnel through here pinned to the preview API version.
   *
   * @param stripeContext optional recipient account id, sent as `Stripe-Context`
   *   (required for recipient-scoped resources such as payout methods).
   */
  private async v2Request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    params?: Record<string, unknown>,
    stripeContext?: string,
    idempotencyKey?: string
  ): Promise<T> {
    const additionalHeaders: Record<string, string> = {
      "Stripe-Version": STRIPE_V2_API_VERSION,
    };
    if (stripeContext) {
      additionalHeaders["Stripe-Context"] = stripeContext;
    }
    if (idempotencyKey) {
      additionalHeaders["Idempotency-Key"] = idempotencyKey;
    }

    // `rawRequest` only accepts a params object on POST. For GET/DELETE we must
    // encode parameters into the path query string and pass no params object.
    let requestPath = path;
    let requestParams = params;
    if (method !== "POST" && params && Object.keys(params).length > 0) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          // v2 expects repeated keys for arrays (e.g. include=a&include=b).
          value.forEach((item) => search.append(key, String(item)));
        } else if (value !== undefined && value !== null) {
          search.append(key, String(value));
        }
      }
      const qs = search.toString();
      requestPath = path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
      requestParams = undefined;
    }

    const response = await this.stripe.rawRequest(
      method,
      requestPath,
      requestParams,
      {
        apiVersion: STRIPE_V2_API_VERSION,
        additionalHeaders,
      }
    );
    return response as unknown as T;
  }

  /** The platform Financial Account (USD) that funds outbound payments. */
  private getFinancialAccountId(): string {
    const id = this.configService.get<string>("STRIPE_FINANCIAL_ACCOUNT_ID");
    if (!id) {
      throw new Error("STRIPE_FINANCIAL_ACCOUNT_ID is not configured");
    }
    return id;
  }

  /**
   * Creates a Global Payouts recipient account for a given ISO alpha-2 country,
   * requesting the local bank-account payout capability.
   */
  async createRecipientAccount(
    email: string,
    countryAlpha2: string,
    displayName?: string,
    metadata?: Record<string, string>,
    entityType: "individual" | "company" = "individual"
  ): Promise<V2RecipientAccount> {
    return this.v2Request<V2RecipientAccount>("POST", "/v2/core/accounts", {
      contact_email: email,
      display_name: displayName,
      identity: {
        country: countryAlpha2.toLowerCase(),
        entity_type: entityType,
      },
      configuration: {
        recipient: {
          capabilities: {
            bank_accounts: {
              local: { requested: true }, // Enable local bank transfers
              wire: { requested: true }, // Enable wire transfers
            },
          },
        },
      },
      metadata,
      include: ["identity", "configuration.recipient", "requirements"],
    });
  }

  /** Retrieves a recipient account (capability status, default destination, etc.). */
  async getRecipientAccount(accountId: string): Promise<V2RecipientAccount> {
    return this.v2Request<V2RecipientAccount>(
      "GET",
      `/v2/core/accounts/${accountId}`,
      { include: ["configuration.recipient", "identity", "requirements"] }
    );
  }

  /**
   * Priority used to surface the most-favorable status across payout rails
   * (local + wire). A recipient can receive payouts via either rail.
   */
  private static readonly CAPABILITY_PRIORITY: V2CapabilityStatus[] = [
    "active",
    "pending",
    "restricted",
    "inactive",
    "unsupported",
  ];

  /**
   * Effective bank-account capability status across the local + wire rails.
   * Some countries support only one rail (e.g. PH is wire-only: local reports
   * "unsupported" while wire is "active"), so a recipient can receive payouts
   * when EITHER rail is active. We surface the most-favorable of the two
   * statuses. Returns null if neither rail reports one.
   */
  getEffectiveBankCapabilityStatus(
    account: V2RecipientAccount
  ): V2CapabilityStatus | null {
    const banks = account.configuration?.recipient?.capabilities?.bank_accounts;
    const statuses = [banks?.local?.status, banks?.wire?.status].filter(
      (s): s is V2CapabilityStatus => !!s
    );
    if (statuses.length === 0) {
      return null;
    }
    return (
      StripePayoutsService.CAPABILITY_PRIORITY.find((s) =>
        statuses.includes(s)
      ) ?? statuses[0]
    );
  }

  /** True once the recipient's local OR wire bank-account capability is active. */
  isRecipientCapabilityActive(account: V2RecipientAccount): boolean {
    return this.getEffectiveBankCapabilityStatus(account) === "active";
  }

  /**
   * Derives the recipient's onboarding state from a fetched account.
   *
   * Distinguishes "onboarded" (hosted form complete — Stripe will NOT issue
   * another onboarding link) from "capability active" (can actually receive
   * payouts; may still be verifying right after onboarding).
   */
  getRecipientOnboardingState(account: V2RecipientAccount): {
    onboarded: boolean;
    capabilityActive: boolean;
    payoutMethodId: string | null;
  } {
    const recipient = account.configuration?.recipient;
    const capabilityActive =
      this.getEffectiveBankCapabilityStatus(account) === "active";

    const payoutMethodId = this.coercePayoutMethodId(
      recipient?.default_outbound_destination
    );
    const onboarded = !!payoutMethodId;

    return {
      onboarded,
      capabilityActive,
      payoutMethodId,
    };
  }

  /**
   * True if a Stripe error indicates the account has already completed
   * onboarding (so an onboarding link cannot be created). This is Stripe's
   * authoritative signal of completion.
   */
  isAlreadyOnboardedError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    return message.toLowerCase().includes("already been onboarded");
  }

  /**
   * Creates a Stripe-hosted onboarding link for a recipient to add their local
   * bank account. Links expire ~3 days after creation.
   */
  async createRecipientOnboardingLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<V2AccountLink> {
    return this.v2Request<V2AccountLink>("POST", "/v2/core/account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    });
  }

  /** Lists the payout methods (local bank accounts) on a recipient account. */
  async listPayoutMethods(accountId: string): Promise<V2PayoutMethod[]> {
    const result = await this.v2Request<V2PayoutMethodList>(
      "GET",
      "/v2/money_management/payout_methods",
      undefined,
      accountId
    );
    return result?.data ?? [];
  }

  /**
   * Coerces a payout-method reference to its string id. The v2 API may return
   * either a bare id string or an object (e.g. `{ id, type }`) for
   * `default_outbound_destination` / payout-method entries — never store/send
   * the object (it stringifies to "[object Object]").
   */
  private coercePayoutMethodId(value: unknown): string | null {
    if (typeof value === "string") {
      return value.includes("[object") ? null : value;
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const candidate =
        obj.id ?? obj.payout_method ?? obj.destination ?? obj.bank_account;
      return typeof candidate === "string" ? candidate : null;
    }
    return null;
  }

  /**
   * Resolves the recipient's default payout method id, falling back to the first
   * available payout method. Returns null if the recipient has none yet.
   */
  async getDefaultPayoutMethodId(accountId: string): Promise<string | null> {
    const account = await this.getRecipientAccount(accountId);
    const defaultId = this.coercePayoutMethodId(
      account.configuration?.recipient?.default_outbound_destination
    );
    if (defaultId) {
      return defaultId;
    }
    const methods = await this.listPayoutMethods(accountId);
    return this.coercePayoutMethodId(methods[0]) ?? null;
  }

  /**
   * Sends a Global Payouts OutboundPayment from the platform USD Financial
   * Account to a recipient. The recipient receives funds converted to their
   * local currency by Stripe. The payment settles asynchronously — track the
   * final status via the `outbound_payment.*` webhooks.
   */
  async createOutboundPayment(
    params: CreateOutboundPaymentParams
  ): Promise<V2OutboundPayment> {
    let payoutMethodId = this.coercePayoutMethodId(params.payoutMethodId);
    if (!payoutMethodId) {
      try {
        payoutMethodId = await this.getDefaultPayoutMethodId(
          params.recipientAccountId
        );
      } catch (error) {
        this.logger.warn(
          `STRIPE_PAYOUTS_SERVICE :: createOutboundPayment : payout method resolve failed, using default destination : ${error}`
        );
      }
    }

    const to: Record<string, string> = { recipient: params.recipientAccountId };
    if (payoutMethodId) {
      to.payout_method = payoutMethodId;
    }

    return this.v2Request<V2OutboundPayment>(
      "POST",
      "/v2/money_management/outbound_payments",
      {
        from: {
          financial_account: this.getFinancialAccountId(),
          currency: "usd",
        },
        to,
        amount: { value: params.amountCents, currency: "usd" },
        description: params.description,
        metadata: params.metadata,
      },
      undefined,
      params.idempotencyKey
    );
  }

  /** Fetches a full v2 resource by absolute path (e.g. a thin event's related_object.url). */
  async fetchV2Resource<T>(url: string, stripeContext?: string): Promise<T> {
    const path = url.startsWith("http")
      ? new URL(url).pathname + new URL(url).search
      : url;
    return this.v2Request<T>("GET", path, undefined, stripeContext);
  }

  /**
   * Verifies a v2 webhook ("thin event") signature and returns the parsed event.
   * v2 thin events use the same HMAC signing scheme as v1 webhooks, so we reuse
   * the SDK's signature verification and treat the parsed payload as a thin event.
   */
  verifyV2WebhookEvent(payload: Buffer, signature: string): V2ThinEvent {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_V2_WEBHOOK_SECRET"
    );
    if (!webhookSecret) {
      throw new Error("STRIPE_V2_WEBHOOK_SECRET is not configured");
    }
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event as unknown as V2ThinEvent;
  }
}
