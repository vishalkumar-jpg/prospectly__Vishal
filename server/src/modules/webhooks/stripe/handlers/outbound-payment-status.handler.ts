import { Injectable, Inject, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, or, ne } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { V2ThinEvent, V2OutboundPayment } from "modules/stripe/stripe-v2.types";

// Metadata key set on every recruitment OutboundPayment at creation
// (recruitment-payout-stripe-handler.service.ts). It equals the
// recruitment_payout_history.id, so it lets us reconcile a payout row even when
// its stripe_outbound_payment_id was never persisted (lost-response case).
const RECRUITMENT_PAYOUT_METADATA_KEY = "recruitment_payout_id";

/**
 * Handles v2 OutboundPayment status events. Payouts are recorded optimistically
 * as completed at submission time; this handler is the safety net that flips a
 * payout to FAILED if Stripe later reports the OutboundPayment failed/returned,
 * so it can be retried or reconciled. `posted` confirms a successful delivery.
 */
@Injectable()
export class OutboundPaymentStatusHandler {
  private readonly logger = new Logger(OutboundPaymentStatusHandler.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService
  ) {}

  async handle(event: V2ThinEvent): Promise<void> {
    try {
      const outboundPaymentId = event.related_object?.id;
      if (!outboundPaymentId) {
        this.logger.debug(
          `OUTBOUND_PAYMENT :: handle : no related id on event ${event.id}`
        );
        return;
      }

      // Prefer the authoritative status from the object; fall back to the event
      // type suffix (e.g. "...outbound_payment.failed" → "failed"). Also read
      // the object's metadata so we can reconcile a payout row whose
      // stripe_outbound_payment_id was never persisted (money-sent, id-NULL).
      let status = this.statusFromType(event.type);
      let recruitmentPayoutId: string | undefined;
      if (event.related_object?.url) {
        try {
          const obp =
            await this.stripePayoutsService.fetchV2Resource<V2OutboundPayment>(
              event.related_object.url
            );
          if (obp?.status) status = obp.status;
          recruitmentPayoutId =
            obp?.metadata?.[RECRUITMENT_PAYOUT_METADATA_KEY] ?? undefined;
        } catch (error) {
          this.logger.warn(
            `OUTBOUND_PAYMENT :: fetch ${outboundPaymentId} failed, using event type: ${error}`
          );
        }
      }

      this.logger.log(
        `OutboundPayment ${outboundPaymentId} status=${status} (event ${event.type}) payout=${recruitmentPayoutId ?? "?"}`
      );

      if (status === "failed" || status === "returned") {
        await this.markFailed(outboundPaymentId, status, recruitmentPayoutId);
      } else if (status === "posted") {
        await this.markPosted(outboundPaymentId, recruitmentPayoutId);
      }
      // `processing`/`canceled`/unknown: no-op (created already recorded).
    } catch (error) {
      this.logger.error(`OUTBOUND_PAYMENT :: handle : ERROR : ${error}`);
    }
  }

  private statusFromType(type: string): string {
    const parts = type.split(".");
    return parts[parts.length - 1] ?? "";
  }

  /**
   * Stripe reports the transfer failed/returned → money did NOT stay with the
   * recipient, so make the payout retryable again.
   *
   * DOUBLE-PAY GUARDS:
   * - Terminal guard: NEVER touch a row already `status='completed'` (a posted
   *   payment cannot legitimately be reported `failed`; a stale/out-of-order
   *   event must not un-complete a paid row).
   * - Recruitment rows: only flip `processing_status` to 'failed' and leave the
   *   lifecycle `status='pending'` so the row stays eligible for retry (mirrors
   *   the processor's own failure model). We do NOT backfill
   *   `stripe_outbound_payment_id` — a $0 failed payment must keep a NULL id so
   *   the processor's guard doesn't block the legitimate retry.
   */
  private async markFailed(
    outboundPaymentId: string,
    status: string,
    recruitmentPayoutId?: string
  ): Promise<void> {
    const now = toUTC();
    const errorMessage = `OutboundPayment ${status} by Stripe (${outboundPaymentId})`;

    const prospecting = await this.db
      .update(schema.payoutHistory)
      .set({
        status: "failed",
        processingStatus: "failed",
        payoutReleased: false,
        errorMessage,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.payoutHistory.stripeOutboundPaymentId, outboundPaymentId),
          ne(schema.payoutHistory.status, "completed")
        )
      )
      .returning({ id: schema.payoutHistory.id });

