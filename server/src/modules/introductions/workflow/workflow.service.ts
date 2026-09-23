import {
  ForbiddenException,
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { PaymentReauthorizationService } from "modules/payments/payment-reauthorization.service";
import { INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES } from "modules/introduction-potential-connectors/introduction-potential-connectors.constants";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DeclineRequestDto } from "modules/introduction-potential-connectors/introduction-potential-connectors.dto";
import { AcceptIntroductionRequestDto } from "./workflow.dto";
import { INTRODUCTIONS_MESSAGES } from "../introductions.constants";
import { IntroductionsService } from "../introductions.service";
import { IntroductionStatus } from "../introductions.constants";

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService,
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService,
    private readonly paymentReauthorizationService: PaymentReauthorizationService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Validate that the connector has a pending entry for this request
   * @throws ForbiddenException if entry doesn't exist or status is not pending
   */
  private async validateConnectorEntry(
    requestId: string,
    userId: string
  ): Promise<void> {
    const entry =
      await this.potentialConnectorsService.getEntryByRequestAndConnector(
        requestId,
        userId
      );

    if (!entry || entry.status !== "pending") {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ALREADY_ACCEPTED
      );
    }
  }

  /**
   * Validate that the introduction request exists and is in pending status
   * @returns The request object if valid
   * @throws ForbiddenException if request doesn't exist or status is not pending
   */
  private async validateRequestStatus(
    requestId: string
  ): Promise<schema.IntroductionRequest> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
    });

    if (!request || request.status !== IntroductionStatus.PENDING) {
      throw new ForbiddenException(
        INTRODUCTIONS_MESSAGES.ERROR.ALREADY_ACCEPTED
      );
    }

    return request;
  }

  /**
   * Validate that the connector's bounty is less than or equal to the requester's bounty
   * @throws BadRequestException if connector's bounty exceeds requester's bounty
   */
  private async validateBountyAmount(
    request: schema.IntroductionRequest,
    userId: string
  ): Promise<void> {
    if (!request.contactId) {
      // If no contactId, skip bounty validation
      return;
    }

    const requesterBounty = request.bountyAmount
      ? Number(request.bountyAmount)
      : 0;

    const connectorRelationship =
      await this.db.query.contactRelationships.findFirst({
        where: and(
          eq(schema.contactRelationships.contactId, request.contactId),
          eq(schema.contactRelationships.userId, userId)
        ),
      });

    const connectorBounty = connectorRelationship?.bountyAmount
      ? Number(connectorRelationship.bountyAmount)
      : 0;

    // If bounty validation fails, throw specific error
    if (connectorBounty > requesterBounty) {
      throw new BadRequestException(
        INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.BOUNTY_EXCEEDS_REQUESTER(
          connectorBounty.toFixed(2),
          requesterBounty.toFixed(2)
        )
      );
    }
  }

  /**
   * Accept an introduction request after validating all conditions
   * Validates: connector entry status, request status, and bounty amount
   */
  async acceptIntroductionRequest(
    userId: string,
    requestId: string,
    responseData: AcceptIntroductionRequestDto
  ): Promise<void> {
    // Step 1: Validate connector entry status
    await this.validateConnectorEntry(requestId, userId);

    // Step 2: Validate request status
    const request = await this.validateRequestStatus(requestId);

    // Step 3: Validate bounty amount
    await this.validateBountyAmount(request, userId);

    // Step 4: Block accept until requester re-publishes and re-authorizes payment
    if (request.needsRepublish) {
      throw new BadRequestException(
        "Payment must be re-authorized before a connector can accept. The requester must re-publish this request first."
      );
    }

    const needsPaymentReauth =
      await this.paymentReauthorizationService.needsReauthorizationForRequest(
        requestId
      );
    if (needsPaymentReauth) {
      throw new BadRequestException(
        "Payment must be re-authorized before a connector can accept. The requester must re-publish this request first."
      );
    }

    // Step 5: All validations passed, proceed with acceptance
    await this.potentialConnectorsService.acceptRequest(requestId, userId, {
      responderMessage: responseData?.responderMessage,
    });
  }

  /**
   * Decline an introduction request after validating connector entry
   * Validates: connector entry exists and is pending
   */
  async declineIntroductionRequest(
    userId: string,
    requestId: string,
    declineData: DeclineRequestDto
  ): Promise<void> {
    // Step 1: Validate connector entry status
    await this.validateConnectorEntry(requestId, userId);

    // Step 2: All validations passed, proceed with decline
    await this.potentialConnectorsService.declineRequest(
      requestId,
      userId,
      declineData.declineReason,
      declineData.declineMessage
    );
  }

  /**
   * Validate that the user is the requester (owner) of the introduction request
   * @throws ForbiddenException if user is not the requester
   */
  private validateRequesterOwnership(
    userId: string,
    request: { requesterId: string | null }
  ): void {
    if (request.requesterId !== userId) {
      throw new ForbiddenException(
        "You are not authorized to perform this action. Only the requester can move this request to the marketplace."
      );
    }
  }

  /**
   * Get the introduction request by ID with only required columns for ownership validation
   * @throws NotFoundException if request doesn't exist
   */
  async getIntroductionRequest(
    requestId: string
  ): Promise<{ id: string; requesterId: string | null }> {
    const result = await this.db
      .select({
        id: schema.introductionRequests.id,
        requesterId: schema.introductionRequests.requesterId,
      })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    const request = result[0];

    if (!request) {
      throw new NotFoundException("Introduction request not found");
    }

    return request;
  }

  /**
   * Move an introduction request to the global marketplace
   * Validates ownership before moving
   */
  async moveToMarketplace(
    userId: string,
    requestId: string
  ): Promise<{ success: boolean; message: string }> {
    // Step 1: Get the introduction request
    const request = await this.getIntroductionRequest(requestId);

    // Step 2: Validate ownership - only the requester can move to marketplace
    this.validateRequesterOwnership(userId, request);

    // Step 3: Update the introduction request to make it marketplace visible
    await this.db
      .update(schema.introductionRequests)
      .set({
        isMarketplaceVisible: true,
        marketplaceMovedAt: toUTC(),
        needsRepublish: false,
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionRequests.id, requestId));

    return {
      success: true,
      message:
        "Introduction request has been moved to the global marketplace successfully.",
    };
  }
}
