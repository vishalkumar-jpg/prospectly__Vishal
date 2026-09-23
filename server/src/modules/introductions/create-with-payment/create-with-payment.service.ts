import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { ContactsService } from "modules/contacts/contacts.service";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { IntroductionPrivacyService } from "modules/introduction-potential-connectors/introduction-privacy.service";
import { PaymentsService } from "modules/payments/payments.service";
import { StripeService } from "modules/stripe/stripe.service";
import { FinancesService } from "modules/finances/finances.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "database/schema";
import { feesFromBounty } from "utils/introduction-request-fees.util";
import { CreateIntroductionWithPaymentDto } from "./create-with-payment.dto";
import { IntroductionsService } from "../introductions.service";
import { FeedbackService } from "../feedback/feedback.service";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
  PAYMENT_STATUS,
} from "../introductions.constants";
import { CreateIntroductionDto } from "../introductions.dto";
import { IntroductionNotificationsDispatchService } from "../notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../notifications/introduction-notifications.constants";

@Injectable()
export class CreateWithPaymentService {
  private readonly logger = new Logger(CreateWithPaymentService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly stripeService: StripeService,
    private readonly contactsService: ContactsService,
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService,
    private readonly introductionPrivacyService: IntroductionPrivacyService,
    private readonly paymentsService: PaymentsService,
    private readonly financesService: FinancesService,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    @Inject(FeedbackService)
    private readonly feedbackService: FeedbackService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  async createIntroductionWithPayment(
    userId: string,
    createDto: CreateIntroductionWithPaymentDto
  ) {
    // Validate that either contactOwnerId or contactId is provided
    // If contactId is provided, we can get connectors from contact_relationships
    if (!createDto.contactOwnerId && !createDto.contactId) {
      throw new BadRequestException(
        INTRODUCTIONS_MESSAGES.ERROR.CONTACT_OWNER_OR_ID_REQUIRED
      );
    }

    // Prevent requesting an introduction to your own contact (fail fast)
    if (createDto.contactId) {
      const isOwnContact = await this.checkContactOwnership(
        userId,
        parseInt(createDto.contactId)
      );
      if (isOwnContact) {
        throw new BadRequestException(
          INTRODUCTIONS_MESSAGES.ERROR.CANNOT_REQUEST_OWN_CONTACT
        );
      }
    }

    // Get requester profile to get Stripe customer ID and payment method
    const requesterProfile = await this.profilesService.getProfileById(userId);
    if (!requesterProfile) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUESTER_PROFILE_NOT_FOUND
      );
    }

    // Validate user has a payment method set up
    if (!requesterProfile.stripePrimaryPaymentMethodId) {
      throw new BadRequestException(
        INTRODUCTIONS_MESSAGES.ERROR.NO_PAYMENT_METHOD
      );
    }