    // Match by stored id OR (for a NULL-id row) by the metadata payout id.
    const recruitmentMatch = recruitmentPayoutId
      ? or(
          eq(
            schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
            outboundPaymentId
          ),
          eq(schema.recruitmentPayoutHistory.id, recruitmentPayoutId)
        )
      : eq(
          schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
          outboundPaymentId
        );

    const recruitment = await this.db
      .update(schema.recruitmentPayoutHistory)
      .set({
        // Keep lifecycle status='pending' so the row remains retryable; only
        // the processing lane reflects the failure. No id backfill.
        processingStatus: "failed",
        errorMessage,
        updatedAt: now,
      })
      .where(
        and(
          recruitmentMatch,
          ne(schema.recruitmentPayoutHistory.status, "completed")
        )
      )
      .returning({ id: schema.recruitmentPayoutHistory.id });

    if (prospecting.length === 0 && recruitment.length === 0) {
      this.logger.warn(
        `No payout row found for failed OutboundPayment ${outboundPaymentId} (payout=${recruitmentPayoutId ?? "?"})`
      );
    }
  }

  /**
   * Stripe confirms the transfer posted (money delivered). Marks the payout
   * completed and — critically — BACKFILLS `stripe_outbound_payment_id` for a
   * row whose id was never persisted (the money-sent-but-id-NULL case). Once the
   * id is stored, the processor's `if (stripeOutboundPaymentId) return` guard
   * blocks every future re-send, closing the >24h double-pay window.
   *
   * DOUBLE-PAY GUARDS:
   * - Idempotent: a row already `completed` is left untouched.
   * - NEVER overwrite a non-NULL id with a DIFFERENT one — that would indicate
   *   two distinct payments for one payout; log CRITICAL and refuse instead.
   */
  private async markPosted(
    outboundPaymentId: string,
    recruitmentPayoutId?: string
  ): Promise<void> {
    const now = toUTC();

    await this.db
      .update(schema.payoutHistory)
      .set({
        status: "completed",
        processingStatus: "completed",
        payoutReleased: true,
        completedAt: now,
        processingCompletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.payoutHistory.stripeOutboundPaymentId, outboundPaymentId),
          ne(schema.payoutHistory.status, "completed")
        )
      );

    // Locate the recruitment row by stored id OR metadata payout id.
    const recruitmentMatch = recruitmentPayoutId
      ? or(
          eq(
            schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
            outboundPaymentId
          ),
          eq(schema.recruitmentPayoutHistory.id, recruitmentPayoutId)
        )
      : eq(
          schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
          outboundPaymentId
        );

    const [row] = await this.db
      .select({
        id: schema.recruitmentPayoutHistory.id,
        status: schema.recruitmentPayoutHistory.status,
        existingId: schema.recruitmentPayoutHistory.stripeOutboundPaymentId,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(recruitmentMatch)
      .limit(1);

    if (!row) return;
    if (row.status === "completed") return; // idempotent
    if (row.existingId && row.existingId !== outboundPaymentId) {
      this.logger.error(
        `CRITICAL: possible duplicate payment — recruitment payout ${row.id} already holds OutboundPayment ${row.existingId}; refusing to overwrite with ${outboundPaymentId}`
      );
      return;
    }

    await this.db
      .update(schema.recruitmentPayoutHistory)
      .set({
        status: "completed",
        processingStatus: "completed",
        // Backfill the id so future re-sends are blocked by the processor guard.
        stripeOutboundPaymentId: outboundPaymentId,
        completedAt: now,
        processingCompletedAt: now,
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(schema.recruitmentPayoutHistory.id, row.id));
  }
}
