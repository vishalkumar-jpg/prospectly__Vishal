import { Injectable, Inject, Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  REFUND_STATUS,
  PAYMENT_STAGE_STATUS,
} from "modules/introductions/refunds/refunds.constants";

@Injectable()
export class ChargeRefundedHandler {
  private readonly logger = new Logger(ChargeRefundedHandler.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Handle charge.refunded webhook - FINAL AUTHORITY
   * This event means the refund has completed successfully.
   * Do NOT inspect refund.status - just mark as refunded.
   */
  async handle(event: Stripe.Event): Promise<void> {
    try {
      const charge = event.data.object as Stripe.Charge;
      const refunds = charge.refunds?.data || [];

      for (const refund of refunds) {
        await this.markRefundAsComplete(refund.id);
      }
    } catch (error) {
      this.logger.error(
        `Error handling charge.refunded webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Handle charge.refund.updated webhook - PROGRESSIVE UPDATES
   * Updates status based on refund.status but never downgrades from refunded.
   */
  async handleRefundUpdated(event: Stripe.Event): Promise<void> {
    try {
      const refund = event.data.object as Stripe.Refund;
      await this.processRefundUpdate(refund);
    } catch (error) {
      this.logger.error(
        `Error handling charge.refund.updated webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Mark a refund as complete (for charge.refunded - FINAL)
   * Always sets status to refunded, no status checks needed.
   */
  private async markRefundAsComplete(stripeRefundId: string): Promise<void> {
    const paymentRefund = await this.db.query.paymentRefunds.findFirst({
      where: eq(schema.paymentRefunds.stripeRefundId, stripeRefundId),
    });

    if (!paymentRefund) {
      this.logger.warn(
        `Payment refund record not found for Stripe refund ${stripeRefundId}`
      );
      return;
    }

    // Idempotency: skip if already refunded
    if (paymentRefund.refundStatus === REFUND_STATUS.REFUNDED) {
      this.logger.log(`Refund ${stripeRefundId} already marked as refunded`);
      return;
    }

    // Update both tables in a transaction
    await this.db.transaction(async (tx) => {
      // Update payment_refunds to refunded
      await tx
        .update(schema.paymentRefunds)
        .set({
          refundStatus: REFUND_STATUS.REFUNDED,
          refundedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(eq(schema.paymentRefunds.id, paymentRefund.id));

      // Update payment_stages to refunded
      await tx
        .update(schema.paymentStages)
        .set({
          status: PAYMENT_STAGE_STATUS.REFUNDED,
          updatedAt: toUTC(),
        })
        .where(eq(schema.paymentStages.id, paymentRefund.paymentStageId));
    });

    this.logger.log(`Refund ${stripeRefundId} marked as complete (refunded)`);
  }

  /**
   * Process refund status update (for charge.refund.updated - PROGRESSIVE)
   * Updates pending → failed or pending → succeeded
   * Never downgrades a succeeded/refunded status
   */
  private async processRefundUpdate(refund: Stripe.Refund): Promise<void> {
    const stripeRefundId = refund.id;

    const paymentRefund = await this.db.query.paymentRefunds.findFirst({
      where: eq(schema.paymentRefunds.stripeRefundId, stripeRefundId),
    });

    if (!paymentRefund) {
      this.logger.warn(
        `Payment refund record not found for Stripe refund ${stripeRefundId}`
      );
      return;
    }

    // Never downgrade from refunded - it's final
    if (paymentRefund.refundStatus === REFUND_STATUS.REFUNDED) {
      this.logger.log(
        `Refund ${stripeRefundId} already refunded, ignoring update`
      );
      return;
    }

    // Map Stripe status to our status
    const { refundStatus, stageStatus } = this.mapStripeStatus(refund.status);

    // Only update if status is changing
    if (paymentRefund.refundStatus === refundStatus) {
      return;
    }

    // Update both tables in a transaction
    await this.db.transaction(async (tx) => {
      // Update payment_refunds status
      await tx
        .update(schema.paymentRefunds)
        .set({
          refundStatus,
          refundedAt: refundStatus === REFUND_STATUS.REFUNDED ? toUTC() : null,
          updatedAt: toUTC(),
        })
        .where(eq(schema.paymentRefunds.id, paymentRefund.id));

      // Update payment_stages status
      await tx
        .update(schema.paymentStages)
        .set({
          status: stageStatus,
          updatedAt: toUTC(),
        })
        .where(eq(schema.paymentStages.id, paymentRefund.paymentStageId));
    });

    this.logger.log(
      `Updated refund ${stripeRefundId}: ${paymentRefund.refundStatus} → ${refundStatus}`
    );
  }

  /**
   * Map Stripe refund status to internal statuses (for progressive updates)
   */
  private mapStripeStatus(stripeStatus: string | null): {
    refundStatus: string;
    stageStatus: string;
  } {
    switch (stripeStatus) {
      case "succeeded":
        return {
          refundStatus: REFUND_STATUS.REFUNDED,
          stageStatus: PAYMENT_STAGE_STATUS.REFUNDED,
        };
      case "failed":
        return {
          refundStatus: REFUND_STATUS.REFUND_FAILED,
          stageStatus: PAYMENT_STAGE_STATUS.REFUND_FAILED,
        };
      default:
        return {
          refundStatus: REFUND_STATUS.REFUND_INITIATED,
          stageStatus: PAYMENT_STAGE_STATUS.REFUND_INITIATED,
        };
    }
  }
}