    // Get or create Stripe customer ID
    let customerId = requesterProfile.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(
        requesterProfile.email || "",
        requesterProfile.fullName || ""
      );
      customerId = customer.id;
      await this.introductionsService.updateProfile(userId, {
        stripeCustomerId: customerId,
      } as AnyType);
    }

    // Validate bounty amount against contact's minimum bounty requirement
    // Also determine contactId and ensure we have connectors
    let contactId: number | null = null;
    let contactOwnerId: string | null = createDto.contactOwnerId || null;

    if (createDto.contactId) {
      contactId = parseInt(createDto.contactId);

      const contact =
        await this.contactsService.getContactByIdMinimal(contactId);
      if (!contact) {
        this.logger.warn(
          INTRODUCTIONS_MESSAGES.LOG.CONTACT_NOT_FOUND(contactId)
        );
        throw new BadRequestException(
          INTRODUCTIONS_MESSAGES.ERROR.CONTACT_NOT_FOUND_ID(contactId)
        );
      }

      // Validate contact has an email (required for introduction flow)
      if (!contact.email || contact.email.trim() === "") {
        throw new BadRequestException(
          INTRODUCTIONS_MESSAGES.ERROR.CONTACT_EMAIL_NOT_FOUND
        );
      }

      // If no contactOwnerId provided, try to get one from contact_relationships
      // or fall back to originalImporterId
      if (!contactOwnerId) {
        const connectorIds =
          await this.potentialConnectorsService.getConnectorIdsForContact(
            contactId
          );
        this.logger.log(
          `Found ${connectorIds.length} connectors for contact ${contactId}: ${connectorIds.join(", ")}`
        );

        if (connectorIds.length > 0) {
          // Use the first connector as the initial contactOwnerId
          [contactOwnerId] = connectorIds;
          this.logger.log(
            `Using first connector ${contactOwnerId} as contactOwnerId`
          );
        } else if (contact.originalImporterId) {
          // Fall back to original importer
          contactOwnerId = contact.originalImporterId;
          this.logger.log(
            `No connectors found, falling back to originalImporterId: ${contactOwnerId}`
          );
        } else {
          this.logger.warn(
            `Contact ${contactId} has no connectors and no originalImporterId`
          );
        }
      }
    }

    const requesterFees = feesFromBounty(createDto.bountyAmount);
    // Create the introduction request first
    // Note: contactOwnerId is set to the provided/determined value initially, but will be updated
    // when a connector accepts the request
    const now = toUTC();

    const request = await this.db.transaction(async (tx) => {
      const [createdRequest] = await tx
        .insert(schema.introductionRequests)
        .values({
          contactName: createDto.contactName,
          bountyAmount: createDto.bountyAmount.toFixed(2),
          meetingDescription: createDto.meetingDescription,
          additionalContext: createDto.additionalContext || null,
          meetingTitle: createDto.meetingTitle || null,
          contactId,
          isUrgent: createDto.isUrgent || false,
          requesterId: userId,
          status: IntroductionStatus.PENDING,
        })
        .returning();

      await tx.insert(schema.introductionRequestPricesSchema).values({
        introductionRequestId: createdRequest.id,
        bountyAmount: createDto.bountyAmount.toFixed(2),
        providerFee: requesterFees.providerFeeDollars.toFixed(2),
        processingFee: requesterFees.processingFeeDollars.toFixed(2),
        totalAmount: requesterFees.totalDollars.toFixed(2),
        currency: "USD",
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      return createdRequest;
    });

    // Create potential connector entries from contact_relationships
    // This allows multiple connectors to see and respond to the request
    // Apply privacy filtering using only the selected privacy rule IDs from frontend
    if (contactId) {
      try {
        // Create potential connector entries with privacy filtering
        // The connector service will internally fetch privacy rules by IDs and apply filtering
        const result =
          await this.potentialConnectorsService.createPotentialConnectorEntries(
            request.id,
            contactId,
            userId, // Pass requesterId for privacy filtering
            createDto.selectedPrivacyRuleIds // Pass selected privacy rule IDs (connector service will fetch internally)
          );

        const { privacyRules, entries } = result;

        // Create privacy history if rules exist (only selected rules are stored)
        if (privacyRules.length > 0) {
          await this.introductionPrivacyService.createPrivacyHistory(
            request.id,
            privacyRules
          );
        }

        if (entries.length > 0) {
          void this.introductionNotificationsDispatch.dispatch({
            requestId: request.id,
            type: INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED,
            notificationCycle: 0,
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to create potential connector entries for request ${request.id}: ${error.message}`
        );
        // Don't fail the request creation if potential connector entries fail
        // The contactOwnerId fallback ensures at least one connector is notified
      }
    }

    // Create dual PaymentIntents (5% + 95%) using the PaymentsService
    try {
      this.logger.log(
        `Creating dual PaymentIntents for introduction request ${request.id}`
      );

      const dualPaymentResult =
        await this.paymentsService.createDualPaymentIntentsForRequest({
          requestId: request.id,
          userId,
          bountyAmountDollars: createDto.bountyAmount,
          paymentMethodId: requesterProfile.stripePrimaryPaymentMethodId,
        });

      this.logger.log(
        `Dual PaymentIntents created successfully: initial=${dualPaymentResult.initialPaymentIntent.id}, remaining=${dualPaymentResult.remainingPaymentIntent.id}`
      );

      // Return minimal success response - popup only needs to know if request was created successfully
      return {
        success: true,
        requestId: request.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create dual PaymentIntents for request ${request.id}: ${error.message}`
      );
      // If payment fails, update the transaction status atomically using a database transaction
      // This ensures all updates succeed or fail together, preventing inconsistent state
      const transaction =
        await this.financesService.getIntroductionTransactionByRequestId(
          request.id
        );
      if (transaction) {
        const transactionId = transaction.id as string;
        try {
          await this.db.transaction(async (tx) => {
            // Update the introduction transaction status
            await tx
              .update(schema.introductionTransactions)
              .set({
                overallStatus: PAYMENT_STATUS.FAILED,
                paymentError: error.message,
                updatedAt: toUTC(),
              })
              .where(eq(schema.introductionTransactions.id, transactionId));

            // Update all payment stages that were created
            await tx
              .update(schema.paymentStages)
              .set({
                status: PAYMENT_STATUS.FAILED,
                updatedAt: toUTC(),
              })
              .where(eq(schema.paymentStages.transactionId, transactionId));
          });
          this.logger.log(
            `Successfully updated transaction ${transactionId} and payment stages to FAILED status`
          );
        } catch (txError) {
          this.logger.error(
            `Failed to update transaction ${transactionId} status in error handler: ${txError.message}`
          );
          // Don't throw here - we want to throw the original payment error, not the transaction update error
        }
      }
      throw error;
    }
  }

  async createIntroductionRequest(
    userId: string,
    createDto: CreateIntroductionDto
  ) {
    const [request] = await this.db
      .insert(schema.introductionRequests)
      .values({
        ...createDto,
        requesterId: userId,
        status: IntroductionStatus.PENDING,
      } as AnyType)
      .returning();

    return request;
  }

  /**
   * Check if a requester can create a new introduction request
   * Combines active count check with limit validation from profile
   * @param userId - The requester's user ID
   * @returns Object with canCreate flag, current count, and limit if allowed
   * @throws ForbiddenException if limit is reached
   */
  async canCreateRequest(
    userId: string
  ): Promise<{ canCreate: true; current: number; limit: number }> {
    const current = await this.introductionsService.getActiveCount(userId);
    const profile = await this.profilesService.getProfileById(userId);
    const limit = profile?.maxConcurrentRequests || 1;

    if (current >= limit) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ACTIVE_REQUEST_LIMIT_REACHED
      );
    }

    return { canCreate: true, current, limit };
  }

  async checkContactOwnership(
    userId: string,
    contactId: number
  ): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: schema.contactRelationships.id })
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          eq(schema.contactRelationships.contactId, contactId)
        )
      )
      .limit(1);
    return !!existing;
  }

  async canCreateRequestWithFeedbackCheck(userId: string): Promise<boolean> {
    const pendingFeedback =
      await this.feedbackService.checkPendingFeedback(userId);
    const pendingCount = pendingFeedback[0]?.pending_count || 0;

    if (pendingCount > 0) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.PENDING_FEEDBACK_REQUIRED
      );
    }

    return true;
  }
}
