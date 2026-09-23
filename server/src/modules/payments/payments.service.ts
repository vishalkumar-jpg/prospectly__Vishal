import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { StripeService } from "modules/stripe/stripe.service";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { FinancesService } from "modules/finances/finances.service";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  TRUST_SCORE_THRESHOLD,
  STRIPE_CURRENCY,
  PAYMENT_STATUS,
  PAYOUT_TRIGGER,
  PAYOUT_STATUS,
  MINIMUM_BOUNTY_AMOUNT,
} from "config/payment.config";
import Stripe from "stripe";
import { ProfilesService } from "modules/profiles/profiles.service";
import {
  hasStoredRequesterFees,
  mergeRequesterFeeFields,
} from "utils/introduction-request-fees.util";
import {
  PAYMENTS_MESSAGES,
  PAYMENT_METADATA_TYPES,
  PAYMENT_PERCENTAGES,
  STRIPE_STATUS,
} from "./payments.constants";
import {
  calculateSplitAmounts,
  calculatePayoutSplit,
  convertToCents,
  convertToDollars,
  isValidBountyAmount,
} from "./utils/payment-calculations.util";
import { calculatePayoutFees } from "./utils/payout-fees.util";
import {
  validatePaymentIntentCreation,
  validatePaymentIntentForCapture,
  extractStripeErrorMessage,
  DualPaymentIntentsResult,
} from "./utils/payment-intents.util";

interface DualPaymentIntentsInput {
  requestId: string;
  userId: string;
  bountyAmountDollars: number | string;
  paymentMethodId: string;
}

interface PaymentCaptureResult {
  success: boolean;
  amountCapturedCents: number;
  paymentIntentId: string;
  error?: string;
}

interface PayoutResult {
  success: boolean;
  connectorAmountCents: number;
  platformAmountCents: number;
  outboundPaymentId?: string;
  payoutTriggeredBy: "trust_score" | "peer_feedback";
  connectorTrustScore?: number;
  error?: string;
}

interface IntroductionRequestForPayout {
  id: string;
  bountyAmount: number | string;
  contactOwnerId: string;
  [key: string]: unknown;
}

