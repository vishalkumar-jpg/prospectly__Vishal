import { Injectable, Logger } from "@nestjs/common";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { V2OutboundPaymentStatus } from "modules/stripe/stripe-v2.types";

export interface StripeOutboundResult {
  outboundPaymentId: string;
  // Lifecycle status of the OutboundPayment as returned by Stripe. On an
  // idempotency replay this can be a terminal-failure status (`failed` /
  // `returned` / `canceled`) for a payment that did NOT deliver money — the
  // caller must not mark such a row "completed".
  status?: V2OutboundPaymentStatus;
}

@Injectable()
export class RecruitmentPayoutStripeHandlerService {
  private readonly logger = new Logger(
    RecruitmentPayoutStripeHandlerService.name
  );

  constructor(private readonly stripePayoutsService: StripePayoutsService) {}

  /**
   * Creates a single Global Payouts OutboundPayment to the recipient's local
   * bank. Funds are debited from the platform USD balance and converted to the
   * recipient's local currency by Stripe.
   */
  async executeOutboundPayment(
    amountCents: number,
    recipientAccountId: string,
    payoutMethodId: string | null | undefined,
    metadata: {
      payoutId: string;
      candidateId: string;
      recipientId: string;
      creditsApplied: string;
    }
  ): Promise<StripeOutboundResult> {
    const outbound = await this.stripePayoutsService.createOutboundPayment({
      amountCents,
      recipientAccountId,
      payoutMethodId,
      idempotencyKey: `recruitment_payout_${metadata.payoutId}`,
      description: `Referral payout for recruitment ${metadata.payoutId}`,
      metadata: {
        recruitment_payout_id: metadata.payoutId,
        candidate_id: metadata.candidateId,
        recipient_id: metadata.recipientId,
        credits_applied: metadata.creditsApplied,
      },
    });

    this.logger.log(
      `OutboundPayment ${outbound.id} created for recruitment payout ${metadata.payoutId} (status=${outbound.status ?? "unknown"})`
    );

    return { outboundPaymentId: outbound.id, status: outbound.status };
  }
}
