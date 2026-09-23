import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ForbiddenException,
} from "@nestjs/common";
import { eq, and, inArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AnyType } from "types/common";
import {
  DISPUTES_MESSAGES,
  ACTIVE_DISPUTE_STATUSES,
} from "./disputes.constants";

@Injectable()
export class DisputesValidateService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Validate introduction request exists and user is involved
   * @param introductionRequestId - The introduction request ID
   * @param userId - The user ID
   * @returns Introduction request with against user ID
   */
  async validateIntroductionRequestAndUser(
    introductionRequestId: string,
    userId: string,
    db: AnyType = this.db
  ): Promise<{
    introductionRequest: typeof schema.introductionRequests.$inferSelect;
    againstUserId: string | null;
  }> {
    const introductionRequest = (
      await db
        .select()
        .from(schema.introductionRequests)
        .where(eq(schema.introductionRequests.id, introductionRequestId))
        .for("update")
    )[0];

    if (!introductionRequest) {
      throw new NotFoundException(
        DISPUTES_MESSAGES.ERROR.INTRODUCTION_REQUEST_NOT_FOUND
      );
    }

    if (introductionRequest.requesterId !== userId) {
      throw new ForbiddenException(DISPUTES_MESSAGES.ERROR.USER_NOT_INVOLVED);
    }

    const againstUserId = introductionRequest.acceptedBy;

    return { introductionRequest, againstUserId };
  }

  /**
   * Validate no active dispute exists for introduction request
   * @param introductionRequestId - The introduction request ID
   */
  async validateNoActiveDispute(
    introductionRequestId: string,
    db: AnyType = this.db
  ): Promise<void> {
    const existingDispute = await db.query.disputes.findFirst({
      where: and(
        eq(schema.disputes.introductionRequestId, introductionRequestId),
        inArray(schema.disputes.status, ACTIVE_DISPUTE_STATUSES)
      ),
    });

    if (existingDispute) {
      throw new BadRequestException(DISPUTES_MESSAGES.ERROR.DUPLICATE_DISPUTE);
    }
  }

  /**
   * Validate dispute exists and user is authorized
   * @param disputeId - The dispute ID
   * @param userId - The user ID
   * @returns The dispute
   */
  async validateDisputeAccess(
    disputeId: string,
    userId: string
  ): Promise<typeof schema.disputes.$inferSelect> {
    const dispute = await this.db.query.disputes.findFirst({
      where: eq(schema.disputes.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException(DISPUTES_MESSAGES.ERROR.NOT_FOUND);
    }

    if (dispute.filedByUserId !== userId) {
      throw new ForbiddenException(DISPUTES_MESSAGES.ERROR.UNAUTHORIZED);
    }

    return dispute;
  }

  /**
   * Validate disputed and refund amounts
   * @param disputedAmount - The amount being disputed
   * @param requestedRefundAmount - The amount requested for refund
   * @param bountyAmount - The original bounty amount of the introduction
   */
  async validateAmounts(
    disputedAmount: number,
    requestedRefundAmount: number | undefined,
    bountyAmount: string | number
  ): Promise<void> {
    const bounty = Number(bountyAmount);

    if (disputedAmount !== bounty) {
      throw new BadRequestException(
        DISPUTES_MESSAGES.ERROR.DISPUTED_AMOUNT_MISMATCH
      );
    }

    if (
      requestedRefundAmount !== undefined &&
      requestedRefundAmount > disputedAmount
    ) {
      throw new BadRequestException(
        DISPUTES_MESSAGES.ERROR.REQUESTED_REFUND_AMOUNT_TOO_HIGH
      );
    }
  }
}
