import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { INTRODUCTION_NOTIFICATION_TYPE } from "modules/introductions/notifications/introduction-notifications.constants";
import { IntroductionNotificationsDispatchService } from "modules/introductions/notifications/introduction-notifications-dispatch.service";
import {
  CLAIM_VERIFICATION_STATUS,
  CLAIM_VERIFICATION_MESSAGES,
  ImportSource,
  IMPORT_SOURCES,
} from "./claim-verification.constants";
import { VerificationStatusResponse } from "./claim-verification.types";
import { ClaimVerificationQueueService } from "./claim-verification-queue.service";
import { MARKETPLACE_BOUNTY_SPLIT } from "../global-marketplace.constants";

@Injectable()
export class ClaimVerificationService {
  private readonly logger = new Logger(ClaimVerificationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(forwardRef(() => ClaimVerificationQueueService))
    private readonly claimVerificationQueueService: ClaimVerificationQueueService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  /**
   * Initialize verification fields on an existing marketplace claim
   * Called after marketplace_claims record is created in startClaim
   */
  async initializeVerification(userId: string, introductionRequestId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          )
        )
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    // Initialize verification fields if not already set
    if (!existing.sourcesChecked || existing.sourcesChecked.length === 0) {
      const [updated] = await this.db
        .update(schema.marketplaceClaims)
        .set({
          sourcesChecked: [],
          updatedAt: toUTC(),
        })
        .where(eq(schema.marketplaceClaims.id, existing.id))
        .returning();
      return updated;
    }

