import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, asc } from "drizzle-orm";
import { NotFoundException } from "@nestjs/common";

interface RequestData {
  id: string;
  status: string;
  contactName: string;
  bountyAmount: string;
  connectorFeedbackSubmitted: boolean | null;
}

interface TransactionData {
  id: string;
}

interface PayoutData {
  payoutReleased: boolean;
  payoutReleasedAt: Date | null;
  payoutTriggeredBy: string | null;
  trustScoreAtPayout: number | null;
}

interface PaymentStage {
  stageName: string;
  capturedAt: Date | null;
}

export async function getSharerTrackingData(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  requestId: string
): Promise<{
  request: RequestData;
  transaction: TransactionData | null;
  payout: PayoutData | null;
  paymentStages: PaymentStage[];
}> {
  // Check if user is sharer by querying marketplace_shares or marketplace_claims
  const [share] = await db
    .select({
      sharerId: schema.marketplaceShares.sharerId,
    })
    .from(schema.marketplaceShares)
    .where(
      and(
        eq(schema.marketplaceShares.introductionRequestId, requestId),
        eq(schema.marketplaceShares.sharerId, userId)
      )
    )
    .limit(1);

  // Also check marketplace_claims as sharer might be linked there
  const [claim] = await db
    .select({
      sharerId: schema.marketplaceClaims.sharerId,
    })
    .from(schema.marketplaceClaims)
    .where(
      and(
        eq(schema.marketplaceClaims.introductionRequestId, requestId),
        eq(schema.marketplaceClaims.sharerId, userId)
      )
    )
    .limit(1);

  if (!share && !claim) {
    throw new NotFoundException(
      "You do not have access to this tracking details"
    );
  }

  // Get introduction request data
  const [request] = await db
    .select({
      id: schema.introductionRequests.id,
      status: schema.introductionRequests.status,
      contactName: schema.introductionRequests.contactName,
      bountyAmount: schema.introductionRequests.bountyAmount,
      connectorFeedbackSubmitted:
        schema.introductionRequests.connectorFeedbackSubmitted,
    })
    .from(schema.introductionRequests)
    .where(eq(schema.introductionRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new NotFoundException("Introduction request not found");
  }

  // Get transaction and payout history
  const [transaction] = await db
    .select({
      id: schema.introductionTransactions.id,
    })
    .from(schema.introductionTransactions)
    .where(
      and(
        eq(schema.introductionTransactions.introductionRequestId, requestId),
        eq(schema.introductionTransactions.isActive, true)
      )
    )
    .limit(1);

  const [payout] = transaction
    ? await db
        .select({
          payoutReleased: schema.payoutHistory.payoutReleased,
          payoutReleasedAt: schema.payoutHistory.payoutReleasedAt,
          payoutTriggeredBy: schema.payoutHistory.payoutTriggeredBy,
          trustScoreAtPayout: schema.payoutHistory.trustScoreAtPayout,
        })
        .from(schema.payoutHistory)
        .where(
          and(
            eq(schema.payoutHistory.introductionRequestId, requestId),
            eq(schema.payoutHistory.marketplaceRole, "sharer")
          )
        )
        .limit(1)
    : [null];

  // Get payment stages to determine workflow progress
  const paymentStages = transaction
    ? await db.query.paymentStages.findMany({
        where: eq(schema.paymentStages.transactionId, transaction.id),
        orderBy: asc(schema.paymentStages.stageOrder),
      })
    : [];

  return {
    request,
    transaction,
    payout,
    paymentStages,
  };
}