interface ConnectorForPayout {
  id: string;
  stripeRecipientAccountId: string;
  stripeRecipientOnboardingComplete?: boolean | null;
  stripePayoutMethodId?: string | null;
  payoutCurrency?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly stripePayoutsService: StripePayoutsService,
    private readonly financesService: FinancesService,
    private readonly profilesService: ProfilesService,
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService
  ) {}

  /**
   * Private helper to fetch introduction request + transaction data locally
   * Replaces dependency on IntroductionsService.getIntroductionRequest
   */
  private async getIntroductionRequest(id: string) {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, id),
      with: {
        pricing: true,
      },
    });

    if (!request) return null;

    const feeFields = mergeRequesterFeeFields(request, request.pricing);
    const requestWithFees = { ...request, ...feeFields };

    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(id);

    if (!transaction) {
      return {
        ...requestWithFees,
        contactOwnerId: request.acceptedBy,
      };
    }

    const transactionId = transaction.id as string;

    // Get payment stages for backward compatibility
    const paymentStages =
      await this.financesService.getPaymentStagesByTransactionId(transactionId);

    // Transform payment stages to old format for backward compatibility
    const initialStage = paymentStages.find(
      (s) => s.stageName === "intro_email_sent"
    );
    const remainingStage = paymentStages.find(
      (s) => s.stageName === "meeting_booked"
    );

    return {
      ...requestWithFees,
      contactOwnerId: request.acceptedBy,
      // Old format fields for backward compatibility
      initialPaymentIntentId: initialStage?.intentId,
      initialPaymentStatus: initialStage?.status,
      initialChargeAmount: initialStage?.amount,
      initialChargeCaptured: !!initialStage?.capturedAt,
      initialChargeCapturedAt: initialStage?.capturedAt,
      initialPaymentCapturedAt: initialStage?.capturedAt,
      initialChargeReceiptUrl: initialStage?.receiptUrl,
      remainingPaymentIntentId: remainingStage?.intentId,
      remainingPaymentStatus: remainingStage?.status,
      remainingChargeAmount: remainingStage?.amount,
      remainingChargeCaptured: !!remainingStage?.capturedAt,
      remainingChargeCapturedAt: remainingStage?.capturedAt,
      remainingPaymentCapturedAt: remainingStage?.capturedAt,
      remainingChargeReceiptUrl: remainingStage?.receiptUrl,
      paymentStatus: transaction.overallStatus,
      paymentAuthorizedAt: transaction.paymentAuthorizedAt,
      paymentError: transaction.paymentError,
    };
  }

  /**
   * Creates dual PaymentIntents for an introduction request (5% + 95% split).
   * Both PaymentIntents are created with manual capture and extended authorization.
   * Funds are held but not captured until milestones are reached.
   */
  async createDualPaymentIntentsForRequest(
    input: DualPaymentIntentsInput
  ): Promise<DualPaymentIntentsResult> {
    const { requestId, userId, bountyAmountDollars, paymentMethodId } = input;

    if (!isValidBountyAmount(bountyAmountDollars, MINIMUM_BOUNTY_AMOUNT)) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.BOUNTY_TOO_LOW(MINIMUM_BOUNTY_AMOUNT)
      );
    }

    const profile = await this.profilesService.getProfileById(userId);
    if (!profile?.stripeCustomerId) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.STRIPE_CUSTOMER_NOT_FOUND
      );
    }

    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
    // Cast to AnyType to access merged payment fields from transaction/payout tables
    const request = requestData as AnyType;

    if (request.requesterId !== userId) {
      throw new UnauthorizedException(
        PAYMENTS_MESSAGES.ERROR.UNAUTHORIZED_REQUEST
      );
    }

    // IDEMPOTENCY CHECK: Prevent duplicate PaymentIntent creation
    // Check if payment stages already exist
    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(
        requestId
      );
    if (transaction) {
      const transactionId = transaction.id as string;
      const existingStages =
        await this.financesService.getPaymentStagesByTransactionId(
          transactionId
        );
      const initialStage = existingStages.find(
        (s) => s.stageName === "intro_email_sent"
      );
      const remainingStage = existingStages.find(
        (s) => s.stageName === "meeting_booked"
      );

      if (initialStage && remainingStage) {
        this.logger.log(PAYMENTS_MESSAGES.LOG.DUAL_INTENTS_EXIST(requestId));

        // Fetch existing PaymentIntents from Stripe to return their details
        try {
          const [initialPI, remainingPI] = await Promise.all([
            this.stripeService.getPaymentIntent(initialStage.intentId),
            this.stripeService.getPaymentIntent(remainingStage.intentId),
          ]);

          return {
            initialPaymentIntent: initialPI,
            remainingPaymentIntent: remainingPI,
            amounts: {
              initialAmountCents: initialPI.amount,
              remainingAmountCents: remainingPI.amount,
              totalAmountCents: initialPI.amount + remainingPI.amount,
            },
          };
        } catch (error) {
          this.logger.warn(
            PAYMENTS_MESSAGES.LOG.EXISTING_PAYMENT_INTENTS_ERROR(
              requestId,
              error.message
            )
          );
          throw new BadRequestException(
            PAYMENTS_MESSAGES.ERROR.PAYMENT_INTENTS_EXIST_ERROR
          );
        }
      }
    }

    const payableTotalDollars = hasStoredRequesterFees(request)
      ? parseFloat(String(request.totalAmount))
      : bountyAmountDollars;
    const splitAmounts = calculateSplitAmounts(payableTotalDollars);
    this.logger.log(
      PAYMENTS_MESSAGES.LOG.CREATING_DUAL_INTENTS(
        requestId,
        splitAmounts.initialAmountCents,
        splitAmounts.remainingAmountCents
      )
    );

    try {
      const initialMetadata: Stripe.MetadataParam = {
        requestId,
        userId,
        type: PAYMENT_METADATA_TYPES.INITIAL_BOUNTY,
        percentage: PAYMENT_PERCENTAGES.INITIAL,
      };

      const initialPaymentIntent =
        await this.stripeService.createAndConfirmPaymentIntent(
          splitAmounts.initialAmountCents,
          STRIPE_CURRENCY,
          profile.stripeCustomerId,
          paymentMethodId,
          initialMetadata,
          false // Extended auth disabled - standard 7-day authorization window
        );

      const initialValidation =
        validatePaymentIntentCreation(initialPaymentIntent);
      if (!initialValidation.isSuccess) {
        this.logger.error(
          PAYMENTS_MESSAGES.ERROR.INITIAL_INTENT_CREATION_FAILED(
            initialValidation.reason
          )
        );
        throw new BadRequestException(initialValidation.reason);
      }

      const remainingMetadata: Stripe.MetadataParam = {
        requestId,
        userId,
        type: PAYMENT_METADATA_TYPES.REMAINING_BOUNTY,
        percentage: PAYMENT_PERCENTAGES.REMAINING,
      };

      const remainingPaymentIntent =
        await this.stripeService.createAndConfirmPaymentIntent(
          splitAmounts.remainingAmountCents,
          STRIPE_CURRENCY,
          profile.stripeCustomerId,
          paymentMethodId,
          remainingMetadata,
          false // Extended auth disabled - standard 7-day authorization window
        );

      const remainingValidation = validatePaymentIntentCreation(
        remainingPaymentIntent
      );
      if (!remainingValidation.isSuccess) {
        this.logger.error(
          PAYMENTS_MESSAGES.ERROR.REMAINING_INTENT_CREATION_FAILED(
            remainingValidation.reason
          )
        );
        await this.stripeService.cancelPaymentIntent(initialPaymentIntent.id);
        throw new BadRequestException(remainingValidation.reason);
      }

      // Create or get transaction
      const createdTransaction =
        await this.financesService.upsertIntroductionTransaction(requestId, {
          paymentMethodId,
          overallStatus: PAYMENT_STATUS.AUTHORIZED,
          paymentAuthorizedAt: toUTC(),
          totalAuthorizedAmount: convertToDollars(
            splitAmounts.totalAmountCents
          ).toString(),
        });

      // Create payment stages
      const transactionId = createdTransaction.id as string;
      await this.financesService.createPaymentStage({
        transactionId,
        stageName: "intro_email_sent",
        stageOrder: 1,
        intentId: initialPaymentIntent.id,
        amount: convertToDollars(splitAmounts.initialAmountCents).toString(),
        status: PAYMENT_STATUS.AUTHORIZED,
        authorizedAt: toUTC(),
      });

      await this.financesService.createPaymentStage({
        transactionId,
        stageName: "meeting_booked",
        stageOrder: 2,
        intentId: remainingPaymentIntent.id,
        amount: convertToDollars(splitAmounts.remainingAmountCents).toString(),
        status: PAYMENT_STATUS.AUTHORIZED,
        authorizedAt: toUTC(),
      });

      // Update transaction totals
      await this.financesService.updateTransactionTotals(transactionId);

      this.logger.log(PAYMENTS_MESSAGES.LOG.DUAL_INTENTS_CREATED(requestId));

      return {
        initialPaymentIntent,
        remainingPaymentIntent,
        amounts: {
          initialAmountCents: splitAmounts.initialAmountCents,
          remainingAmountCents: splitAmounts.remainingAmountCents,
          totalAmountCents: splitAmounts.totalAmountCents,
        },
      };
    } catch (error) {
      this.logger.error(
        PAYMENTS_MESSAGES.LOG.FAILED_CREATE_DUAL_INTENTS(
          requestId,
          error.message
        )
      );
      throw error;
    }
  }

  /**
   * Captures the initial payment stage after intro email is sent.
   * This is the first milestone in the payment flow.
   */
  async captureIntroSentPayment(
    userId: string,
    requestId: string
  ): Promise<PaymentCaptureResult> {
    const requestData = await this.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(
        requestId
      );
    if (!transaction) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    const transactionId = transaction.id as string;
    const initialStage = await this.financesService.getPaymentStageByStageName(
      transactionId,
      "intro_email_sent"
    );

    if (!initialStage) {
      throw new BadRequestException(PAYMENTS_MESSAGES.ERROR.NO_INITIAL_INTENT);
    }

    if (initialStage.capturedAt) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.PAYMENT_5_PERCENT_ALREADY_CAPTURED(requestId)
      );
      return {
        success: true,
        amountCapturedCents: convertToCents(initialStage.amount || 0),
        paymentIntentId: initialStage.intentId,
      };
    }

    try {
      const paymentIntent = await this.stripeService.getPaymentIntent(
        initialStage.intentId
      );

      // Handle already-captured PaymentIntent (e.g., from duplicate webhook or race condition)
      if (paymentIntent.status === STRIPE_STATUS.SUCCEEDED) {
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.PAYMENT_5_PERCENT_ALREADY_CAPTURED_STRIPE(
            requestId
          )
        );

        // Ensure DB is updated to reflect the captured state
        if (!initialStage.capturedAt) {
          await this.financesService.updatePaymentStage(initialStage.id, {
            status: PAYMENT_STATUS.CAPTURED,
            capturedAt: toUTC(),
            chargeAmount: convertToDollars(
              paymentIntent.amount_received || paymentIntent.amount || 0
            ).toString(),
          });
          await this.financesService.updateTransactionTotals(transactionId);
        }

        return {
          success: true,
          amountCapturedCents:
            paymentIntent.amount_received || paymentIntent.amount || 0,
          paymentIntentId: initialStage.intentId,
        };
      }

      const validation = validatePaymentIntentForCapture(paymentIntent);

      if (!validation.isValid) {
        this.logger.error(
          PAYMENTS_MESSAGES.ERROR.CANNOT_CAPTURE_INITIAL(
            requestId,
            validation.reason
          )
        );
        await this.financesService.updatePaymentStage(initialStage.id, {
          status: PAYMENT_STATUS.FAILED,
        });
        await this.financesService.updateIntroductionTransaction(
          transactionId,
          {
            paymentError: validation.reason,
          }
        );
        return {
          success: false,
          amountCapturedCents: 0,
          paymentIntentId: initialStage.intentId,
          error: validation.reason,
        };
      }

      const capturedIntent = await this.stripeService.capturePaymentIntent(
        initialStage.intentId
      );

      const updateData: Partial<schema.PaymentStage> = {
        status: PAYMENT_STATUS.CAPTURED,
        capturedAt: toUTC(),
        chargeAmount: convertToDollars(
          capturedIntent.amount_received || 0
        ).toString(),
      };

      const latestCharge = capturedIntent.latest_charge;
      if (
        latestCharge &&
        typeof latestCharge === "object" &&
        "receipt_url" in latestCharge
      ) {
        updateData.receiptUrl = latestCharge.receipt_url as string;
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.RECEIPT_URL_CAPTURED_5(
            requestId,
            latestCharge.receipt_url as string
          )
        );
      }

      await this.financesService.updatePaymentStage(
        initialStage.id,
        updateData
      );
      await this.financesService.updateTransactionTotals(transactionId);

      this.logger.log(
        PAYMENTS_MESSAGES.LOG.INITIAL_PAYMENT_CAPTURED(
          requestId,
          capturedIntent.amount_received
        )
      );

      return {
        success: true,
        amountCapturedCents: capturedIntent.amount_received || 0,
        paymentIntentId: initialStage.intentId,
      };
    } catch (error: unknown) {
      const errorMessage = extractStripeErrorMessage(error);

      // Handle race condition: if another process already captured, treat as success
      const stripeError =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string })
          : null;
      if (
        errorMessage.includes("already been captured") ||
        errorMessage.includes("already captured") ||
        stripeError?.code === "payment_intent_unexpected_state"
      ) {
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.PAYMENT_5_PERCENT_ALREADY_CAPTURED_RACE(
            requestId
          )
        );

        // Ensure DB is updated to reflect the captured state
        if (!initialStage.capturedAt) {
          await this.financesService.updatePaymentStage(initialStage.id, {
            status: PAYMENT_STATUS.CAPTURED,
            capturedAt: toUTC(),
            chargeAmount: initialStage.amount,
          });
          await this.financesService.updateTransactionTotals(transactionId);
        }

        return {
          success: true,
          amountCapturedCents: convertToCents(initialStage.amount || 0),
          paymentIntentId: initialStage.intentId,
        };
      }

      this.logger.error(
        PAYMENTS_MESSAGES.LOG.FAILED_CAPTURE_INITIAL(requestId, errorMessage)
      );

      await this.financesService.updatePaymentStage(initialStage.id, {
        status: PAYMENT_STATUS.FAILED,
      });
      await this.financesService.updateIntroductionTransaction(transactionId, {
        paymentError: errorMessage,
      });

      return {
        success: false,
        amountCapturedCents: 0,
        paymentIntentId: initialStage.intentId || "",
        error: errorMessage,
      };
    }
  }

  /**
   * Captures the remaining payment stage when meeting is booked.
   * This is the second milestone. If capture fails, meeting booking should be blocked.
   */
  async captureMeetingBookedPayment(
    userId: string,
    requestId: string
  ): Promise<PaymentCaptureResult> {
    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
    const request = requestData as AnyType;

    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(
        requestId
      );
    if (!transaction) {
      throw new NotFoundException(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    const transactionId = transaction.id as string;
    const remainingStage =
      await this.financesService.getPaymentStageByStageName(
        transactionId,
        "meeting_booked"
      );

    if (!remainingStage) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.NO_REMAINING_INTENT
      );
    }

    if (remainingStage.capturedAt) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.PAYMENT_95_PERCENT_ALREADY_CAPTURED(requestId)
      );
      return {
        success: true,
        amountCapturedCents: convertToCents(remainingStage.amount || 0),
        paymentIntentId: remainingStage.intentId,
      };
    }

    // Check if initial stage is captured, if not try to capture it
    const initialStage = await this.financesService.getPaymentStageByStageName(
      transactionId,
      "intro_email_sent"
    );
    if (!initialStage?.capturedAt) {
      this.logger.warn(
        `Initial payment not yet captured for request ${requestId} during meeting booking. Attempting to capture now as fallback.`
      );
      try {
        await this.captureIntroSentPayment(request.requesterId, requestId);
        // Refresh remaining stage after initial capture
        const refreshedRemaining =
          await this.financesService.getPaymentStageByStageName(
            transactionId,
            "meeting_booked"
          );
        if (!refreshedRemaining) {
          throw new BadRequestException(
            PAYMENTS_MESSAGES.ERROR.NO_REMAINING_INTENT
          );
        }
      } catch (error) {
        this.logger.error(
          `Fallback capture of initial payment failed for request ${requestId}: ${error.message}`
        );
        throw new BadRequestException(
          PAYMENTS_MESSAGES.ERROR.CANNOT_CAPTURE_95_BEFORE_5
        );
      }
    }

    try {
      const paymentIntent = await this.stripeService.getPaymentIntent(
        remainingStage.intentId
      );

      // Handle already-captured PaymentIntent (e.g., from duplicate request or race condition)
      if (paymentIntent.status === STRIPE_STATUS.SUCCEEDED) {
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.PAYMENT_95_PERCENT_ALREADY_CAPTURED_STRIPE(
            requestId
          )
        );

        // Ensure DB is updated to reflect the captured state
        if (!remainingStage.capturedAt) {
          await this.financesService.updatePaymentStage(remainingStage.id, {
            status: PAYMENT_STATUS.CAPTURED,
            capturedAt: toUTC(),
            chargeAmount: convertToDollars(
              paymentIntent.amount_received || paymentIntent.amount || 0
            ).toString(),
          });
          await this.financesService.updateTransactionTotals(transactionId);
        }

        return {
          success: true,
          amountCapturedCents:
            paymentIntent.amount_received || paymentIntent.amount || 0,
          paymentIntentId: remainingStage.intentId,
        };
      }

      const validation = validatePaymentIntentForCapture(paymentIntent);

      if (!validation.isValid) {
        this.logger.error(
          PAYMENTS_MESSAGES.ERROR.CANNOT_CAPTURE_REMAINING(
            requestId,
            validation.reason
          )
        );
        await this.financesService.updatePaymentStage(remainingStage.id, {
          status: PAYMENT_STATUS.FAILED,
        });
        await this.financesService.updateIntroductionTransaction(
          transactionId,
          {
            paymentError: validation.reason,
          }
        );
        return {
          success: false,
          amountCapturedCents: 0,
          paymentIntentId: remainingStage.intentId,
          error: validation.reason,
        };
      }

      const capturedIntent = await this.stripeService.capturePaymentIntent(
        remainingStage.intentId
      );

      const updateData: Partial<schema.PaymentStage> = {
        status: PAYMENT_STATUS.CAPTURED,
        capturedAt: toUTC(),
        chargeAmount: convertToDollars(
          capturedIntent.amount_received || 0
        ).toString(),
      };

      const latestCharge = capturedIntent.latest_charge;
      if (
        latestCharge &&
        typeof latestCharge === "object" &&
        "receipt_url" in latestCharge
      ) {
        updateData.receiptUrl = latestCharge.receipt_url as string;
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.RECEIPT_URL_CAPTURED_95(
            requestId,
            latestCharge.receipt_url as string
          )
        );
      }

      await this.financesService.updatePaymentStage(
        remainingStage.id,
        updateData
      );
      await this.financesService.updateTransactionTotals(transactionId);

      this.logger.log(
        PAYMENTS_MESSAGES.LOG.REMAINING_PAYMENT_CAPTURED(
          requestId,
          capturedIntent.amount_received
        )
      );

      return {
        success: true,
        amountCapturedCents: capturedIntent.amount_received || 0,
        paymentIntentId: remainingStage.intentId,
      };
    } catch (error: unknown) {
      const errorMessage = extractStripeErrorMessage(error);

      // Handle race condition: if another process already captured, treat as success
      const stripeError = error as { code?: string } | null;
      if (
        errorMessage.includes("already been captured") ||
        errorMessage.includes("already captured") ||
        stripeError?.code === "payment_intent_unexpected_state"
      ) {
        this.logger.log(
          PAYMENTS_MESSAGES.LOG.PAYMENT_95_PERCENT_ALREADY_CAPTURED_RACE(
            requestId
          )
        );

        // Ensure DB is updated to reflect the captured state
        if (!remainingStage.capturedAt) {
          await this.financesService.updatePaymentStage(remainingStage.id, {
            status: PAYMENT_STATUS.CAPTURED,
            capturedAt: toUTC(),
            chargeAmount: remainingStage.amount,
          });
          await this.financesService.updateTransactionTotals(transactionId);
        }

        return {
          success: true,
          amountCapturedCents: convertToCents(remainingStage.amount || 0),
          paymentIntentId: remainingStage.intentId,
        };
      }

      this.logger.error(
        PAYMENTS_MESSAGES.LOG.FAILED_CAPTURE_REMAINING(requestId, errorMessage)
      );

      await this.financesService.updatePaymentStage(remainingStage.id, {
        status: PAYMENT_STATUS.FAILED,
      });
      await this.financesService.updateIntroductionTransaction(transactionId, {
        paymentError: errorMessage,
      });

      return {
        success: false,
        amountCapturedCents: 0,
        paymentIntentId: remainingStage.intentId || "",
        error: errorMessage,
      };
    }
  }

  /**
   * Gets the current trust score for a user.
   * Fetches the trust score from the profiles table.
   */
  async getConnectorTrustScore(userId: string): Promise<number | null> {
    try {
      const profile = await this.profilesService.getProfileById(userId);

      return profile?.trustScore ?? null;
    } catch (error) {
      this.logger.error(
        PAYMENTS_MESSAGES.LOG.FAILED_GET_TRUST_SCORE(userId, error.message)
      );
      return null;
    }
  }

  /**
   * Determines if a connector is eligible for immediate payout based on trust score.
   */
  async isEligibleForImmediatePayout(connectorId: string): Promise<boolean> {
    const trustScore = await this.getConnectorTrustScore(connectorId);
    if (trustScore === null) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.NO_TRUST_SCORE_DEFAULTING(connectorId)
      );
      return false;
    }
    return trustScore >= TRUST_SCORE_THRESHOLD;
  }

  /**
   * Processes connector payout after meeting completion.
   * Uses trust score to determine immediate vs deferred payout.
   * Splits the captured amount 80% connector / 20% platform.
   */
  async processConnectorPayout(
    userId: string,
    requestId: string
  ): Promise<PayoutResult> {
    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new NotFoundException("Introduction request not found");
    }

    if (
      requestData.requesterId !== userId &&
      requestData.contactOwnerId !== userId
    ) {
      // Check potential connector
      const entry =
        await this.potentialConnectorsService.getEntryByRequestAndConnector(
          requestId,
          userId
        );
      if (!entry) {
        throw new UnauthorizedException(
          PAYMENTS_MESSAGES.ERROR.UNAUTHORIZED_REQUEST
        );
      }
    }
    const request = requestData as AnyType;

    if (!request.contactOwnerId) {
      throw new BadRequestException(PAYMENTS_MESSAGES.ERROR.NO_CONNECTOR_FOUND);
    }

    if (request.payoutReleased) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.PAYOUT_ALREADY_PROCESSED(requestId)
      );
      return {
        success: true,
        connectorAmountCents: convertToCents(
          request.connectorPayoutAmount || 0
        ),
        platformAmountCents: convertToCents(
          request.platformCommissionAmount || 0
        ),
        outboundPaymentId: request.stripeOutboundPaymentId || undefined,
        payoutTriggeredBy:
          (request.payoutTriggeredBy as "trust_score" | "peer_feedback") ||
          "trust_score",
        connectorTrustScore: request.connectorTrustScoreAtPayout || undefined,
      };
    }

    if (!request.initialChargeCaptured || !request.remainingChargeCaptured) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.ALL_PAYMENTS_MUST_BE_CAPTURED
      );
    }

    const connector = await this.profilesService.getProfileById(
      request.contactOwnerId
    );
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      // Update payout_history table (payoutStatus is stored there, not in transactions)
      await this.financesService.upsertPayoutHistory(
        requestId,
        request.contactOwnerId,
        {
          status: PAYOUT_STATUS.FAILED,
          errorMessage:
            PAYMENTS_MESSAGES.ERROR.STRIPE_CONNECT_NOT_FOUND_FOR_CONNECTOR,
        }
      );
      return {
        success: false,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        payoutTriggeredBy: "trust_score",
        error: PAYMENTS_MESSAGES.ERROR.STRIPE_CONNECT_NOT_FOUND_FOR_CONNECTOR,
      };
    }

    const trustScore = await this.getConnectorTrustScore(
      request.contactOwnerId
    );
    const isImmediatePayout =
      trustScore !== null && trustScore >= TRUST_SCORE_THRESHOLD;

    if (!isImmediatePayout) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.DEFERRING_PAYOUT(
          request.contactOwnerId,
          trustScore,
          TRUST_SCORE_THRESHOLD
        )
      );

      const totalCapturedCents = convertToCents(request.bountyAmount);
      const payoutSplit = calculatePayoutSplit(totalCapturedCents);

      await this.financesService.upsertPayoutHistory(
        requestId,
        request.contactOwnerId,
        {
          grossAmount: convertToDollars(totalCapturedCents).toString(),
          platformCommissionAmount: convertToDollars(
            payoutSplit.platformAmountCents
          ).toString(),
          netAmount: convertToDollars(
            payoutSplit.connectorAmountCents
          ).toString(),
          payoutEligible: true,
          status: PAYOUT_STATUS.PENDING,
          trustScoreAtPayout: trustScore,
          recipientAccountId: connector.stripeRecipientAccountId,
          destinationCurrency: connector.payoutCurrency,
        }
      );
      return {
        success: false,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        payoutTriggeredBy: "peer_feedback",
        connectorTrustScore: trustScore || undefined,
        error: PAYMENTS_MESSAGES.ERROR.PAYOUT_DEFERRED(
          trustScore,
          TRUST_SCORE_THRESHOLD
        ),
      };
    }

    return this.executeConnectorPayout(
      requestId,
      request,
      connector,
      PAYOUT_TRIGGER.TRUST_SCORE,
      trustScore
    );
  }

  /**
   * Processes payout after connector submits peer feedback (for deferred payouts).
   */
  async processFeedbackTriggeredPayout(
    userId: string,
    requestId: string
  ): Promise<PayoutResult> {
    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new NotFoundException("Introduction request not found");
    }
    const request = requestData as AnyType;

    if (request.payoutReleased) {
      this.logger.log(
        PAYMENTS_MESSAGES.LOG.PAYOUT_ALREADY_PROCESSED(requestId)
      );
      return {
        success: true,
        connectorAmountCents: convertToCents(
          request.connectorPayoutAmount || 0
        ),
        platformAmountCents: convertToCents(
          request.platformCommissionAmount || 0
        ),
        outboundPaymentId: request.stripeOutboundPaymentId || undefined,
        payoutTriggeredBy: "peer_feedback",
      };
    }

    if (!request.payoutEligible) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_ELIGIBLE_PAYOUT
      );
    }

    if (!request.connectorFeedbackSubmitted) {
      throw new BadRequestException(
        PAYMENTS_MESSAGES.ERROR.CONNECTOR_MUST_SUBMIT_FEEDBACK
      );
    }

    if (!request.contactOwnerId) {
      throw new BadRequestException(PAYMENTS_MESSAGES.ERROR.NO_CONNECTOR_FOUND);
    }

    const connector = await this.profilesService.getProfileById(
      request.contactOwnerId
    );
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      return {
        success: false,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        payoutTriggeredBy: "peer_feedback",
        error: PAYMENTS_MESSAGES.ERROR.STRIPE_CONNECT_NOT_FOUND_FOR_CONNECTOR,
      };
    }

    const trustScore =
      request.connectorTrustScoreAtPayout ||
      (await this.getConnectorTrustScore(request.contactOwnerId));

    return this.executeConnectorPayout(
      requestId,
      request,
      connector,
      PAYOUT_TRIGGER.PEER_FEEDBACK,
      trustScore
    );
  }

  /**
   * Internal method to execute the actual payout transfer.
   */
  private async executeConnectorPayout(
    requestId: string,
    request: IntroductionRequestForPayout,
    connector: ConnectorForPayout,
    triggeredBy: "trust_score" | "peer_feedback",
    trustScore: number | null
  ): Promise<PayoutResult> {
    // CRITICAL IDEMPOTENCY CHECK: Re-fetch payout history to ensure fresh state (prevents race conditions)
    const existingPayout =
      await this.financesService.getPayoutHistoryByRequestId(requestId);
    if (
      existingPayout?.payoutReleased ||
      existingPayout?.stripeOutboundPaymentId
    ) {
      this.logger.log(PAYMENTS_MESSAGES.LOG.PAYOUT_ALREADY_RELEASED(requestId));
      return {
        success: true,
        connectorAmountCents: convertToCents(existingPayout.netAmount || 0),
        platformAmountCents: convertToCents(
          existingPayout.platformCommissionAmount || 0
        ),
        outboundPaymentId: existingPayout.stripeOutboundPaymentId || undefined,
        payoutTriggeredBy:
          (existingPayout.payoutTriggeredBy as
            | "trust_score"
            | "peer_feedback") || triggeredBy,
        connectorTrustScore:
          existingPayout.trustScoreAtPayout || trustScore || undefined,
      };
    }

    const totalCapturedCents = convertToCents(request.bountyAmount);
    const payoutSplit = calculatePayoutSplit(totalCapturedCents);

    this.logger.log(
      PAYMENTS_MESSAGES.LOG.PROCESSING_PAYOUT(
        triggeredBy,
        requestId,
        payoutSplit.connectorAmountCents,
        payoutSplit.platformAmountCents
      )
    );

    try {
      await this.financesService.upsertPayoutHistory(
        requestId,
        request.contactOwnerId,
        {
          status: PAYOUT_STATUS.PROCESSING,
          grossAmount: convertToDollars(totalCapturedCents).toString(),
          platformCommissionAmount: convertToDollars(
            payoutSplit.platformAmountCents
          ).toString(),
          netAmount: convertToDollars(
            payoutSplit.connectorAmountCents
          ).toString(),
          recipientAccountId: connector.stripeRecipientAccountId,
          destinationCurrency: connector.payoutCurrency,
        }
      );

      // Deduct Stripe payout fees from the connector's amount (per country).
      const payoutFees = calculatePayoutFees(
        payoutSplit.connectorAmountCents,
        connector.country
      );
      if (payoutFees.feesExceedPayout) {
        this.logger.error(
          `Payout fees (${payoutFees.totalFeeCents}c) exceed payout (${payoutSplit.connectorAmountCents}c) for request ${requestId} — manual review required`
        );
        await this.financesService.upsertPayoutHistory(
          requestId,
          request.contactOwnerId,
          {
            status: PAYOUT_STATUS.FAILED,
            errorMessage: "fees_exceed_payout — manual review required",
          }
        );
        return {
          success: false,
          connectorAmountCents: 0,
          platformAmountCents: 0,
          payoutTriggeredBy: triggeredBy,
          connectorTrustScore: trustScore || undefined,
          error: "fees_exceed_payout",
        };
      }

      // Global Payouts OutboundPayment: a single call moves funds from the
      // platform USD balance to the connector's local bank account (Stripe
      // handles the currency conversion). Settles asynchronously.
      const outbound = await this.stripePayoutsService.createOutboundPayment({
        amountCents: payoutFees.netCents,
        recipientAccountId: connector.stripeRecipientAccountId,
        payoutMethodId: connector.stripePayoutMethodId,
        idempotencyKey: `intro_payout_${requestId}`,
        description: `Referral payout for introduction ${requestId}`,
        metadata: {
          requestId,
          connectorId: connector.id,
          payoutTriggeredBy: triggeredBy,
          platformCommission: payoutSplit.platformAmountCents.toString(),
        },
      });

      this.logger.log(
        PAYMENTS_MESSAGES.LOG.TRANSFER_COMPLETED(requestId, outbound.id)
      );

      await this.financesService.upsertPayoutHistory(
        requestId,
        request.contactOwnerId,
        {
          status: PAYOUT_STATUS.COMPLETED,
          payoutReleased: true,
          payoutReleasedAt: toUTC(),
          stripeOutboundPaymentId: outbound.id,
          recipientAccountId: connector.stripeRecipientAccountId,
          destinationCurrency: connector.payoutCurrency,
          completedAt: toUTC(),
          payoutTriggeredBy: triggeredBy,
          trustScoreAtPayout: trustScore,
          grossAmount: convertToDollars(totalCapturedCents).toString(),
          platformCommissionAmount: convertToDollars(
            payoutSplit.platformAmountCents
          ).toString(),
          netAmount: convertToDollars(
            payoutSplit.connectorAmountCents
          ).toString(),
          recipientReceivedAmount: convertToDollars(
            payoutFees.netCents
          ).toString(),
          payoutFeeBreakdown: payoutFees,
        }
      );

      this.logger.log(
        PAYMENTS_MESSAGES.LOG.PAYOUT_COMPLETED(
          requestId,
          outbound.id,
          ` (outbound payment ${outbound.id})`
        )
      );

      return {
        success: true,
        connectorAmountCents: payoutSplit.connectorAmountCents,
        platformAmountCents: payoutSplit.platformAmountCents,
        outboundPaymentId: outbound.id,
        payoutTriggeredBy: triggeredBy,
        connectorTrustScore: trustScore || undefined,
      };
    } catch (error) {
      const errorMessage = extractStripeErrorMessage(error);
      this.logger.error(
        PAYMENTS_MESSAGES.LOG.FAILED_PROCESS_PAYOUT(requestId, errorMessage)
      );

      await this.financesService.upsertPayoutHistory(
        requestId,
        request.contactOwnerId,
        {
          status: PAYOUT_STATUS.FAILED,
          errorMessage,
          payoutTriggeredBy: triggeredBy,
          trustScoreAtPayout: trustScore,
          grossAmount: convertToDollars(totalCapturedCents).toString(),
          platformCommissionAmount: convertToDollars(
            calculatePayoutSplit(totalCapturedCents).platformAmountCents
          ).toString(),
          netAmount: convertToDollars(
            calculatePayoutSplit(totalCapturedCents).connectorAmountCents
          ).toString(),
        }
      );

      return {
        success: false,
        connectorAmountCents: 0,
        platformAmountCents: 0,
        payoutTriggeredBy: triggeredBy,
        connectorTrustScore: trustScore || undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Cancels both PaymentIntents for a request (used when request is declined/cancelled).
   */
  async cancelDualPaymentIntents(
    userId: string,
    requestId: string
  ): Promise<void> {
    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new NotFoundException("Introduction request not found");
    }

    const transaction =
      await this.financesService.getIntroductionTransactionByRequestId(
        requestId
      );
    if (!transaction) {
      return; // No transaction to cancel
    }

    const transactionId = transaction.id as string;
    const paymentStages =
      await this.financesService.getPaymentStagesByTransactionId(transactionId);

    const errors: string[] = [];

    for (const stage of paymentStages) {
      if (!stage.capturedAt) {
        try {
          await this.stripeService.cancelPaymentIntent(stage.intentId);
          this.logger.log(
            `Cancelled payment intent for stage ${stage.stageName} (${stage.intentId})`
          );
          await this.financesService.updatePaymentStage(stage.id, {
            status: PAYMENT_STATUS.CANCELED,
          });
        } catch (error) {
          errors.push(
            `${stage.stageName}: ${extractStripeErrorMessage(error)}`
          );
        }
      }
    }

    await this.financesService.updateIntroductionTransaction(transactionId, {
      overallStatus: PAYMENT_STATUS.CANCELED,
    });
    await this.financesService.updateTransactionTotals(transactionId);

    if (errors.length > 0) {
      this.logger.warn(
        PAYMENTS_MESSAGES.LOG.FAILED_CANCEL_INTENTS(
          requestId,
          errors.join(", ")
        )
      );
    }
  }

  async createPaymentIntent(userId: string, requestId: string, amount: number) {
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile?.stripeCustomerId) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.STRIPE_CUSTOMER_NOT_FOUND);
    }

    const requestData = await this.getIntroductionRequest(requestId);
    if (!requestData) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
    const request = requestData as AnyType;

    if (request.requesterId !== userId) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.UNAUTHORIZED);
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      "usd",
      profile.stripeCustomerId,
      {
        requestId,
        userId,
        type: "introduction_bounty",
      }
    );

    // Note: This method appears to be legacy - payment intents are now stored in payment_stages
    // If this method is still needed, it should create payment stages instead
    await this.financesService.upsertIntroductionTransaction(requestId, {
      overallStatus: PAYMENT_STATUS.PENDING,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async capturePayment(userId: string, requestId: string, amount?: number) {
    const requestData = await this.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    if (
      requestData.requesterId !== userId &&
      requestData.acceptedBy !== userId
    ) {
      try {
        const entry =
          await this.potentialConnectorsService.getEntryByRequestAndConnector(
            requestId,
            userId
          );
        if (!entry) throw new Error();
      } catch (e) {
        throw new Error(
          PAYMENTS_MESSAGES.ERROR.UNAUTHORIZED || `Unauthorized: ${e}`
        );
      }
    }
    if (!requestData) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
    const request = requestData as AnyType;

    if (!request.paymentIntentId) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.NO_PAYMENT_INTENT);
    }

    const paymentIntent = await this.stripeService.capturePaymentIntent(
      request.paymentIntentId,
      amount
    );

    await this.financesService.updateIntroductionTransactionByRequestId(
      requestId,
      {
        overallStatus: PAYMENT_STATUS.CAPTURED,
      }
    );

    return {
      paymentIntent,
      message: PAYMENTS_MESSAGES.INFO.PAYMENT_CAPTURED,
    };
  }

  async processPayout(userId: string, requestId: string) {
    const requestData = await this.getIntroductionRequest(requestId);

    if (!requestData) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }

    if (
      requestData.requesterId !== userId &&
      requestData.acceptedBy !== userId
    ) {
      try {
        const entry =
          await this.potentialConnectorsService.getEntryByRequestAndConnector(
            requestId,
            userId
          );
        if (!entry) throw new Error();
      } catch (e) {
        throw new Error(
          PAYMENTS_MESSAGES.ERROR.UNAUTHORIZED || `Unauthorized: ${e}`
        );
      }
    }
    if (!requestData) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
    const request = requestData as AnyType;

    if (!request.contactOwnerId) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.CONTACT_OWNER_NOT_FOUND);
    }

    const connector = await this.profilesService.getProfileById(
      request.contactOwnerId
    );
    if (
      !connector?.stripeRecipientAccountId ||
      !connector?.stripeRecipientOnboardingComplete
    ) {
      throw new Error(PAYMENTS_MESSAGES.ERROR.STRIPE_CONNECT_ACCOUNT_NOT_FOUND);
    }

    const payoutAmount = request.bountyAmount
      ? Number(request.bountyAmount) * 100
      : 0;

    // Deduct Stripe payout fees from the connector's amount (per country).
    const payoutFees = calculatePayoutFees(payoutAmount, connector.country);
    if (payoutFees.feesExceedPayout) {
      await this.financesService.updatePayoutHistoryByRequestId(requestId, {
        status: "failed",
        errorMessage: "fees_exceed_payout — manual review required",
      });
      throw new Error("fees_exceed_payout");
    }

    const outbound = await this.stripePayoutsService.createOutboundPayment({
      amountCents: payoutFees.netCents,
      recipientAccountId: connector.stripeRecipientAccountId,
      payoutMethodId: connector.stripePayoutMethodId,
      idempotencyKey: `intro_payout_${requestId}`,
      description: `Referral payout for introduction ${requestId}`,
      metadata: {
        requestId,
        connectorId: connector.id,
      },
    });

    // Update payout_history table (payoutStatus is stored there, not in transactions)
    await this.financesService.updatePayoutHistoryByRequestId(requestId, {
      status: "completed",
      payoutReleased: true,
      payoutReleasedAt: toUTC(),
      stripeOutboundPaymentId: outbound.id,
      recipientAccountId: connector.stripeRecipientAccountId,
      destinationCurrency: connector.payoutCurrency,
      recipientReceivedAmount: convertToDollars(payoutFees.netCents).toString(),
      payoutFeeBreakdown: payoutFees,
    });

    return { outbound, message: PAYMENTS_MESSAGES.INFO.PAYOUT_PROCESSED };
  }
}
