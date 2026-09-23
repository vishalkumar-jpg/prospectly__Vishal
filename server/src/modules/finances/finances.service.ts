import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { toUTC, utcDayjs } from "utils/dayjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  eq,
  desc,
  asc,
  and,
  sql,
  count,
  gte,
  lte,
  inArray,
  isNull,
} from "drizzle-orm";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  getRequesterMilestoneAmounts,
  getStoredRequesterFees,
  toIntroductionFeeRow,
} from "utils/introduction-request-fees.util";
import {
  TransactionHistoryQueryDto,
  PayoutHistoryQueryDto,
} from "./finances.dto";
import {
  TransactionDto,
  TransactionHistoryResponseDto,
  RequestTransactionDetailsDto,
  PaymentEventDto,
  PaymentCycleDto,
  UnsuccessfulAttemptDto,
  PartyInfoDto,
  PaginationMetaDto,
  PayoutRecordDto,
  PayoutHistoryResponseDto,
  FinancialSummaryDto,
  RevenueChartResponseDto,
  TransactionBreakdownResponseDto,
  RecentActivityResponseDto,
  RecentActivityItemDto,
  PayoutTimelineResponseDto,
  PayoutTimelineItemDto,
} from "./finances.response";
import { getDateRangeFromPreset } from "./finances.utils";
import {
  buildWorkflowProgress,
  REFUND_STATUSES_COUNTED_IN_TOTAL,
} from "./finances.helpers";
import {
  buildPaymentEventsForTransaction,
  paymentStageRowStatus,
} from "./finances-payment-events.helpers";
import {
  FinancesSortFieldEnum,
  FinancesSortOrderEnum,
  DatePresetEnum,
  StripePaymentStatusEnum,
  PayoutTriggerEnum,
  FINANCES_DESCRIPTIONS,
  FINANCES_MESSAGES,
  UserRoleEnum,
  TimeRangeEnum,
  FinancesActivityTypeEnum,
  INTRO_EMAIL_SENT_CHECK,
  MEETING_BOOKED_CHECK,
  MEETING_ACKNOWLEDGED_CHECK,
  PAYMENT_EVENT_TYPES,
  TransactionStatusEnum,
} from "./finances.constants";
import { IntroductionStatus } from "../introductions/introductions.constants";
import { ProfilesService } from "../profiles/profiles.service";
import { StripePayoutsService } from "../stripe/payouts/services";
import { PROCESSING_STATUS } from "../payout-queue/payout-queue.constants";

@Injectable()
export class FinancesService {
  private readonly logger = new Logger(FinancesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly stripePayoutsService: StripePayoutsService
  ) {}

