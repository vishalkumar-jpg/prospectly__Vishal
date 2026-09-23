import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  FinancesActivityTypeEnum,
  TransactionStatusEnum,
  WorkflowStepEnum,
  WorkflowStatusEnum,
  UserRoleEnum,
} from "./finances.constants";

export class PaginationMetaDto {
  @ApiProperty({ description: "Current page number" })
  currentPage: number;

  @ApiProperty({ description: "Total number of pages" })
  totalPages: number;

  @ApiProperty({ description: "Total number of items" })
  totalItems: number;

  @ApiProperty({ description: "Items per page" })
  itemsPerPage: number;

  @ApiProperty({ description: "Has previous page" })
  hasPreviousPage: boolean;

  @ApiProperty({ description: "Has next page" })
  hasNextPage: boolean;
}

export class PartyInfoDto {
  @ApiProperty({ description: "User ID" })
  id: string;

  @ApiPropertyOptional({ description: "Full name" })
  fullName: string | null;

  @ApiPropertyOptional({ description: "Email address" })
  email: string | null;
}

export class PaymentEventDto {
  type: string;
  timestamp: string | null;
  amount: number | null;
  status: string | null;
  stripeId: string | null;
  description: string;
  transactionId?: string;
}

export class UnsuccessfulAttemptDto {
  markedAt: string;
  failureReason: string;
  failureStage: string;
}

export class PaymentCycleDto {
  transactionId: string;
  cycleNumber: number;
  isActive: boolean;
  authorizedAt: string | null;
}

export class TransactionDto {
  @ApiProperty({ description: "Introduction request ID" })
  requestId: string;

  @ApiProperty({ description: "Contact name" })
  contactName: string;

  @ApiPropertyOptional({ description: "Meeting title" })
  meetingTitle: string | null;

  @ApiProperty({ description: "Bounty amount" })
  bountyAmount: number;

  @ApiPropertyOptional({
    description:
      "Requester-facing referral payout (inclusive of fees when stored)",
  })
  requesterDisplayAmount?: number;

  @ApiProperty({ description: "Introduction status" })
  status: string;

  @ApiProperty({ description: "Creation date" })
  createdAt: string;

  @ApiPropertyOptional({ description: "Connector information" })
  connector: PartyInfoDto | null;

  @ApiPropertyOptional({
    description: "Remaining payment status (for payment badge)",
  })
  remainingPaymentStatus: string | null;

  @ApiPropertyOptional({
    description: "Whether the transaction has been refunded",
  })
  isRefunded?: boolean;

  @ApiPropertyOptional({
    description: "Overall transaction status (e.g., refunded, voided)",
  })
  overallStatus?: string | null;
}

export class TransactionSummaryDto {
  totalDebits: number;
  totalCredits: number;
  // totalPlatformFees: number;
  pendingPayouts: number;
  completedPayouts: number;
  transactionCount: number;
  totalPendingCharges?: number;
  totalCapturedCharges?: number;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ description: "List of transactions" })
  transactions: TransactionDto[];

  @ApiProperty({ description: "Summary statistics" })
  summary: TransactionSummaryDto;

  @ApiProperty({ description: "Pagination metadata" })
  pagination: PaginationMetaDto;
}

export class RefundInfoDto {
  stageId: string;
  stageName: string;
  refundAmount: number;
  refundStatus: string;
  refundReason: string | null;
  refundedAt: string | null;
  stripeRefundId: string | null;
}

export class RequestTransactionDetailsDto {
  requestId: string;
  contactName: string;
  status: string;
  createdAt: string;
  userRole: "requester" | "connector";
  bountyAmount: number;
  providerFee?: number;
  processingFee?: number;
  requesterTotalAmount?: number;
  initialChargeAmount: number;
  initialChargePercentage: number;
  remainingChargeAmount: number;
  remainingChargePercentage: number;
  platformCommissionAmount: number;
  platformCommissionPercentage: number;
  connectorPayoutAmount: number;
  connectorPayoutPercentage: number;
  paymentEvents: PaymentEventDto[];
  paymentStatus: string | null;
  payoutStatus?: string | null;
  payoutReleased?: boolean;
  payoutReleasedAt?: string | null;
  payoutTriggeredBy?: string | null;
  connectorTrustScoreAtPayout?: number | null;
  payoutError?: string | null;
  initialChargeReceiptUrl: string | null;
  remainingChargeReceiptUrl: string | null;
  // Refund-related fields
  isRefunded: boolean;
  totalRefundedAmount: number;
  refunds: RefundInfoDto[];
  initialRefundAmount?: number | null;
  remainingRefundAmount?: number | null;
  // Stage statuses for UI display
  initialChargeStatus: string | null;
  remainingChargeStatus: string | null;
  unsuccessfulAttempts: UnsuccessfulAttemptDto[];
  paymentCycles: PaymentCycleDto[];
}