    return existing;
  }

  /**
   * Get pending verification for a user (if any)
   */
  async getPendingVerification(userId: string) {
    const [claim] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          inArray(schema.marketplaceClaims.status, [
            CLAIM_VERIFICATION_STATUS.PENDING,
            CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
          ])
        )
      )
      .limit(1);

    return claim || null;
  }

  /**
   * Get verification status for display
   */
  async getVerificationStatus(
    userId: string
  ): Promise<VerificationStatusResponse | null> {
    // Get the most recent claim with related introduction request data
    const [result] = await this.db
      .select({
        id: schema.marketplaceClaims.id,
        status: schema.marketplaceClaims.status,
        sourcesChecked: schema.marketplaceClaims.sourcesChecked,
        matchedContactId: schema.marketplaceClaims.matchedContactId,
        matchedSource: schema.marketplaceClaims.matchedSource,
        createdAt: schema.marketplaceClaims.createdAt,
        verificationCompletedAt:
          schema.marketplaceClaims.verificationCompletedAt,
        claimerShare: schema.marketplaceClaims.claimerShare,
        // Get prospect info from introduction request
        contactName: schema.introductionRequests.contactName,
        bountyAmount: schema.introductionRequests.bountyAmount,
      })
      .from(schema.marketplaceClaims)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.marketplaceClaims.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(eq(schema.marketplaceClaims.claimerId, userId))
      .orderBy(sql`${schema.marketplaceClaims.createdAt} DESC`)
      .limit(1);

    if (!result) {
      return null;
    }

    const bountyAmount = result.bountyAmount
      ? Number(result.bountyAmount)
      : null;
    const claimerShare = result.claimerShare
      ? Number(result.claimerShare)
      : bountyAmount
        ? bountyAmount * 0.5
        : null;

    // Map marketplace_claims status to verification status for client compatibility
    let verificationStatus = result.status;
    if (result.status === "verifying") {
      verificationStatus = CLAIM_VERIFICATION_STATUS.IN_PROGRESS;
    } else if (result.status === "completed") {
      verificationStatus = CLAIM_VERIFICATION_STATUS.CLAIMED_COMPLETED;
    } else if (result.status === "failed") {
      verificationStatus = CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED;
    }

    return {
      id: result.id,
      status: verificationStatus as VerificationStatusResponse["status"],
      sourcesChecked: (result.sourcesChecked || []) as ImportSource[],
      prospectName: result.contactName,
      prospectCompany: null, // Not stored separately anymore
      prospectTitle: null, // Not stored separately anymore
      bountyAmount,
      claimerShare,
      matchedContactId: result.matchedContactId,
      matchedSource: result.matchedSource,
      createdAt: result.createdAt,
      resolvedAt: result.verificationCompletedAt,
    };
  }

  /**
   * Update status to in_progress when import starts
   */
  async markInProgress(userId: string, introductionRequestId: string) {
    await this.db
      .update(schema.marketplaceClaims)
      .set({
        status: CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          )
        )
      );
  }

  /**
   * Add a checked source to the sources_checked array
   */
  async addSourceChecked(
    userId: string,
    introductionRequestId: string,
    source: ImportSource
  ) {
    const [claim] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          )
        )
      )
      .limit(1);

    if (!claim) return null;

    const currentSources = (claim.sourcesChecked || []) as string[];
    if (currentSources.includes(source)) {
      return claim;
    }

    const updatedSources = [...currentSources, source];

    const [updated] = await this.db
      .update(schema.marketplaceClaims)
      .set({
        sourcesChecked: updatedSources,
        updatedAt: toUTC(),
      })
      .where(eq(schema.marketplaceClaims.id, claim.id))
      .returning();

    return updated;
  }

  /**
   * Check if all sources have been checked
   */
  async checkAllSourcesExhausted(
    userId: string,
    introductionRequestId: string
  ): Promise<boolean> {
    const [claim] = await this.db
      .select({ sourcesChecked: schema.marketplaceClaims.sourcesChecked })
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          )
        )
      )
      .limit(1);

    if (!claim) return false;

    const checkedSources = new Set(claim.sourcesChecked || []);
    return IMPORT_SOURCES.every((source) => checkedSources.has(source));
  }

  /**
   * Mark verification as failed (all sources checked, no match)
   */
  async markAsFailed(userId: string, introductionRequestId: string) {
    await this.db
      .update(schema.marketplaceClaims)
      .set({
        status: "failed", // Maps to CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED for client
        failureReason: "Prospect not found in any imported contacts",
        verificationCompletedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          eq(
            schema.marketplaceClaims.introductionRequestId,
            introductionRequestId
          )
        )
      );
  }

  /**
   * Complete verification successfully
   */
  async completeVerification(
    userId: string,
    introductionRequestId: string,
    matchedContactId: number,
    matchedSource: ImportSource
  ) {
    const result = await this.db.transaction(async (tx) => {
      // Check if request exists
      const [request] = await tx
        .select()
        .from(schema.introductionRequests)
        .where(eq(schema.introductionRequests.id, introductionRequestId))
        .for("update")
        .limit(1);

      if (!request) {
        throw new NotFoundException(
          CLAIM_VERIFICATION_MESSAGES.ERROR.REQUEST_NOT_AVAILABLE
        );
      }

      // Check if already claimed by someone else
      const [existingClaim] = await tx
        .select()
        .from(schema.marketplaceClaims)
        .where(
          and(
            eq(
              schema.marketplaceClaims.introductionRequestId,
              introductionRequestId
            ),
            eq(schema.marketplaceClaims.status, "completed"),
            sql`${schema.marketplaceClaims.claimerId} != ${userId}`
          )
        )
        .limit(1);

      if (existingClaim) {
        throw new Error(CLAIM_VERIFICATION_MESSAGES.ERROR.ALREADY_CLAIMED);
      }

      const bountyAmount = Number(request.bountyAmount ?? 0);
      const claimerShare = bountyAmount * MARKETPLACE_BOUNTY_SPLIT;
      const sharerShare = bountyAmount * MARKETPLACE_BOUNTY_SPLIT;

      const [completedClaim] = await tx
        .update(schema.marketplaceClaims)
        .set({
          status: "completed",
          matchedContactId,
          matchedSource,
          verificationCompletedAt: toUTC(),
          claimedAt: toUTC(),
          claimerShare: claimerShare.toString(),
          sharerShare: sharerShare.toString(),
          updatedAt: toUTC(),
        })
        .where(
          and(
            eq(schema.marketplaceClaims.claimerId, userId),
            eq(
              schema.marketplaceClaims.introductionRequestId,
              introductionRequestId
            )
          )
        )
        .returning({ id: schema.marketplaceClaims.id });

      if (!completedClaim) {
        throw new Error(
          `Claim update returned no rows for user ${userId}, request ${introductionRequestId}. ` +
            `The claim may have been deleted or modified concurrently.`
        );
      }

      // Mark request as accepted
      await tx
        .update(schema.introductionRequests)
        .set({
          status: IntroductionStatus.ACCEPTED,
          acceptedBy: userId,
          acceptedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(eq(schema.introductionRequests.id, introductionRequestId));

      // Create potential connector entry
      await tx.insert(schema.introductionPotentialConnectors).values({
        requestId: introductionRequestId,
        potentialConnectorId: userId,
        status: "accepted",
        createdAt: toUTC(),
        updatedAt: toUTC(),
      });

      // Expire other pending claims for this request
      await tx
        .update(schema.marketplaceClaims)
        .set({
          status: "failed",
          failureReason: "Request claimed by another user",
          verificationCompletedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(
          and(
            eq(
              schema.marketplaceClaims.introductionRequestId,
              introductionRequestId
            ),
            sql`${schema.marketplaceClaims.claimerId} != ${userId}`,
            inArray(schema.marketplaceClaims.status, [
              CLAIM_VERIFICATION_STATUS.PENDING,
              CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
            ])
          )
        );

      return { success: true, claimId: completedClaim.id };
    });

    void this.introductionNotificationsDispatch.dispatch({
      requestId: introductionRequestId,
      type: INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_CONNECTOR_ACCEPTED,
    });

    if (result.claimId) {
      void this.introductionNotificationsDispatch.dispatch({
        requestId: introductionRequestId,
        claimId: result.claimId,
        type: INTRODUCTION_NOTIFICATION_TYPE.SHARER_REQUEST_CLAIMED,
      });
    }

    return result;
  }

  /**
   * Trigger manual verification - can only be called ONCE per claim
   * This replaces automatic verification triggered after contact import
   */
  async triggerManualVerification(userId: string): Promise<{
    success: boolean;
    alreadyTriggered: boolean;
    message: string;
  }> {
    const [claim] = await this.db
      .select()
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.claimerId, userId),
          inArray(schema.marketplaceClaims.status, [
            CLAIM_VERIFICATION_STATUS.PENDING,
            CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
          ])
        )
      )
      .limit(1);

    if (!claim) {
      return {
        success: false,
        alreadyTriggered: false,
        message: "No pending claim found",
      };
    }

    // Check if already triggered (one-time only)
    if (claim.verificationTriggeredAt) {
      return {
        success: false,
        alreadyTriggered: true,
        message:
          "Verification has already been triggered. You can only verify once.",
      };
    }

    // Update claim to mark verification as triggered
    await this.db
      .update(schema.marketplaceClaims)
      .set({
        verificationTriggeredAt: toUTC(),
        status: CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
        updatedAt: toUTC(),
      })
      .where(eq(schema.marketplaceClaims.id, claim.id));

    // Queue verification jobs for all sources
    const sources: ImportSource[] = [...IMPORT_SOURCES];
    for (const source of sources) {
      if (!claim.sourcesChecked?.includes(source)) {
        try {
          await this.claimVerificationQueueService.enqueueVerification(
            userId,
            claim.introductionRequestId,
            source
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue ${source} verification for user ${userId}: ${error}`
          );
        }
      }
    }

    this.logger.log(
      `Manual verification triggered for user ${userId}, claim ${claim.id}`
    );

    return {
      success: true,
      alreadyTriggered: false,
      message: "Verification started. We're checking your contacts now.",
    };
  }
}
