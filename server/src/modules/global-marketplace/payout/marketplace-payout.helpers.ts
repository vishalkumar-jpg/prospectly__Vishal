import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and } from "drizzle-orm";
import { Logger } from "@nestjs/common";
import { MarketplaceDealInfo } from "./marketplace-payout.types";

export async function getMarketplaceDealInfoHelper(
  db: PostgresJsDatabase<typeof schema>,
  logger: Logger,
  introductionRequestId: string
): Promise<MarketplaceDealInfo | null> {
  const [claim] = await db
    .select({
      claimerId: schema.marketplaceClaims.claimerId,
      sharerId: schema.marketplaceClaims.sharerId,
    })
    .from(schema.marketplaceClaims)
    .where(
      and(
        eq(
          schema.marketplaceClaims.introductionRequestId,
          introductionRequestId
        ),
        eq(schema.marketplaceClaims.status, "completed")
      )
    )
    .limit(1);

  if (!claim || !claim.sharerId) {
    return null;
  }

  const [request] = await db
    .select({
      bountyAmount: schema.introductionRequests.bountyAmount,
      requesterId: schema.introductionRequests.requesterId,
    })
    .from(schema.introductionRequests)
    .where(eq(schema.introductionRequests.id, introductionRequestId))
    .limit(1);

  if (!request || !request.requesterId) {
    return null;
  }

  // Get the introduction transaction ID
  const [transaction] = await db
    .select({
      id: schema.introductionTransactions.id,
    })
    .from(schema.introductionTransactions)
    .where(
      and(
        eq(
          schema.introductionTransactions.introductionRequestId,
          introductionRequestId
        ),
        eq(schema.introductionTransactions.isActive, true)
      )
    )
    .limit(1);

  if (!transaction) {
    logger.warn(
      `No introduction transaction found for request ${introductionRequestId}`
    );
    return null;
  }

  return {
    introductionRequestId,
    introductionTransactionId: transaction.id,
    claimerId: claim.claimerId,
    sharerId: claim.sharerId,
    bountyAmount: parseFloat(request.bountyAmount || "0"),
    requesterId: request.requesterId,
  };
}

export async function validatePaymentsCapturedHelper(
  db: PostgresJsDatabase<typeof schema>,
  logger: Logger,
  introductionRequestId: string
): Promise<boolean> {
  // Get the transaction for this request
  const [transaction] = await db
    .select({ id: schema.introductionTransactions.id })
    .from(schema.introductionTransactions)
    .where(
      and(
        eq(
          schema.introductionTransactions.introductionRequestId,
          introductionRequestId
        ),
        eq(schema.introductionTransactions.isActive, true)
      )
    )
    .limit(1);

  if (!transaction) {
    logger.warn(`No transaction found for request ${introductionRequestId}`);
    return false;
  }

  // Get payment stages for this transaction
  const stages = await db
    .select({
      stageName: schema.paymentStages.stageName,
      capturedAt: schema.paymentStages.capturedAt,
    })
    .from(schema.paymentStages)
    .where(eq(schema.paymentStages.transactionId, transaction.id));

  // Check if both required stages are captured
  const initialStage = stages.find((s) => s.stageName === "intro_email_sent");
  const remainingStage = stages.find((s) => s.stageName === "meeting_booked");

  const initialCaptured = !!initialStage?.capturedAt;
  const remainingCaptured = !!remainingStage?.capturedAt;

  if (!initialCaptured || !remainingCaptured) {
    logger.warn(
      `Payment not fully captured for request ${introductionRequestId}: ` +
        `initial=${initialCaptured}, remaining=${remainingCaptured}`
    );
    return false;
  }

  return true;
}

export async function getSharerClaimsHelper(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
) {
  const claims = await db
    .select({
      claimId: schema.marketplaceClaims.id,
      introductionRequestId: schema.marketplaceClaims.introductionRequestId,
      claimerId: schema.marketplaceClaims.claimerId,
      status: schema.marketplaceClaims.status,
      claimerShare: schema.marketplaceClaims.claimerShare,
      sharerShare: schema.marketplaceClaims.sharerShare,
      createdAt: schema.marketplaceClaims.createdAt,
      verificationCompletedAt: schema.marketplaceClaims.verificationCompletedAt,
      claimedAt: schema.marketplaceClaims.claimedAt,
      contactName: schema.introductionRequests.contactName,
      bountyAmount: schema.introductionRequests.bountyAmount,
      requestStatus: schema.introductionRequests.status,
      requesterArchiveReason:
        schema.introductionRequests.requesterArchiveReason,
      requesterArchiveNotes: schema.introductionRequests.requesterArchiveNotes,
      requesterArchivedAt: schema.introductionRequests.requesterArchivedAt,
    })
    .from(schema.marketplaceClaims)
    .innerJoin(
      schema.introductionRequests,
      eq(
        schema.marketplaceClaims.introductionRequestId,
        schema.introductionRequests.id
      )
    )
    .where(eq(schema.marketplaceClaims.sharerId, userId))
    .orderBy(schema.marketplaceClaims.createdAt);

  // Convert numeric strings to numbers for proper frontend handling
  return claims.map((claim) => ({
    ...claim,
    claimerShare: claim.claimerShare ? Number(claim.claimerShare) : null,
    sharerShare: claim.sharerShare ? Number(claim.sharerShare) : null,
    bountyAmount: Number(claim.bountyAmount),
    requesterArchiveReason: claim.requesterArchiveReason ?? null,
    requesterArchiveNotes: claim.requesterArchiveNotes ?? null,
    requesterArchivedAt: claim.requesterArchivedAt
      ? claim.requesterArchivedAt.toISOString()
      : null,
  }));
}