export class WorkflowStepDto {
  @ApiProperty({ description: "Step identifier", enum: WorkflowStepEnum })
  step: string;

  @ApiProperty({ description: "Step display label" })
  label: string;

  @ApiProperty({ description: "Step description" })
  description: string;

  @ApiProperty({ enum: WorkflowStatusEnum })
  status: WorkflowStatusEnum;

  @ApiPropertyOptional({ description: "Timestamp when step was completed" })
  completedAt: string | null;

  @ApiPropertyOptional({ description: "Additional context or action needed" })
  actionNeeded: string | null;
}

export class PayoutRecordDto {
  @ApiProperty({ description: "Introduction request ID" })
  requestId: string;

  @ApiProperty({ description: "Contact name" })
  contactName: string;

  @ApiPropertyOptional({ description: "Meeting title" })
  meetingTitle: string | null;

  @ApiPropertyOptional({ description: "Requester information" })
  requester: PartyInfoDto | null;

  @ApiProperty({ description: "Gross earnings amount" })
  grossAmount: number;

  // @ApiProperty({ description: "Escrow fee (20%)" })
  // platformFee: number;

  @ApiProperty({ description: "Net payout amount (80%)" })
  netAmount: number;

  @ApiProperty({ description: "Payout status" })
  payoutStatus: string;

  @ApiProperty({ description: "Whether payout has been released" })
  payoutReleased: boolean;

  @ApiPropertyOptional({ description: "When payout was released" })
  payoutReleasedAt: string | null;

  @ApiPropertyOptional({
    description: "What triggered the payout (trust_score or peer_feedback)",
  })
  payoutTriggeredBy: string | null;

  @ApiPropertyOptional({
    description: "Connector trust score at time of payout or current",
  })
  currentTrustScore: number | null;

  @ApiProperty({
    description:
      "Whether connector qualifies for immediate payout (trust score >= 90)",
  })
  qualifiesForImmediatePayout: boolean;

  @ApiPropertyOptional({
    description: "Workflow progress steps",
    type: [WorkflowStepDto],
  })
  workflowProgress: WorkflowStepDto[];

  @ApiProperty({ description: "When the introduction request was created" })
  createdAt: string;

  @ApiPropertyOptional({ description: "Credits applied to this payout" })
  creditsApplied?: number;

  @ApiPropertyOptional({
    description: "Commission after credits were applied",
  })
  commissionAfterCredits?: number;

  @ApiPropertyOptional({
    description: "User's credit balance after this payout",
  })
  creditsRemainingAfter?: number;

  @ApiPropertyOptional({
    description: "Whether this is a marketplace deal with split payout",
  })
  isMarketplaceDeal?: boolean;

  @ApiPropertyOptional({
    description: "Role in marketplace deal: claimer or sharer",
  })
  marketplaceRole?: string | null;
}

export class PayoutSummaryDto {
  totalGrossEarnings: number;
  // totalPlatformFees: number;
  totalNetEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  payoutCount: number;
  averagePayoutAmount: number;
  stripeRecipientAccountId: string | null;
  stripeRecipientOnboardingComplete: boolean;
}

export class PayoutHistoryResponseDto {
  @ApiProperty({ description: "List of payouts" })
  payouts: PayoutRecordDto[];

  @ApiProperty({ description: "Summary statistics" })
  summary: PayoutSummaryDto;

  @ApiProperty({ description: "Pagination metadata" })
  pagination: PaginationMetaDto;
}

export class FinancialSummaryDto {
  @ApiProperty({
    description:
      "Total amount spent on bounties (requester role) - net of refunds",
    type: Number,
  })
  totalSpent: number;

  @ApiProperty({
    description: "Total amount refunded to requester",
    type: Number,
  })
  totalRefunded: number;

