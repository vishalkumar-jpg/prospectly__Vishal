export const PAYMENTS_MESSAGES = {
  ERROR: {
    STRIPE_CUSTOMER_NOT_FOUND: "Stripe customer not found",
    REQUEST_NOT_FOUND: "Introduction request not found",
    UNAUTHORIZED: "Unauthorized",
    NO_PAYMENT_INTENT: "No payment intent found",
    CONTACT_OWNER_NOT_FOUND: "Contact owner not found",
    STRIPE_CONNECT_ACCOUNT_NOT_FOUND:
      "Stripe Connect account not found for connector",
    BOUNTY_TOO_LOW: (amount: number) =>
      `Referral payout amount must be at least $${amount}`,
    UNAUTHORIZED_REQUEST: "Not authorized to create payment for this request",
    PAYMENT_INTENTS_EXIST_ERROR:
      "Payment intents already exist for this request but could not be retrieved. Please contact support.",
    INITIAL_INTENT_CREATION_FAILED: (reason: string) =>
      `Initial PaymentIntent creation failed: ${reason}`,
    REMAINING_INTENT_CREATION_FAILED: (reason: string) =>
      `Remaining PaymentIntent creation failed: ${reason}`,
    NO_INITIAL_INTENT: "No initial payment intent found for this request",
    NO_REMAINING_INTENT: "No remaining payment intent found for this request",
    CANNOT_CAPTURE_95_BEFORE_5:
      "Cannot capture 95% before 5% is captured. Email delivery must be confirmed first.",
    CANNOT_CAPTURE_INITIAL: (requestId: string, reason: string) =>
      `Cannot capture initial payment for request ${requestId}: ${reason}`,
    CANNOT_CAPTURE_REMAINING: (requestId: string, reason: string) =>
      `Cannot capture remaining payment for request ${requestId}: ${reason}`,
    ALL_PAYMENTS_MUST_BE_CAPTURED:
      "All payments must be captured before payout can be processed",
    REQUEST_NOT_ELIGIBLE_PAYOUT: "Request is not eligible for payout",
    CONNECTOR_MUST_SUBMIT_FEEDBACK:
      "Connector must submit peer feedback before payout",
    NO_CONNECTOR_FOUND: "No connector found for this request",
    PAYOUT_DEFERRED: (trustScore: number, threshold: number) =>
      `Payout deferred until peer feedback. Trust score: ${trustScore}, threshold: ${threshold}`,
    STRIPE_CONNECT_NOT_FOUND_FOR_CONNECTOR:
      "Connector does not have a Stripe Connect account",
  },
  INFO: {
    PAYMENT_CAPTURED: "Payment captured successfully",
    PAYOUT_PROCESSED: "Payout processed successfully",
  },
  LOG: {
    DUAL_INTENTS_EXIST: (requestId: string) =>
      `Dual PaymentIntents already exist for request ${requestId} - returning existing intents`,
    CREATING_DUAL_INTENTS: (
      requestId: string,
      initial: number,
      remaining: number
    ) =>
      `Creating dual PaymentIntents for request ${requestId}: 5%=${initial}c, 95%=${remaining}c`,
    DUAL_INTENTS_CREATED: (requestId: string) =>
      `Dual PaymentIntents created successfully for request ${requestId}`,
    FAILED_CREATE_DUAL_INTENTS: (requestId: string, error: string) =>
      `Failed to create dual PaymentIntents for request ${requestId}: ${error}`,
    PAYMENT_5_PERCENT_ALREADY_CAPTURED: (requestId: string) =>
      `5% payment already captured for request ${requestId}`,
    PAYMENT_5_PERCENT_ALREADY_CAPTURED_STRIPE: (requestId: string) =>
      `5% payment already captured via Stripe for request ${requestId} (PI status: succeeded)`,
    RECEIPT_URL_CAPTURED_5: (requestId: string, url: string) =>
      `Receipt URL captured for 5% payment request ${requestId}: ${url}`,
    INITIAL_PAYMENT_CAPTURED: (requestId: string, amount: number) =>
      `Initial payment captured successfully for request ${requestId}: ${amount}c`,
    PAYMENT_5_PERCENT_ALREADY_CAPTURED_RACE: (requestId: string) =>
      `5% payment already captured by another process for request ${requestId} - treating as success`,
    FAILED_CAPTURE_INITIAL: (requestId: string, error: string) =>
      `Failed to capture initial payment for request ${requestId}: ${error}`,
    PAYMENT_95_PERCENT_ALREADY_CAPTURED: (requestId: string) =>
      `95% payment already captured for request ${requestId}`,
    PAYMENT_95_PERCENT_ALREADY_CAPTURED_STRIPE: (requestId: string) =>
      `95% payment already captured via Stripe for request ${requestId} (PI status: succeeded)`,
    RECEIPT_URL_CAPTURED_95: (requestId: string, url: string) =>
      `Receipt URL captured for 95% payment request ${requestId}: ${url}`,
    REMAINING_PAYMENT_CAPTURED: (requestId: string, amount: number) =>
      `Remaining payment captured successfully for request ${requestId}: ${amount}c`,
    PAYMENT_95_PERCENT_ALREADY_CAPTURED_RACE: (requestId: string) =>
      `95% payment already captured by another process for request ${requestId} - treating as success`,
    FAILED_CAPTURE_REMAINING: (requestId: string, error: string) =>
      `Failed to capture remaining payment for request ${requestId}: ${error}`,
    FAILED_GET_TRUST_SCORE: (userId: string, error: string) =>
      `Failed to get trust score for user ${userId}: ${error}`,
    NO_TRUST_SCORE_DEFAULTING: (connectorId: string) =>
      `No trust score found for connector ${connectorId}, defaulting to deferred payout`,
    PAYOUT_ALREADY_PROCESSED: (requestId: string) =>
      `Payout already processed for request ${requestId}`,
    DEFERRING_PAYOUT: (connectorId: string, score: number, threshold: number) =>
      `Connector ${connectorId} trust score (${score}) is below threshold (${threshold}). Deferring payout until peer feedback.`,
    PAYOUT_ALREADY_RELEASED: (requestId: string) =>
      `Payout already released for request ${requestId} - returning existing payout info`,
    PROCESSING_PAYOUT: (
      triggeredBy: string,
      requestId: string,
      connectorAmount: number,
      platformAmount: number
    ) =>
      `Processing ${triggeredBy} payout for request ${requestId}: connector=${connectorAmount}c, platform=${platformAmount}c`,
    TRANSFER_COMPLETED: (requestId: string, transferId: string) =>
      `Transfer completed for request ${requestId}: transfer=${transferId}`,
    IMMEDIATE_PAYOUT_TRIGGERED: (requestId: string, payoutId: string) =>
      `Immediate payout triggered for request ${requestId}: payout=${payoutId}`,
    IMMEDIATE_PAYOUT_FAILED: (requestId: string, error: string) =>
      `Immediate payout failed for request ${requestId} (will use automatic payout): ${error}`,
    PAYOUT_COMPLETED: (
      requestId: string,
      transferId: string,
      payoutPart: string
    ) =>
      `Payout completed for request ${requestId}: transfer=${transferId}${payoutPart}`,
    FAILED_PROCESS_PAYOUT: (requestId: string, error: string) =>
      `Failed to process payout for request ${requestId}: ${error}`,
    CANCELLED_INITIAL_INTENT: (requestId: string) =>
      `Cancelled initial PaymentIntent for request ${requestId}`,
    CANCELLED_REMAINING_INTENT: (requestId: string) =>
      `Cancelled remaining PaymentIntent for request ${requestId}`,
    FAILED_CANCEL_INTENTS: (requestId: string, errors: string) =>
      `Some PaymentIntents could not be cancelled for request ${requestId}: ${errors}`,
    EXISTING_PAYMENT_INTENTS_ERROR: (requestId: string, error: string) =>
      `Could not fetch existing PaymentIntents for request ${requestId}: ${error}`,
  },
};

export const PAYMENT_METADATA_TYPES = {
  INITIAL_BOUNTY: "introduction_bounty_initial",
  REMAINING_BOUNTY: "introduction_bounty_remaining",
} as const;

export const PAYMENT_PERCENTAGES = {
  INITIAL: "5",
  REMAINING: "95",
} as const;

export const STRIPE_STATUS = {
  SUCCEEDED: "succeeded",
} as const;