  async getTransactionHistory(
    userId: string,
    query?: TransactionHistoryQueryDto
  ): Promise<TransactionHistoryResponseDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_TRANSACTION_HISTORY(userId, query)
    );

    const { db } = this;
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const offset = (page - 1) * limit;
    const search = query?.search?.trim();
    const statusFilter = query?.status || TransactionStatusEnum.ALL;
    const sortBy = query?.sortBy || FinancesSortFieldEnum.DATE;
    const sortOrder = query?.sortOrder || FinancesSortOrderEnum.DESC;
    const datePreset = query?.datePreset || DatePresetEnum.ALL;
    const { start: dateStart, end: dateEnd } = getDateRangeFromPreset(
      datePreset,
      query?.startDate,
      query?.endDate
    );

    const baseConditions = eq(schema.introductionRequests.requesterId, userId);

    let orderByClause;
    switch (sortBy) {
      case FinancesSortFieldEnum.AMOUNT:
        orderByClause =
          sortOrder === FinancesSortOrderEnum.ASC
            ? asc(schema.introductionRequests.bountyAmount)
            : desc(schema.introductionRequests.bountyAmount);
        break;
      case FinancesSortFieldEnum.CONTACT:
        orderByClause =
          sortOrder === FinancesSortOrderEnum.ASC
            ? asc(schema.introductionRequests.contactName)
            : desc(schema.introductionRequests.contactName);
        break;
      case FinancesSortFieldEnum.DATE:
      default:
        orderByClause =
          sortOrder === FinancesSortOrderEnum.ASC
            ? asc(schema.introductionRequests.createdAt)
            : desc(schema.introductionRequests.createdAt);
    }

    const allRequests = await db
      .select({
        id: schema.introductionRequests.id,
        contactName: schema.introductionRequests.contactName,
        bountyAmount: schema.introductionRequests.bountyAmount,
        providerFee: schema.introductionRequestPricesSchema.providerFee,
        processingFee: schema.introductionRequestPricesSchema.processingFee,
        totalAmount: schema.introductionRequestPricesSchema.totalAmount,
        status: schema.introductionRequests.status,
        createdAt: schema.introductionRequests.createdAt,
        acceptedBy: schema.introductionRequests.acceptedBy,
        meetingTitle: schema.introductionRequests.meetingTitle,
        transactionId: schema.introductionTransactions.id,
        overallStatus: schema.introductionTransactions.overallStatus,
      })
      .from(schema.introductionRequests)
      .leftJoin(
        schema.introductionTransactions,
        and(
          eq(
            schema.introductionRequests.id,
            schema.introductionTransactions.introductionRequestId
          ),
          eq(schema.introductionTransactions.isActive, true)
        )
      )
      .leftJoin(
        schema.introductionRequestPricesSchema,
        and(
          eq(
            schema.introductionRequests.id,
            schema.introductionRequestPricesSchema.introductionRequestId
          ),
          isNull(schema.introductionRequestPricesSchema.deletedAt)
        )
      )
      .where(baseConditions)
      .orderBy(orderByClause);

    // Get payment stages for all transactions
    const transactionIds = allRequests
      .map((r) => r.transactionId)
      .filter((id): id is string => !!id);
    const allPaymentStages =
      transactionIds.length > 0
        ? await db.query.paymentStages.findMany({
            where: inArray(schema.paymentStages.transactionId, transactionIds),
          })
        : [];

    // Group payment stages by transaction ID
    const stagesByTransaction = new Map<string, schema.PaymentStage[]>();
    for (const stage of allPaymentStages) {
      const existing = stagesByTransaction.get(stage.transactionId) || [];
      existing.push(stage);
      stagesByTransaction.set(stage.transactionId, existing);
    }

    const userIds = new Set<string>();
    allRequests.forEach((req) => {
      if (req.acceptedBy) userIds.add(req.acceptedBy);
    });

    const userProfiles =
      userIds.size > 0
        ? await this.profilesService.getBasicProfilesByIds(Array.from(userIds))
        : [];

    const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

    const requestIds = allRequests.map((req) => req.id);
    const latestTransactionsByRequestId = new Map<string, string | null>();
    if (requestIds.length > 0) {
      const latestTransactions =
        await db.query.introductionTransactions.findMany({
          where: inArray(
            schema.introductionTransactions.introductionRequestId,
            requestIds
          ),
          orderBy: desc(schema.introductionTransactions.createdAt),
        });
      for (const txn of latestTransactions) {
        const requestId = txn.introductionRequestId as string;
        if (!latestTransactionsByRequestId.has(requestId)) {
          latestTransactionsByRequestId.set(
            requestId,
            txn.overallStatus ?? null
          );
        }
      }
    }

    let totalDebits = 0;
    let totalPendingCharges = 0;
    let totalCapturedCharges = 0;

    const makeParty = (
      profile: (typeof userProfiles)[0] | undefined
    ): PartyInfoDto | null => {
      if (!profile) return null;
      return {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
      };
    };

    let allTransactions: (TransactionDto & { isPaymentComplete: boolean })[] =
      allRequests.map((req) => {
        const connectorId = req.acceptedBy || "";
        const connectorProfile = profileMap.get(connectorId);

        const bountyAmount = Number(req.bountyAmount) || 0;
        const storedFees = getStoredRequesterFees(req);
        const requesterDisplayAmount = storedFees
          ? storedFees.totalAmount
          : bountyAmount;
        totalDebits += requesterDisplayAmount;

        // Get payment stages for this transaction
        const transactionId = req.transactionId as string | undefined;
        const stages = transactionId
          ? stagesByTransaction.get(transactionId) || []
          : [];
        const remainingStage = stages.find(
          (s) => s.stageName === "meeting_booked"
        );

        const isFullyCaptured =
          remainingStage?.status === StripePaymentStatusEnum.CAPTURED ||
          remainingStage?.status === StripePaymentStatusEnum.SUCCEEDED ||
          !!remainingStage?.capturedAt;
        if (isFullyCaptured) {
          totalCapturedCharges += requesterDisplayAmount;
        } else {
          totalPendingCharges += requesterDisplayAmount;
        }

        const isPaymentComplete = isFullyCaptured;

        const isRefunded =
          req.overallStatus === "refunded" ||
          latestTransactionsByRequestId.get(req.id) === "refunded";

        return {
          requestId: req.id,
          contactName: req.contactName,
          meetingTitle: req.meetingTitle || null,
          bountyAmount,
          requesterDisplayAmount,
          status: req.status || "unknown",
          createdAt: req.createdAt?.toISOString() || toUTC().toISOString(),
          connector: makeParty(connectorProfile),
          remainingPaymentStatus: remainingStage?.status || null,
          isPaymentComplete,
          isRefunded,
          overallStatus: req.overallStatus || null,
        };
      });

    if (search) {
      const searchLower = search.toLowerCase();
      const searchClean = search.replace(/[$,\s]/g, "");
      const searchNumber = parseFloat(searchClean);
      const hasNumericSearch = !isNaN(searchNumber);

      allTransactions = allTransactions.filter((t) => {
        const connectorName = t.connector?.fullName?.toLowerCase() || "";

        const textMatch =
          connectorName.includes(searchLower) ||
          t.contactName?.toLowerCase().includes(searchLower) ||
          t.meetingTitle?.toLowerCase().includes(searchLower) ||
          t.status?.toLowerCase().includes(searchLower);

        const amountMatch =
          hasNumericSearch && t.bountyAmount.toString().includes(searchClean);

        return textMatch || amountMatch;
      });
    }

    if (dateStart || dateEnd) {
      allTransactions = allTransactions.filter((t) => {
        const transactionDate = toUTC(t.createdAt);
        if (dateStart && transactionDate < dateStart) return false;
        if (dateEnd && transactionDate > dateEnd) return false;
        return true;
      });
    }

    if (statusFilter !== TransactionStatusEnum.ALL) {
      allTransactions = allTransactions.filter((t) => {
        const isComplete = t.isPaymentComplete;
        return statusFilter === TransactionStatusEnum.COMPLETED
          ? isComplete
          : !isComplete;
      });
    }

    const totalAfterFilters = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    const totalPages = Math.ceil(totalAfterFilters / limit);
    const pagination: PaginationMetaDto = {
      currentPage: page,
      totalPages,
      totalItems: totalAfterFilters,
      itemsPerPage: limit,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return {
      transactions: paginatedTransactions,
      summary: {
        totalDebits,
        totalCredits: 0,
        // totalPlatformFees: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        transactionCount: totalAfterFilters,
        totalPendingCharges,
        totalCapturedCharges,
      },
      pagination,
    };
  }

  async getPayoutHistory(
    userId: string,
    query?: PayoutHistoryQueryDto
  ): Promise<PayoutHistoryResponseDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_PAYOUT_HISTORY(userId, query)
    );

    const { db } = this;
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query?.search?.trim();
    const statusFilter = query?.status || TransactionStatusEnum.ALL;
    const datePreset = query?.datePreset || DatePresetEnum.ALL;
    const { start: dateStart, end: dateEnd } = getDateRangeFromPreset(
      datePreset,
      query?.startDate,
      query?.endDate
    );

    // Query from payout_history directly by connectorId to support marketplace split payouts
    // This ensures both claimer and sharer can see their own payout records
    const payoutRecords = await db
      .select({
        // Payout history fields
        payoutId: schema.payoutHistory.id,
        platformCommissionAmount: schema.payoutHistory.platformCommissionAmount,
        connectorPayoutAmount: schema.payoutHistory.netAmount,
        grossAmount: schema.payoutHistory.grossAmount,
        payoutStatusFromHistory: schema.payoutHistory.status,
        payoutReleased: schema.payoutHistory.payoutReleased,
        payoutReleasedAt: schema.payoutHistory.payoutReleasedAt,
        payoutTriggeredBy: schema.payoutHistory.payoutTriggeredBy,
        trustScoreAtPayout: schema.payoutHistory.trustScoreAtPayout,
        creditsApplied: schema.payoutHistory.creditsApplied,
        commissionAfterCredits: schema.payoutHistory.commissionAfterCredits,
        creditsRemainingAfter: schema.payoutHistory.creditsRemainingAfter,
        isMarketplaceDeal: schema.payoutHistory.isMarketplaceDeal,
        marketplaceRole: schema.payoutHistory.marketplaceRole,
        payoutCreatedAt: schema.payoutHistory.createdAt,
        // Introduction request fields
        id: schema.introductionRequests.id,
        contactName: schema.introductionRequests.contactName,
        meetingTitle: schema.introductionRequests.meetingTitle,
        bountyAmount: schema.introductionRequests.bountyAmount,
        createdAt: schema.introductionRequests.createdAt,
        requesterId: schema.introductionRequests.requesterId,
        status: schema.introductionRequests.status,
        acceptedAt: schema.introductionRequests.acceptedAt,
        meetingCompletedByRequester:
          schema.introductionRequests.meetingCompletedByRequester,
        requesterFeedbackCompleted:
          schema.introductionRequests.requesterFeedbackCompleted,
        connectorFeedbackCompleted:
          schema.introductionRequests.connectorFeedbackCompleted,
      })
      .from(schema.payoutHistory)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.payoutHistory.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(eq(schema.payoutHistory.connectorId, userId))
      .orderBy(desc(schema.payoutHistory.createdAt));

    const connectorProfile = await this.profilesService.getProfileById(userId);

    // Check Stripe Connect account status
    let stripeConnectAccountConnected = false;
    let stripeConnectPayoutsEnabled = false;

    if (
      connectorProfile?.stripeRecipientAccountId &&
      connectorProfile?.stripeRecipientOnboardingComplete
    ) {
      stripeConnectAccountConnected = true;
      stripeConnectPayoutsEnabled = true;
    }

    const currentTrustScore = connectorProfile?.trustScore || 50;
    const qualifiesForImmediatePayout = currentTrustScore >= 90;

    const requesterIds = [
      ...new Set(payoutRecords.map((r) => r.requesterId).filter(Boolean)),
    ];
    const requesterProfiles =
      requesterIds.length > 0
        ? await this.profilesService.getBasicProfilesByIds(requesterIds)
        : [];

    const requesterMap = new Map(requesterProfiles.map((p) => [p.id, p]));

    let totalGrossEarnings = 0;
    let totalNetEarnings = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;

    const payouts: PayoutRecordDto[] = payoutRecords.map((record) => {
      // For marketplace deals, use the payout record's amounts (already split)
      // For normal payouts, use the bounty amount
      const isMarketplace = record.isMarketplaceDeal || false;
      const netAmount = Number(record.connectorPayoutAmount) || 0;
      // For marketplace deals, grossAmount is the user's share; for normal, it's the bounty
      const grossAmount = isMarketplace
        ? Number(record.grossAmount) || netAmount
        : Number(record.bountyAmount) || 0;

      totalGrossEarnings += grossAmount;

      if (record.payoutReleased) {
        totalNetEarnings += netAmount;
        completedPayouts++;
      } else {
        pendingPayouts++;
      }

      const requester = requesterMap.get(record.requesterId || "");

      const status = record.status || IntroductionStatus.PENDING;
      const introEmailSent = INTRO_EMAIL_SENT_CHECK.includes(status);
      const meetingBooked = MEETING_BOOKED_CHECK.includes(status);
      const meetingAcknowledged =
        record.meetingCompletedByRequester ||
        MEETING_ACKNOWLEDGED_CHECK.includes(status);
      const peerFeedbackSubmitted =
        record.requesterFeedbackCompleted ||
        IntroductionStatus.COMPLETED === status;

      const workflowProgress = buildWorkflowProgress({
        introEmailSent,
        introEmailSentAt: introEmailSent
          ? record.acceptedAt?.toISOString() ||
            record.createdAt?.toISOString() ||
            null
          : null,
        meetingBooked,
        meetingBookedAt: meetingBooked
          ? record.createdAt?.toISOString() || null
          : null,
        meetingAcknowledged,
        peerFeedbackSubmitted,
        payoutReleased: record.payoutReleased || false,
        payoutReleasedAt: record.payoutReleasedAt?.toISOString() || null,
        payoutTriggeredBy: record.payoutTriggeredBy || null,
        qualifiesForImmediatePayout,
        currentTrustScore: record.trustScoreAtPayout || currentTrustScore,
        stripeConnectAccountConnected,
        stripeConnectPayoutsEnabled,
      });

      return {
        requestId: record.id,
        contactName: record.contactName,
        meetingTitle: record.meetingTitle || null,
        requester: requester
          ? {
              id: requester.id,
              fullName: requester.fullName,
              email: null,
            }
          : null,
        createdAt:
          record.payoutCreatedAt?.toISOString() ||
          record.createdAt?.toISOString() ||
          toUTC().toISOString(),
        grossAmount,
        netAmount,
        payoutStatus:
          record.payoutStatusFromHistory || TransactionStatusEnum.PENDING,
        payoutReleased: record.payoutReleased || false,
        payoutReleasedAt: record.payoutReleasedAt?.toISOString() || null,
        payoutTriggeredBy: record.payoutTriggeredBy || null,
        currentTrustScore: record.trustScoreAtPayout || currentTrustScore,
        qualifiesForImmediatePayout,
        workflowProgress,
        creditsApplied: Number(record.creditsApplied) || 0,
        commissionAfterCredits: Number(record.commissionAfterCredits) || 0,
        creditsRemainingAfter: Number(record.creditsRemainingAfter) || 0,
        isMarketplaceDeal: isMarketplace,
        marketplaceRole: record.marketplaceRole || null,
        stripeConnectAccountConnected,
        stripeConnectPayoutsEnabled,
      };
    });

    let filteredPayouts = payouts;

    if (search) {
      const searchLower = search.toLowerCase();
      const searchClean = search.replace(/[$,\s]/g, "");
      const searchNumber = parseFloat(searchClean);
      const hasNumericSearch = !isNaN(searchNumber);

      filteredPayouts = filteredPayouts.filter((p) => {
        // Text-based search on contact, meeting title, requester
        const textMatch =
          p.contactName?.toLowerCase().includes(searchLower) ||
          p.meetingTitle?.toLowerCase().includes(searchLower) ||
          p.requester?.fullName?.toLowerCase().includes(searchLower);

        // Status search (paid/pending)
        const statusText = p.payoutReleased
          ? TransactionStatusEnum.PAID
          : TransactionStatusEnum.PENDING;
        const statusMatch = statusText.includes(searchLower);

        // Amount search on gross, platform fee, net payout
        const amountMatch =
          hasNumericSearch &&
          (p.grossAmount === searchNumber ||
            // p.platformFee === searchNumber ||
            p.netAmount === searchNumber ||
            Math.abs(p.grossAmount - searchNumber) < 0.01 ||
            // Math.abs(p.platformFee - searchNumber) < 0.01 ||
            Math.abs(p.netAmount - searchNumber) < 0.01);

        return textMatch || statusMatch || amountMatch;
      });
    }

    if (dateStart || dateEnd) {
      filteredPayouts = filteredPayouts.filter((p) => {
        const payoutDate = toUTC(p.createdAt);
        if (dateStart && payoutDate < dateStart) return false;
        if (dateEnd && payoutDate > dateEnd) return false;
        return true;
      });
    }

    if (statusFilter !== TransactionStatusEnum.ALL) {
      filteredPayouts = filteredPayouts.filter((p) => {
        if (statusFilter === TransactionStatusEnum.COMPLETED)
          return p.payoutReleased;
        if (statusFilter === TransactionStatusEnum.PENDING)
          return !p.payoutReleased;
        return true;
      });
    }

    const totalAfterFilters = filteredPayouts.length;
    const paginatedPayouts = filteredPayouts.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalAfterFilters / limit);

    return {
      payouts: paginatedPayouts,
      summary: {
        totalGrossEarnings,
        // totalPlatformFees,
        totalNetEarnings,
        pendingPayouts,
        completedPayouts,
        payoutCount: totalAfterFilters,
        averagePayoutAmount:
          completedPayouts > 0 ? totalNetEarnings / completedPayouts : 0,
        stripeRecipientAccountId:
          connectorProfile?.stripeRecipientAccountId || null,
        stripeRecipientOnboardingComplete:
          connectorProfile?.stripeRecipientOnboardingComplete || false,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalAfterFilters,
        itemsPerPage: limit,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getRequestTransactionDetails(
    userId: string,
    requestId: string
  ): Promise<RequestTransactionDetailsDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_TRANSACTION_DETAILS(requestId)
    );

    const { db } = this;

    const [result] = await db
      .select({
        request: schema.introductionRequests,
        pricing: schema.introductionRequestPricesSchema,
        payout: schema.payoutHistory,
      })
      .from(schema.introductionRequests)
      .leftJoin(
        schema.introductionRequestPricesSchema,
        and(
          eq(
            schema.introductionRequests.id,
            schema.introductionRequestPricesSchema.introductionRequestId
          ),
          isNull(schema.introductionRequestPricesSchema.deletedAt)
        )
      )
      .leftJoin(
        schema.payoutHistory,
        eq(
          schema.introductionRequests.id,
          schema.payoutHistory.introductionRequestId
        )
      )
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);
    if (!result) {
      throw new NotFoundException(
        FINANCES_MESSAGES.ERROR.INTRO_REQUEST_NOT_FOUND
      );
    }

    const { request, pricing, payout } = result;
    const requestFeeRow = toIntroductionFeeRow(request, pricing);

    const isRequester = request.requesterId === userId;
    const isConnector = request.acceptedBy === userId;
    if (!isRequester && !isConnector) {
      throw new NotFoundException(FINANCES_MESSAGES.ERROR.NO_ACCESS_TO_REQUEST);
    }

    const allTransactions =
      await this.getIntroductionTransactionsByRequestId(requestId);
    const displayTransaction =
      allTransactions.find((txn) => txn.isActive) ??
      allTransactions[allTransactions.length - 1];

    const transactionIds = allTransactions
      .map((txn) => txn.id)
      .filter((id): id is string => !!id);

    const allPaymentStages =
      transactionIds.length > 0
        ? await db.query.paymentStages.findMany({
            where: inArray(schema.paymentStages.transactionId, transactionIds),
          })
        : [];

    const stagesByTransactionId = new Map<string, schema.PaymentStage[]>();
    for (const stage of allPaymentStages) {
      const existing = stagesByTransactionId.get(stage.transactionId!) || [];
      existing.push(stage);
      stagesByTransactionId.set(stage.transactionId!, existing);
    }

    const refunds = await db.query.paymentRefunds.findMany({
      where: eq(schema.paymentRefunds.introductionRequestId, requestId),
    });

    const refundInfos = refunds.map((refund) => {
      const stage = allPaymentStages.find(
        (s) => s.id === refund.paymentStageId
      );
      return {
        stageId: refund.paymentStageId,
        stageName: stage?.stageName || "unknown",
        refundAmount: Number(refund.refundAmount || 0),
        refundStatus: refund.refundStatus || "unknown",
        refundReason: refund.refundReason || null,
        refundedAt: refund.refundedAt?.toISOString() || null,
        stripeRefundId: refund.stripeRefundId || null,
      };
    });

    const displayStages = displayTransaction?.id
      ? stagesByTransactionId.get(displayTransaction.id as string) || []
      : [];
    const initialStage = displayStages.find(
      (s) => s.stageName === "intro_email_sent"
    );
    const remainingStage = displayStages.find(
      (s) => s.stageName === "meeting_booked"
    );

    const totalRefundedAmount = refundInfos
      .filter((r) =>
        (REFUND_STATUSES_COUNTED_IN_TOTAL as readonly string[]).includes(
          r.refundStatus
        )
      )
      .reduce((sum, r) => sum + r.refundAmount, 0);

    const displayStageIds = new Set(displayStages.map((s) => s.id));
    const initialRefund = refundInfos.find(
      (r) =>
        r.stageName === "intro_email_sent" && displayStageIds.has(r.stageId)
    );
    const remainingRefund = refundInfos.find(
      (r) => r.stageName === "meeting_booked" && displayStageIds.has(r.stageId)
    );

    const isRefunded =
      allTransactions.some((txn) => txn.overallStatus === "refunded") ||
      refundInfos.some((r) =>
        (REFUND_STATUSES_COUNTED_IN_TOTAL as readonly string[]).includes(
          r.refundStatus
        )
      );

    const bountyAmount = Number(request.bountyAmount) || 0;
    const storedFees = getStoredRequesterFees(requestFeeRow);
    const milestoneAmounts = getRequesterMilestoneAmounts(requestFeeRow, {
      initialStageAmount: initialStage?.amount,
      remainingStageAmount: remainingStage?.amount,
    });
    const initialAmount = milestoneAmounts.initialChargeAmount;
    const remainingAmount = milestoneAmounts.remainingChargeAmount;
    const requesterTotalAmount = storedFees
      ? storedFees.totalAmount
      : Number(displayTransaction?.totalAuthorizedAmount) ||
        initialAmount + remainingAmount;
    const platformFee =
      Number(payout?.platformCommissionAmount) || bountyAmount * 0.2;
    const connectorPayout = Number(payout?.netAmount) || bountyAmount * 0.8;

    const fulfillmentAttempts =
      await db.query.introductionFulfillmentAttempts.findMany({
        where: eq(
          schema.introductionFulfillmentAttempts.introductionRequestId,
          requestId
        ),
        orderBy: asc(schema.introductionFulfillmentAttempts.createdAt),
      });

    const unsuccessfulAttempts: UnsuccessfulAttemptDto[] =
      fulfillmentAttempts.map((attempt) => ({
        markedAt: attempt.createdAt?.toISOString() || toUTC().toISOString(),
        failureReason: attempt.failureReason,
        failureStage: attempt.failureStage,
      }));

    const paymentCycles: PaymentCycleDto[] = allTransactions.map(
      (transaction, index) => ({
        transactionId: transaction.id as string,
        cycleNumber: index + 1,
        isActive: transaction.isActive,
        authorizedAt: transaction.paymentAuthorizedAt?.toISOString() || null,
      })
    );

    const paymentEvents: PaymentEventDto[] = [];

    for (const transaction of allTransactions) {
      const txnId = transaction.id as string;
      const txnStages = stagesByTransactionId.get(txnId) || [];
      const txnStageIds = new Set(txnStages.map((s) => s.id));
      const txnRefunds = refundInfos.filter((r) => txnStageIds.has(r.stageId));
      const txnInitialStage = txnStages.find(
        (s) => s.stageName === "intro_email_sent"
      );
      const txnRemainingStage = txnStages.find(
        (s) => s.stageName === "meeting_booked"
      );

      paymentEvents.push(
        ...buildPaymentEventsForTransaction({
          transaction,
          initialStage: txnInitialStage,
          remainingStage: txnRemainingStage,
          refundInfos: txnRefunds,
          initialAmount,
          remainingAmount,
          requesterTotalAmount,
        })
      );
    }

    if (request.requesterArchived && request.requesterArchivedAt) {
      paymentEvents.push({
        type: PAYMENT_EVENT_TYPES.REQUESTER_WITHDRAWAL,
        timestamp: (request.requesterArchivedAt as Date).toISOString(),
        amount: null,
        status: "voided",
        stripeId: null,
        description: FINANCES_DESCRIPTIONS.REQUESTER_WITHDRAWAL,
      });
    }

    if (payout?.stripeOutboundPaymentId) {
      paymentEvents.push({
        type: PAYMENT_EVENT_TYPES.PAYOUT,
        timestamp: payout.payoutReleasedAt?.toISOString() || null,
        amount: connectorPayout,
        status: payout.payoutReleased
          ? TransactionStatusEnum.COMPLETED
          : TransactionStatusEnum.PENDING,
        stripeId: payout.stripeOutboundPaymentId,
        description: `Referral payout to connector (${payout.payoutTriggeredBy === PayoutTriggerEnum.TRUST_SCORE ? "via trust score" : "via feedback"})`,
      });
    }

    const baseResponse: RequestTransactionDetailsDto = {
      requestId: request.id,
      contactName: request.contactName,
      status: request.status || TransactionStatusEnum.UNKNOWN,
      createdAt: request.createdAt?.toISOString() || toUTC().toISOString(),
      userRole: isRequester ? UserRoleEnum.REQUESTER : UserRoleEnum.CONNECTOR,
      bountyAmount,
      ...(isRequester && storedFees
        ? {
            providerFee: storedFees.providerFee,
            processingFee: storedFees.processingFee,
            requesterTotalAmount,
          }
        : {}),
      initialChargeAmount: initialAmount,
      initialChargePercentage: 5,
      remainingChargeAmount: remainingAmount,
      remainingChargePercentage: 95,
      platformCommissionAmount: platformFee,
      platformCommissionPercentage: 20,
      connectorPayoutAmount: connectorPayout,
      connectorPayoutPercentage: 80,
      paymentEvents,
      paymentStatus:
        (displayTransaction?.overallStatus as string | undefined) || null,
      initialChargeReceiptUrl: initialStage?.receiptUrl || null,
      remainingChargeReceiptUrl: remainingStage?.receiptUrl || null,
      isRefunded,
      totalRefundedAmount,
      refunds: refundInfos,
      initialRefundAmount: initialRefund?.refundAmount ?? null,
      remainingRefundAmount: remainingRefund?.refundAmount ?? null,
      initialChargeStatus: initialStage
        ? paymentStageRowStatus(initialStage)
        : null,
      remainingChargeStatus: remainingStage
        ? paymentStageRowStatus(remainingStage)
        : null,
      unsuccessfulAttempts,
      paymentCycles,
    };

    if (isConnector) {
      return {
        ...baseResponse,
        payoutStatus: payout?.status || null,
        payoutReleased: payout?.payoutReleased || false,
        payoutReleasedAt: payout?.payoutReleasedAt?.toISOString() || null,
        payoutTriggeredBy: payout?.payoutTriggeredBy || null,
        connectorTrustScoreAtPayout: payout?.trustScoreAtPayout || null,
        payoutError: payout?.errorMessage || null,
      };
    }

    return baseResponse;
  }

  async getPayoutDetailsForRequest(userId: string, requestId: string) {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_PAYOUT_DETAILS(requestId, userId)
    );

    const { db } = this;

    const [result] = await db
      .select({
        request: schema.introductionRequests,
        transaction: schema.introductionTransactions,
        payout: schema.payoutHistory,
      })
      .from(schema.introductionRequests)
      .leftJoin(
        schema.introductionTransactions,
        and(
          eq(
            schema.introductionRequests.id,
            schema.introductionTransactions.introductionRequestId
          ),
          eq(schema.introductionTransactions.isActive, true)
        )
      )
      .leftJoin(
        schema.payoutHistory,
        eq(
          schema.introductionRequests.id,
          schema.payoutHistory.introductionRequestId
        )
      )
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);
    if (!result) {
      throw new NotFoundException(
        FINANCES_MESSAGES.ERROR.INTRO_REQUEST_NOT_FOUND
      );
    }

    const { request } = result;
    const { transaction } = result;
    const { payout } = result;

    const isConnector = request.acceptedBy === userId;
    if (!isConnector) {
      throw new NotFoundException(FINANCES_MESSAGES.ERROR.NO_ACCESS_TO_PAYOUT);
    }

    const requesterProfile = request.requesterId
      ? await this.profilesService
          .getBasicProfilesByIds([request.requesterId])
          .then((profiles) => profiles[0])
      : null;

    const connectorProfile = await this.profilesService.getProfileById(userId);

    // Check Stripe Connect account status
    let stripeConnectAccountConnected = false;
    let stripeConnectPayoutsEnabled = false;

    if (connectorProfile?.stripeRecipientAccountId) {
      try {
        const recipientAccount =
          await this.stripePayoutsService.getRecipientAccount(
            connectorProfile.stripeRecipientAccountId
          );
        stripeConnectAccountConnected = true;
        stripeConnectPayoutsEnabled =
          this.stripePayoutsService.isRecipientCapabilityActive(
            recipientAccount
          );
      } catch (error) {
        this.logger.warn(
          `Failed to verify Stripe account status for connector ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        // Default to showing button if we can't verify (better UX)
        stripeConnectAccountConnected = false;
        stripeConnectPayoutsEnabled = false;
      }
    }

    const bountyAmount = Number(request.bountyAmount) || 0;
    // const platformFee =
    //   Number(payout?.platformCommissionAmount) || bountyAmount * 0.2;
    const netPayout = Number(payout?.netAmount) || bountyAmount * 0.8;

    // Use historical trust score from payout if available, otherwise use current
    const historicalTrustScore = payout?.trustScoreAtPayout;
    const currentTrustScore = connectorProfile?.trustScore || 0;
    const trustScoreForDisplay =
      historicalTrustScore !== null && historicalTrustScore !== undefined
        ? historicalTrustScore
        : currentTrustScore;
    const qualifiesForImmediatePayout = trustScoreForDisplay >= 90;

    // Get payment stages to determine workflow progress
    const transactionId = transaction?.id as string | undefined;
    const paymentStages = transactionId
      ? await this.getPaymentStagesByTransactionId(transactionId)
      : [];
    const initialStage = paymentStages.find(
      (s) => s.stageName === "intro_email_sent"
    );
    const remainingStage = paymentStages.find(
      (s) => s.stageName === "meeting_booked"
    );

    const introEmailSent = !!initialStage?.capturedAt;
    const meetingBooked = !!remainingStage?.capturedAt;
    const meetingAcknowledged =
      request.status === IntroductionStatus.PEER_FEEDBACK ||
      request.status === IntroductionStatus.COMPLETED;
    const peerFeedbackSubmitted =
      request.connectorFeedbackSubmitted ||
      request.status === IntroductionStatus.COMPLETED;
    const workflowProgress = buildWorkflowProgress({
      introEmailSent,
      introEmailSentAt: initialStage?.capturedAt?.toISOString() || null,
      meetingBooked,
      meetingBookedAt: remainingStage?.capturedAt?.toISOString() || null,
      meetingAcknowledged,
      peerFeedbackSubmitted,
      payoutReleased: payout?.payoutReleased || false,
      payoutReleasedAt: payout?.payoutReleasedAt?.toISOString() || null,
      payoutTriggeredBy: payout?.payoutTriggeredBy || null,
      currentTrustScore: trustScoreForDisplay,
      qualifiesForImmediatePayout,
      stripeConnectAccountConnected,
      stripeConnectPayoutsEnabled,
    });

    return {
      requestId: request.id,
      contactName: request.contactName,
      requesterName: requesterProfile?.fullName || null,
      requesterEmail: requesterProfile?.email || null,
      grossAmount: bountyAmount,
      // platformFee,
      netAmount: netPayout,
      payoutStatus: payout?.status || TransactionStatusEnum.PENDING,
      payoutReleased: payout?.payoutReleased || false,
      payoutReleasedAt: payout?.payoutReleasedAt?.toISOString() || null,
      payoutTriggeredBy: payout?.payoutTriggeredBy || null,
      currentTrustScore: trustScoreForDisplay,
      qualifiesForImmediatePayout,
      workflowProgress,
      createdAt: request.createdAt?.toISOString() || toUTC().toISOString(),
      creditsApplied: Number(payout?.creditsApplied) || 0,
      commissionAfterCredits: Number(payout?.commissionAfterCredits) || 0,
      creditsRemainingAfter: Number(payout?.creditsRemainingAfter) || 0,
      isMarketplaceDeal: payout?.isMarketplaceDeal || false,
      marketplaceRole: payout?.marketplaceRole || null,
      stripeConnectAccountConnected,
      stripeConnectPayoutsEnabled,
    };
  }

  async getFinancialSummary(userId: string): Promise<FinancialSummaryDto> {
    this.logger.log(FINANCES_MESSAGES.INFO.FETCHING_FINANCIAL_SUMMARY(userId));
    const { db } = this;

    const now = toUTC();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const connectorEarnings = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${schema.payoutHistory.payoutReleased} = true THEN ${schema.payoutHistory.netAmount} ELSE 0 END), 0)`,
        pendingPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${schema.payoutHistory.payoutReleased} = false THEN ${schema.payoutHistory.netAmount} ELSE 0 END), 0)`,
      })
      .from(schema.payoutHistory)
      .where(eq(schema.payoutHistory.connectorId, userId));

    // Get requester spending from payment_stages
    const requesterTransactions = await db
      .select({
        transactionId: schema.introductionTransactions.id,
      })
      .from(schema.introductionTransactions)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.introductionTransactions.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(eq(schema.introductionRequests.requesterId, userId));

    const transactionIds = requesterTransactions
      .map((t) => t.transactionId)
      .filter((id): id is string => !!id);

    let requesterTotalSpent = 0;
    let requesterPendingCharges = 0;
    let requesterTotalRefunded = 0;

    if (transactionIds.length > 0) {
      const paymentStages = await db.query.paymentStages.findMany({
        where: inArray(schema.paymentStages.transactionId, transactionIds),
      });

      // Get all refunds for these stages
      const stageIds = paymentStages.map((s) => s.id);
      const refunds =
        stageIds.length > 0
          ? await db.query.paymentRefunds.findMany({
              where: inArray(schema.paymentRefunds.paymentStageId, stageIds),
            })
          : [];

      // Create a map of stage refunds
      const refundsByStageId = new Map<string, number>();
      for (const refund of refunds) {
        if (
          (REFUND_STATUSES_COUNTED_IN_TOTAL as readonly string[]).includes(
            refund.refundStatus || ""
          )
        ) {
          const existing = refundsByStageId.get(refund.paymentStageId) || 0;
          refundsByStageId.set(
            refund.paymentStageId,
            existing + Number(refund.refundAmount || 0)
          );
        }
      }

      for (const stage of paymentStages) {
        const amount = Number(stage.amount || 0);
        const chargeAmount = Number(stage.chargeAmount || stage.amount || 0);
        const refundedAmount = refundsByStageId.get(stage.id) || 0;

        if (stage.capturedAt) {
          // Only count as spent if status is 'captured' (not refunded/voided)
          if (stage.status === "captured") {
            requesterTotalSpent += chargeAmount;
          } else if (
            stage.status === "refunded" ||
            stage.status === "refund_initiated"
          ) {
            // Track refunded amounts separately
            requesterTotalRefunded += refundedAmount;
          }
        } else if (stage.status !== "voided") {
          // Only count pending if not voided
          requesterPendingCharges += amount;
        }
      }
    }

    const thisMonthEarnings = await db
      .select({
        earnings: sql<number>`COALESCE(SUM(${schema.payoutHistory.netAmount}), 0)`,
      })
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, userId),
          eq(schema.payoutHistory.payoutReleased, true),
          gte(schema.payoutHistory.payoutReleasedAt, thisMonthStart),
          lte(schema.payoutHistory.payoutReleasedAt, thisMonthEnd)
        )
      );

    const lastMonthEarnings = await db
      .select({
        earnings: sql<number>`COALESCE(SUM(${schema.payoutHistory.netAmount}), 0)`,
      })
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, userId),
          eq(schema.payoutHistory.payoutReleased, true),
          gte(schema.payoutHistory.payoutReleasedAt, lastMonthStart),
          lte(schema.payoutHistory.payoutReleasedAt, lastMonthEnd)
        )
      );

    const connectorActivityResults = await db
      .select({ count: count() })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.acceptedBy, userId));

    const requesterActivityResults = await db
      .select({ count: count() })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.requesterId, userId));

    const isConnector = (connectorActivityResults[0]?.count || 0) > 0;
    const isRequester = (requesterActivityResults[0]?.count || 0) > 0;

    let role: UserRoleEnum = UserRoleEnum.BOTH;
    if (isConnector && !isRequester) role = UserRoleEnum.CONNECTOR;
    else if (isRequester && !isConnector) role = UserRoleEnum.REQUESTER;

    const totalReleasedEarnings =
      Number(connectorEarnings[0]?.totalEarnings) || 0;
    const pendingPayouts = Number(connectorEarnings[0]?.pendingPayouts) || 0;
    const thisMonth = Number(thisMonthEarnings[0]?.earnings) || 0;
    const lastMonth = Number(lastMonthEarnings[0]?.earnings) || 0;

    let monthOverMonthChange = 0;
    if (lastMonth > 0) {
      monthOverMonthChange = Math.round(
        ((thisMonth - lastMonth) / lastMonth) * 100
      );
    } else if (thisMonth > 0) {
      monthOverMonthChange = 100;
    }

    return {
      totalSpent: requesterTotalSpent,
      totalRefunded: requesterTotalRefunded,
      availableBalance: totalReleasedEarnings,
      pendingPayouts,
      pendingCharges: requesterPendingCharges,
      role,
      monthOverMonthChange,
      thisMonthEarnings: thisMonth,
      lastMonthEarnings: lastMonth,
    };
  }

  async getRevenueChart(
    userId: string,
    timeRange = TimeRangeEnum.DAYS_30
  ): Promise<RevenueChartResponseDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_REVENUE_CHART(userId, timeRange)
    );
    const { db } = this;

    const now = toUTC();
    let startDate: Date;

    switch (timeRange) {
      case TimeRangeEnum.DAYS_7:
        startDate = subDays(now, 7);
        break;
      case TimeRangeEnum.DAYS_30:
        startDate = subDays(now, 30);
        break;
      case TimeRangeEnum.DAYS_90:
        startDate = subDays(now, 90);
        break;
      case TimeRangeEnum.YEAR_1:
        startDate = subDays(now, 365);
        break;
      default:
        startDate = toUTC(0);
    }

    const earnings = await db
      .select({
        date: schema.payoutHistory.payoutReleasedAt,
        amount: schema.payoutHistory.netAmount,
      })
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, userId),
          eq(schema.payoutHistory.payoutReleased, true),
          gte(schema.payoutHistory.payoutReleasedAt, startDate)
        )
      )
      .orderBy(asc(schema.payoutHistory.payoutReleasedAt));

    // Get spending from payment_stages
    const transactions = await db
      .select({
        transactionId: schema.introductionTransactions.id,
        createdAt: schema.introductionTransactions.createdAt,
      })
      .from(schema.introductionTransactions)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.introductionTransactions.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(
        and(
          eq(schema.introductionRequests.requesterId, userId),
          gte(schema.introductionTransactions.createdAt, startDate),
          eq(schema.introductionTransactions.isActive, true)
        )
      );

    const transactionIds = transactions
      .map((t) => t.transactionId)
      .filter((id): id is string => !!id);

    const paymentStages =
      transactionIds.length > 0
        ? await db.query.paymentStages.findMany({
            where: inArray(schema.paymentStages.transactionId, transactionIds),
          })
        : [];

    // Group stages by transaction and calculate spending
    const spending = transactions.map((t) => {
      const stages = paymentStages.filter(
        (s) => s.transactionId === t.transactionId
      );
      let amount = 0;
      let initialCaptured = false;
      let remainingCaptured = false;
      let initialAmount = 0;
      let remainingAmount = 0;

      for (const stage of stages) {
        if (stage.stageName === "intro_email_sent") {
          initialAmount = Number(stage.amount || 0);
          initialCaptured = !!stage.capturedAt;
          if (stage.capturedAt) {
            amount += Number(stage.chargeAmount || stage.amount || 0);
          }
        } else if (stage.stageName === "meeting_booked") {
          remainingAmount = Number(stage.amount || 0);
          remainingCaptured = !!stage.capturedAt;
          if (stage.capturedAt) {
            amount += Number(stage.chargeAmount || stage.amount || 0);
          }
        }
      }

      return {
        date: t.createdAt,
        initialAmount,
        remainingAmount,
        initialCaptured,
        remainingCaptured,
        totalAmount: amount,
      };
    });

    const grouped: Record<
      string,
      { date: string; credits: number; debits: number }
    > = {};

    for (const earning of earnings) {
      if (!earning.date) continue;
      const dateKey = format(utcDayjs(earning.date).toDate(), "MMM dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, credits: 0, debits: 0 };
      }
      grouped[dateKey].credits += Number(earning.amount) || 0;
    }

    for (const spend of spending) {
      if (!spend.date) continue;
      const dateKey = format(utcDayjs(spend.date).toDate(), "MMM dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, credits: 0, debits: 0 };
      }
      grouped[dateKey].debits += spend.totalAmount;
    }

    const data = Object.values(grouped);
    const totalCredits = data.reduce((sum, d) => sum + d.credits, 0);
    const totalDebits = data.reduce((sum, d) => sum + d.debits, 0);

    return { data, totalCredits, totalDebits };
  }

  async getTransactionBreakdown(
    userId: string,
    timeRange = TimeRangeEnum.DAYS_30
  ): Promise<TransactionBreakdownResponseDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_TRANSACTION_BREAKDOWN(userId, timeRange)
    );
    const { db } = this;

    const now = toUTC();
    let startDate: Date;

    switch (timeRange) {
      case TimeRangeEnum.DAYS_7:
        startDate = subDays(now, 7);
        break;
      case TimeRangeEnum.DAYS_30:
        startDate = subDays(now, 30);
        break;
      case TimeRangeEnum.DAYS_90:
        startDate = subDays(now, 90);
        break;
      case TimeRangeEnum.YEAR_1:
        startDate = subDays(now, 365);
        break;
      default:
        startDate = toUTC(0);
    }

    const earnings = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.payoutHistory.netAmount}), 0)`,
      })
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, userId),
          eq(schema.payoutHistory.payoutReleased, true),
          gte(schema.payoutHistory.createdAt, startDate)
        )
      );

    // Get spending from payment_stages
    const transactions = await db
      .select({
        transactionId: schema.introductionTransactions.id,
      })
      .from(schema.introductionTransactions)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.introductionTransactions.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(
        and(
          eq(schema.introductionRequests.requesterId, userId),
          gte(schema.introductionTransactions.createdAt, startDate),
          eq(schema.introductionTransactions.isActive, true)
        )
      );

    const transactionIds = transactions
      .map((t) => t.transactionId)
      .filter((id): id is string => !!id);

    let spendingTotal = 0;
    let refundTotal = 0;
    if (transactionIds.length > 0) {
      const paymentStages = await db.query.paymentStages.findMany({
        where: inArray(schema.paymentStages.transactionId, transactionIds),
      });

      // Get refunds for these stages
      const stageIds = paymentStages.map((s) => s.id);
      const refunds =
        stageIds.length > 0
          ? await db.query.paymentRefunds.findMany({
              where: and(
                inArray(schema.paymentRefunds.paymentStageId, stageIds),
                gte(schema.paymentRefunds.createdAt, startDate)
              ),
            })
          : [];

      // Sum up refunded amounts
      for (const refund of refunds) {
        if (refund.refundStatus === "refunded") {
          refundTotal += Number(refund.refundAmount || 0);
        }
      }

      for (const stage of paymentStages) {
        if (stage.capturedAt && stage.status === "captured") {
          // Only count as spent if status is captured (not refunded)
          spendingTotal += Number(stage.chargeAmount || stage.amount || 0);
        }
      }
    }

    // const platformFees = await db
    //   .select({
    //     total: sql<number>`COALESCE(SUM(${schema.payoutHistory.platformCommissionAmount}), 0)`,
    //   })
    //   .from(schema.payoutHistory)
    //   .where(
    //     and(
    //       eq(schema.payoutHistory.connectorId, userId),
    //       gte(schema.payoutHistory.createdAt, startDate)
    //     )
    //   );

    const creditTotal = Number(earnings[0]?.total) || 0;
    const debitTotal = spendingTotal;

    const totalVolume = creditTotal + debitTotal + refundTotal;

    const calculatePercentage = (value: number, total: number): number => {
      return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    const data = [
      {
        name: "Credit",
        value: creditTotal,
        percentage: calculatePercentage(creditTotal, totalVolume),
      },
      {
        name: "Debit",
        value: debitTotal,
        percentage: calculatePercentage(debitTotal, totalVolume),
      },
      {
        name: "Refund",
        value: refundTotal,
        percentage: calculatePercentage(refundTotal, totalVolume),
      },
    ].filter((item) => item.value > 0);

    return { data, totalVolume };
  }

  async getRecentActivity(
    userId: string,
    limit = 5
  ): Promise<RecentActivityResponseDto> {
    this.logger.log(
      FINANCES_MESSAGES.INFO.FETCHING_RECENT_ACTIVITY(userId, limit)
    );
    const { db } = this;

    // Only fetch transactions (requester payments), not payouts
    // Payouts are shown separately in the Payout Timeline section
    const requesterTransactions = await db
      .select({
        id: schema.introductionTransactions.id,
        transactionId: schema.introductionTransactions.id,
        createdAt: schema.introductionTransactions.createdAt,
        contactName: schema.introductionRequests.contactName,
        status: schema.introductionRequests.status,
      })
      .from(schema.introductionTransactions)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.introductionTransactions.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(
        and(
          eq(schema.introductionRequests.requesterId, userId),
          eq(schema.introductionTransactions.isActive, true)
        )
      )
      .orderBy(desc(schema.introductionTransactions.createdAt))
      .limit(limit);

    const transactionIds = requesterTransactions
      .map((t) => t.transactionId)
      .filter((id): id is string => !!id);

    const paymentStages =
      transactionIds.length > 0
        ? await db.query.paymentStages.findMany({
            where: inArray(schema.paymentStages.transactionId, transactionIds),
          })
        : [];

    const stagesByTransaction = new Map<string, schema.PaymentStage[]>();
    for (const stage of paymentStages) {
      const existing = stagesByTransaction.get(stage.transactionId) || [];
      existing.push(stage);
      stagesByTransaction.set(stage.transactionId, existing);
    }

    const activities: RecentActivityItemDto[] = requesterTransactions.map(
      (payment) => {
        const transactionId = payment.transactionId as string;
        const stages = stagesByTransaction.get(transactionId) || [];
        let amount = 0;
        let hasAnyCaptured = false;

        for (const stage of stages) {
          if (stage.capturedAt) {
            amount += Number(stage.chargeAmount || stage.amount || 0);
            hasAnyCaptured = true;
          }
        }

        return {
          id: payment.id as string,
          type: FinancesActivityTypeEnum.BOUNTY_PAYMENT,
          amount,
          description: `${FINANCES_DESCRIPTIONS.BOUNTY_FOR} ${payment.contactName}`,
          status: hasAnyCaptured
            ? TransactionStatusEnum.COMPLETED
            : TransactionStatusEnum.PENDING,
          createdAt:
            (payment.createdAt as Date | null)?.toISOString() ||
            toUTC().toISOString(),
          contactName: payment.contactName,
        };
      }
    );

    return {
      activities,
      totalCount: activities.length,
    };
  }

  async getPayoutTimeline(
    userId: string,
    limit = 5
  ): Promise<PayoutTimelineResponseDto> {
    const { db } = this;

    const payouts = await db
      .select({
        id: schema.payoutHistory.id,
        amount: schema.payoutHistory.netAmount,
        status: schema.payoutHistory.status,
        payoutReleased: schema.payoutHistory.payoutReleased,
        payoutReleasedAt: schema.payoutHistory.payoutReleasedAt,
        createdAt: schema.payoutHistory.createdAt,
        contactName: schema.introductionRequests.contactName,
      })
      .from(schema.payoutHistory)
      .innerJoin(
        schema.introductionRequests,
        eq(
          schema.payoutHistory.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .where(eq(schema.payoutHistory.connectorId, userId))
      .orderBy(desc(schema.payoutHistory.createdAt))
      .limit(limit);

    let totalPending = 0;
    let totalCompleted = 0;

    const timeline: PayoutTimelineItemDto[] = payouts.map((payout) => {
      const amount = Number(payout.amount) || 0;
      let status = TransactionStatusEnum.PENDING;

      if (payout.payoutReleased) {
        status = TransactionStatusEnum.COMPLETED;
        totalCompleted += amount;
      } else if (payout.status === TransactionStatusEnum.PROCESSING) {
        status = TransactionStatusEnum.PROCESSING;
        totalPending += amount;
      } else if (payout.status === TransactionStatusEnum.FAILED) {
        status = TransactionStatusEnum.FAILED;
      } else {
        totalPending += amount;
      }

      return {
        id: payout.id,
        status,
        amount,
        description: `${FINANCES_DESCRIPTIONS.PAYOUT_FOR} ${payout.contactName}`,
        contactName: payout.contactName,
        createdAt: payout.createdAt?.toISOString() || toUTC().toISOString(),
        paidOutAt: payout.payoutReleasedAt?.toISOString() || undefined,
      };
    });

    return { timeline, totalPending, totalCompleted };
  }
  async getActiveIntroductionTransactionByRequestId(
    requestId: string
  ): Promise<schema.IntroductionTransaction | undefined> {
    return await this.db.query.introductionTransactions.findFirst({
      where: and(
        eq(schema.introductionTransactions.introductionRequestId, requestId),
        eq(schema.introductionTransactions.isActive, true)
      ),
    });
  }

  async getLatestIntroductionTransactionByRequestId(
    requestId: string
  ): Promise<schema.IntroductionTransaction | undefined> {
    return await this.db.query.introductionTransactions.findFirst({
      where: eq(
        schema.introductionTransactions.introductionRequestId,
        requestId
      ),
      orderBy: desc(schema.introductionTransactions.createdAt),
    });
  }

  async getIntroductionTransactionsByRequestId(
    requestId: string
  ): Promise<schema.IntroductionTransaction[]> {
    return await this.db.query.introductionTransactions.findMany({
      where: eq(
        schema.introductionTransactions.introductionRequestId,
        requestId
      ),
      orderBy: asc(schema.introductionTransactions.createdAt),
    });
  }

  async getIntroductionTransactionByRequestId(
    requestId: string
  ): Promise<schema.IntroductionTransaction | undefined> {
    return this.getActiveIntroductionTransactionByRequestId(requestId);
  }

  async getIntroductionTransactionsByRequestIds(
    requestIds: string[]
  ): Promise<schema.IntroductionTransaction[]> {
    if (requestIds.length === 0) return [];

    return await this.db.query.introductionTransactions.findMany({
      where: and(
        inArray(
          schema.introductionTransactions.introductionRequestId,
          requestIds
        ),
        eq(schema.introductionTransactions.isActive, true)
      ),
    });
  }

  async createIntroductionTransaction(
    data: Partial<schema.IntroductionTransaction>
  ): Promise<schema.IntroductionTransaction> {
    const [transaction] = await this.db
      .insert(schema.introductionTransactions)
      .values(data as AnyType)
      .returning();
    return transaction;
  }

  async updateIntroductionTransaction(
    id: string,
    data: Partial<schema.IntroductionTransaction>
  ): Promise<schema.IntroductionTransaction | undefined> {
    const [transaction] = await this.db
      .update(schema.introductionTransactions)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.introductionTransactions.id, id))
      .returning();
    return transaction;
  }

  async updateIntroductionTransactionByRequestId(
    requestId: string,
    data: Partial<schema.IntroductionTransaction>
  ): Promise<schema.IntroductionTransaction | undefined> {
    const [transaction] = await this.db
      .update(schema.introductionTransactions)
      .set({ ...data, updatedAt: toUTC() })
      .where(
        and(
          eq(schema.introductionTransactions.introductionRequestId, requestId),
          eq(schema.introductionTransactions.isActive, true)
        )
      )
      .returning();
    return transaction;
  }

  async upsertIntroductionTransaction(
    requestId: string,
    data: Partial<schema.IntroductionTransaction>
  ): Promise<schema.IntroductionTransaction> {
    const existing =
      await this.getActiveIntroductionTransactionByRequestId(requestId);

    if (existing) {
      const existingId = existing.id as string;
      const updated = await this.updateIntroductionTransaction(
        existingId,
        data
      );
      return updated!;
    }

    return await this.createIntroductionTransaction({
      ...data,
      introductionRequestId: requestId,
      isActive: true,
    });
  }

  async getIntroductionTransactionByPaymentIntent(
    paymentIntentId: string
  ): Promise<schema.IntroductionTransaction | undefined> {
    const paymentStage = await this.getPaymentStageByIntentId(paymentIntentId);
    if (!paymentStage) {
      return undefined;
    }
    return await this.db.query.introductionTransactions.findFirst({
      where: eq(schema.introductionTransactions.id, paymentStage.transactionId),
    });
  }

  async getPayoutHistoryByRequestId(
    requestId: string
  ): Promise<schema.PayoutHistory | undefined> {
    return await this.db.query.payoutHistory.findFirst({
      where: eq(schema.payoutHistory.introductionRequestId, requestId),
    });
  }

  async getPayoutHistoryByConnectorId(
    connectorId: string
  ): Promise<schema.PayoutHistory[]> {
    return await this.db.query.payoutHistory.findMany({
      where: eq(schema.payoutHistory.connectorId, connectorId),
      orderBy: desc(schema.payoutHistory.createdAt),
    });
  }

  async getDeferredPayoutsByConnectorId(
    connectorId: string
  ): Promise<schema.PayoutHistory[]> {
    return await this.db
      .select()
      .from(schema.payoutHistory)
      .where(
        and(
          eq(schema.payoutHistory.connectorId, connectorId),
          eq(
            schema.payoutHistory.processingStatus,
            PROCESSING_STATUS.ONBOARDING_PENDING
          ),
          eq(schema.payoutHistory.payoutReleased, false),
          // Marketplace deferred payouts are released by the marketplace rail,
          // not the prospecting processor — exclude them here.
          eq(schema.payoutHistory.isMarketplaceDeal, false)
        )
      )
      .orderBy(asc(schema.payoutHistory.createdAt));
  }

  async createPayoutHistory(
    data: Partial<schema.PayoutHistory>
  ): Promise<schema.PayoutHistory> {
    const [payout] = await this.db
      .insert(schema.payoutHistory)
      .values(data as AnyType)
      .returning();
    return payout;
  }

  async updatePayoutHistory(
    id: string,
    data: Partial<schema.PayoutHistory>
  ): Promise<schema.PayoutHistory | undefined> {
    const [payout] = await this.db
      .update(schema.payoutHistory)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.payoutHistory.id, id))
      .returning();
    return payout;
  }

  async updatePayoutHistoryByRequestId(
    requestId: string,
    data: Partial<schema.PayoutHistory>
  ): Promise<schema.PayoutHistory | undefined> {
    const [payout] = await this.db
      .update(schema.payoutHistory)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.payoutHistory.introductionRequestId, requestId))
      .returning();
    return payout;
  }

  async upsertPayoutHistory(
    requestId: string,
    connectorId: string,
    data: Partial<schema.PayoutHistory>
  ): Promise<schema.PayoutHistory> {
    const existing = await this.getPayoutHistoryByRequestId(requestId);

    if (existing) {
      const updated = await this.updatePayoutHistory(existing.id, data);
      return updated!;
    }

    // Fetch the introduction transaction for the request
    // This is required because introduction_transaction_id is NOT NULL
    const transaction =
      await this.getIntroductionTransactionByRequestId(requestId);
    if (!transaction) {
      throw new Error(
        `Cannot create payout history: introduction transaction not found for request ${requestId}`
      );
    }

    return await this.createPayoutHistory({
      ...data,
      introductionRequestId: requestId,
      introductionTransactionId: transaction.id as string,
      connectorId,
    });
  }

  public async mergeTransactionData(
    transaction: schema.IntroductionTransaction | undefined | null
  ) {
    if (!transaction) return {};

    // Get payment stages for backward compatibility
    const transactionId = transaction.id as string;
    const paymentStages =
      await this.getPaymentStagesByTransactionId(transactionId);
    const initialStage = paymentStages.find(
      (s) => s.stageName === "intro_email_sent"
    );
    const remainingStage = paymentStages.find(
      (s) => s.stageName === "meeting_booked"
    );

    return {
      paymentMethodId: transaction.paymentMethodId,
      paymentStatus: transaction.overallStatus,
      paymentAuthorizedAt: transaction.paymentAuthorizedAt,
      paymentError: transaction.paymentError,
      // Backward compatibility fields from payment stages
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
    };
  }

  public mergePayoutData(payout: schema.PayoutHistory | undefined | null) {
    if (!payout) return {};
    return {
      grossAmount: payout.grossAmount,
      platformCommissionAmount: payout.platformCommissionAmount,
      connectorPayoutAmount: payout.netAmount,
      payoutEligible: payout.payoutEligible,
      payoutReleased: payout.payoutReleased,
      payoutReleasedAt: payout.payoutReleasedAt,
      payoutStatus: payout.status,
      payoutError: payout.errorMessage,
      payoutTriggeredBy: payout.payoutTriggeredBy,
      connectorTrustScoreAtPayout: payout.trustScoreAtPayout,
      stripeOutboundPaymentId: payout.stripeOutboundPaymentId,
    };
  }

  // Payment Stages Helper Methods
  async createPaymentStage(
    data: Partial<schema.PaymentStage>
  ): Promise<schema.PaymentStage> {
    const [stage] = await this.db
      .insert(schema.paymentStages)
      .values(data as AnyType)
      .returning();
    return stage;
  }

  async getPaymentStagesByTransactionId(
    transactionId: string
  ): Promise<schema.PaymentStage[]> {
    return await this.db.query.paymentStages.findMany({
      where: eq(schema.paymentStages.transactionId, transactionId),
      orderBy: asc(schema.paymentStages.stageOrder),
    });
  }

  async getActivePaymentStagesByTransactionId(
    transactionId: string
  ): Promise<schema.PaymentStage[]> {
    const allStages = await this.db.query.paymentStages.findMany({
      where: eq(schema.paymentStages.transactionId, transactionId),
      orderBy: desc(schema.paymentStages.createdAt),
    });

    const terminalStatuses = new Set([
      "refunded",
      "refund_initiated",
      "voided",
      "failed",
      "canceled",
    ]);
    const seenStageNames = new Set<string>();
    const activeStages: schema.PaymentStage[] = [];

    for (const stage of allStages) {
      if (seenStageNames.has(stage.stageName)) continue;
      if (terminalStatuses.has(stage.status ?? "")) continue;
      seenStageNames.add(stage.stageName);
      activeStages.push(stage);
    }

    return activeStages;
  }

  async getPaymentStageRowByStageName(
    transactionId: string,
    stageName: string
  ): Promise<schema.PaymentStage | undefined> {
    return await this.db.query.paymentStages.findFirst({
      where: and(
        eq(schema.paymentStages.transactionId, transactionId),
        eq(schema.paymentStages.stageName, stageName)
      ),
      orderBy: desc(schema.paymentStages.createdAt),
    });
  }

  async getPaymentStageByStageName(
    transactionId: string,
    stageName: string
  ): Promise<schema.PaymentStage | undefined> {
    const activeStages =
      await this.getActivePaymentStagesByTransactionId(transactionId);
    return activeStages.find((stage) => stage.stageName === stageName);
  }

  async getPaymentStageByIntentId(
    intentId: string
  ): Promise<schema.PaymentStage | undefined> {
    return await this.db.query.paymentStages.findFirst({
      where: eq(schema.paymentStages.intentId, intentId),
    });
  }

  async updatePaymentStage(
    id: string,
    data: Partial<schema.PaymentStage>
  ): Promise<schema.PaymentStage | undefined> {
    const [stage] = await this.db
      .update(schema.paymentStages)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.paymentStages.id, id))
      .returning();
    return stage;
  }

  async updatePaymentStageByStageName(
    transactionId: string,
    stageName: string,
    data: Partial<schema.PaymentStage>
  ): Promise<schema.PaymentStage | undefined> {
    const stage = await this.getPaymentStageByStageName(
      transactionId,
      stageName
    );
    if (!stage) return undefined;
    return await this.updatePaymentStage(stage.id, data);
  }

  async updateTransactionTotals(transactionId: string): Promise<void> {
    const stages =
      await this.getActivePaymentStagesByTransactionId(transactionId);

    const totalAuthorized = stages.reduce((sum, stage) => {
      return sum + Number(stage.amount || 0);
    }, 0);

    const totalCaptured = stages.reduce((sum, stage) => {
      if (stage.capturedAt) {
        return sum + Number(stage.chargeAmount || stage.amount || 0);
      }
      return sum;
    }, 0);

    // Determine overall status based on stages
    let overallStatus = "pending";
    const allCaptured =
      stages.length > 0 && stages.every((stage) => stage.capturedAt);
    const allVoided =
      stages.length > 0 && stages.every((stage) => stage.status === "voided");
    const anyFailed = stages.some(
      (stage) => stage.status === "failed" || stage.status === "canceled"
    );
    const anyAuthorized = stages.some((stage) => stage.authorizedAt);

    if (allCaptured) {
      overallStatus = "captured";
    } else if (allVoided) {
      overallStatus = "voided";
    } else if (anyFailed) {
      overallStatus = "failed";
    } else if (anyAuthorized) {
      overallStatus = "authorized";
    }

    const updateData: Partial<schema.IntroductionTransaction> = {
      totalAuthorizedAmount: totalAuthorized.toString(),
      totalCapturedAmount: totalCaptured.toString(),
      overallStatus,
      fullyPaidAt: allCaptured ? toUTC() : undefined,
    };

    // Update transaction - receipt URLs are stored in payment_stages table, not here
    await this.updateIntroductionTransaction(transactionId, updateData);
  }
}