  @ApiProperty({
    description: "Available balance for withdrawal",
    type: Number,
  })
  availableBalance: number;

  @ApiProperty({ description: "Pending payouts in escrow", type: Number })
  pendingPayouts: number;

  @ApiProperty({
    description: "Pending charges on active requests",
    type: Number,
  })
  pendingCharges: number;

  @ApiProperty({
    description: "User role",
    enum: UserRoleEnum,
    type: String,
  })
  role: UserRoleEnum;

  @ApiProperty({
    description: "Month over month change percentage",
    type: Number,
  })
  monthOverMonthChange: number;

  @ApiProperty({ description: "This month earnings", type: Number })
  thisMonthEarnings: number;

  @ApiProperty({ description: "Last month earnings", type: Number })
  lastMonthEarnings: number;
}

export class ChartDataPointDto {
  @ApiProperty({ description: 'Date label (e.g., "Jan 01")', type: String })
  date: string;

  @ApiProperty({
    description: "Credits/earnings for this period",
    type: Number,
  })
  credits: number;

  @ApiProperty({ description: "Debits/spending for this period", type: Number })
  debits: number;
}

export class RevenueChartResponseDto {
  @ApiProperty({
    description: "Chart data points",
    type: () => [ChartDataPointDto],
  })
  data: ChartDataPointDto[];

  @ApiProperty({ description: "Total credits in the period", type: Number })
  totalCredits: number;

  @ApiProperty({ description: "Total debits in the period", type: Number })
  totalDebits: number;
}

export class BreakdownItemDto {
  @ApiProperty({ description: "Category name", type: String })
  name: string;

  @ApiProperty({ description: "Amount for this category", type: Number })
  value: number;

  @ApiProperty({ description: "Percentage of total", type: Number })
  percentage: number;
}

export class TransactionBreakdownResponseDto {
  @ApiProperty({
    description: "Breakdown data",
    type: () => [BreakdownItemDto],
  })
  data: BreakdownItemDto[];

  @ApiProperty({ description: "Total volume", type: Number })
  totalVolume: number;
}

export class RecentActivityItemDto {
  @ApiProperty({ description: "Activity ID", type: String })
  id: string;

  @ApiProperty({
    description: "Activity type",
    enum: FinancesActivityTypeEnum,
    type: String,
  })
  type: FinancesActivityTypeEnum;

  @ApiProperty({
    description: "Amount (positive for credits, negative for debits)",
    type: Number,
  })
  amount: number;

  @ApiProperty({ description: "Activity description", type: String })
  description: string;

  @ApiProperty({
    description: "Status",
    enum: TransactionStatusEnum,
    type: String,
  })
  status: TransactionStatusEnum;

  @ApiProperty({ description: "Creation date", type: String })
  createdAt: string;

  @ApiPropertyOptional({ description: "Related contact name", type: String })
  contactName?: string;

  @ApiPropertyOptional({ description: "Related requester name", type: String })
  requesterName?: string;
}

export class RecentActivityResponseDto {
  @ApiProperty({
    description: "Recent activity items",
    type: () => [RecentActivityItemDto],
  })
  activities: RecentActivityItemDto[];

  @ApiProperty({ description: "Total count", type: Number })
  totalCount: number;
}

export class PayoutTimelineItemDto {
  @ApiProperty({ description: "Payout ID", type: String })
  id: string;

  @ApiProperty({
    description: "Status",
    enum: TransactionStatusEnum,
    type: String,
  })
  status: TransactionStatusEnum;

  @ApiProperty({ description: "Payout amount", type: Number })
  amount: number;

  @ApiProperty({ description: "Description", type: String })
  description: string;

  @ApiProperty({ description: "Contact name", type: String })
  contactName: string;

  @ApiProperty({ description: "Created date", type: String })
  createdAt: string;

  @ApiPropertyOptional({ description: "Paid out date", type: String })
  paidOutAt?: string;
}

export class PayoutTimelineResponseDto {
  @ApiProperty({
    description: "Timeline items",
    type: () => [PayoutTimelineItemDto],
  })
  timeline: PayoutTimelineItemDto[];

  @ApiProperty({ description: "Total pending amount", type: Number })
  totalPending: number;

  @ApiProperty({ description: "Total completed amount", type: Number })
  totalCompleted: number;
}
