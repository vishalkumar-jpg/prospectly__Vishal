import * as schema from "database/schema";
import {
  FINANCES_DESCRIPTIONS,
  PAYMENT_EVENT_TYPES,
  StripePaymentStatusEnum,
  TransactionStatusEnum,
} from "./finances.constants";
import { PaymentEventDto, RefundInfoDto } from "./finances.response";
import {
  captureEventDescription,
  paymentEventDisplayAmount,
} from "./finances.helpers";

type PaymentStageRow = Pick<
  schema.PaymentStage,
  "id" | "stageName" | "capturedAt" | "status" | "intentId"
>;

export function paymentStageRowStatus(
  stage: PaymentStageRow | null | undefined
): string {
  if (!stage) return TransactionStatusEnum.PENDING;
  const postCapture: readonly string[] = [
    "refund_initiated",
    "refunded",
    "refund_failed",
  ];
  if (stage.capturedAt) {
    if (stage.status && postCapture.includes(stage.status)) {
      return stage.status;
    }
    return StripePaymentStatusEnum.CAPTURED;
  }
  return stage.status || TransactionStatusEnum.PENDING;
}

export function buildPaymentEventsForTransaction(input: {
  transaction: schema.IntroductionTransaction;
  initialStage: PaymentStageRow | undefined;
  remainingStage: PaymentStageRow | undefined;
  refundInfos: RefundInfoDto[];
  initialAmount: number;
  remainingAmount: number;
  requesterTotalAmount: number;
}): PaymentEventDto[] {
  const {
    transaction,
    initialStage,
    remainingStage,
    refundInfos,
    initialAmount,
    remainingAmount,
    requesterTotalAmount,
  } = input;

  const events: PaymentEventDto[] = [];
  const transactionId = transaction.id as string;
  const cycleTotal =
    Number(transaction.totalAuthorizedAmount) || requesterTotalAmount;

  if (transaction.paymentAuthorizedAt) {
    events.push({
      type: PAYMENT_EVENT_TYPES.AUTHORIZATION,
      timestamp: transaction.paymentAuthorizedAt.toISOString(),
      amount: cycleTotal,
      status: StripePaymentStatusEnum.SUCCEEDED,
      stripeId: initialStage?.intentId || "",
      description: FINANCES_DESCRIPTIONS.PAYMENT_AUTHORIZED,
      transactionId,
    });
  }

  const initialRowStatus = paymentStageRowStatus(initialStage);
  const initialBaseDescription = initialStage?.capturedAt
    ? FINANCES_DESCRIPTIONS.INITIAL_CAPTURE_DONE
    : initialStage?.status === "voided"
      ? FINANCES_DESCRIPTIONS.INITIAL_CAPTURE_RELEASED
      : FINANCES_DESCRIPTIONS.INITIAL_CAPTURE_PENDING;

  if (initialStage) {
    events.push({
      type: PAYMENT_EVENT_TYPES.INITIAL_CAPTURE,
      timestamp: initialStage.capturedAt?.toISOString() || null,
      amount: paymentEventDisplayAmount(
        initialAmount,
        "intro_email_sent",
        initialRowStatus,
        refundInfos
      ),
      status: initialRowStatus,
      stripeId: initialStage.intentId,
      description: captureEventDescription(
        initialBaseDescription,
        "intro_email_sent",
        initialRowStatus,
        refundInfos
      ),
      transactionId,
    });
  }

  const remainingRowStatus = paymentStageRowStatus(remainingStage);
  const remainingBaseDescription = remainingStage?.capturedAt
    ? FINANCES_DESCRIPTIONS.REMAINING_CAPTURE_DONE
    : FINANCES_DESCRIPTIONS.REMAINING_CAPTURE_PENDING;

  if (remainingStage) {
    events.push({
      type: PAYMENT_EVENT_TYPES.REMAINING_CAPTURE,
      timestamp: remainingStage.capturedAt?.toISOString() || null,
      amount: paymentEventDisplayAmount(
        remainingAmount,
        "meeting_booked",
        remainingRowStatus,
        refundInfos
      ),
      status: remainingRowStatus,
      stripeId: remainingStage.intentId,
      description: captureEventDescription(
        remainingBaseDescription,
        "meeting_booked",
        remainingRowStatus,
        refundInfos
      ),
      transactionId,
    });
  }

  return events;
}
