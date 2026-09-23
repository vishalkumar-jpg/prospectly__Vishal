import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { RECRUITMENT_INTERVIEW_TXN_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type {
  SpendingDetailResponse,
  SpendingTimelineEvent,
} from "../requester-spending.response";
import {
  REQUESTER_SPENDING_MESSAGES,
  REQUESTER_SPENDING_TXN_TYPES,
} from "../requester-spending.constants";

@Injectable()
export class SpendingDetailService {
  private readonly logger = new Logger(SpendingDetailService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getDetail(id: string, userId: string): Promise<SpendingDetailResponse> {
    this.logger.log(
      REQUESTER_SPENDING_MESSAGES.INFO.FETCHING_DETAIL(id, userId)
    );

    const txn = schema.recruitmentInterviewTransactions;
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const pricing = schema.recruitmentJobPricesSchema;

    const rows = await this.db
      .select({
        id: txn.id,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
        candidateLabel: candidates.anonymousLabel,
        candidateFirstName: schema.users.firstName,
        candidateLastName: schema.users.lastName,
        candidateEmail: schema.users.email,
        totalAmount: txn.totalAmount,
        status: txn.status,
        transactionType: txn.transactionType,
        createdAt: txn.createdAt,
        authorizedAt: txn.authorizedAt,
        capturedAt: txn.capturedAt,
        cancelledAt: txn.cancelledAt,
        chargeAmount: txn.chargeAmount,
        receiptUrl: txn.receiptUrl,
        paymentError: txn.paymentError,
        bountyAmount: pricing.bountyAmount,
        providerFee: pricing.providerFee,
        processingFee: pricing.processingFee,
      })
      .from(txn)
      .innerJoin(jobs, eq(txn.jobId, jobs.id))
      .innerJoin(candidates, eq(txn.candidateId, candidates.id))
      .leftJoin(schema.users, eq(candidates.candidateUserId, schema.users.id))
      .leftJoin(pricing, eq(txn.jobId, pricing.jobId))
      .where(
        and(
          eq(txn.id, id),
          eq(txn.recruiterId, userId),
          inArray(txn.transactionType, [...REQUESTER_SPENDING_TXN_TYPES]),
          isNull(txn.deletedAt)
        )
      )
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException(
        REQUESTER_SPENDING_MESSAGES.ERROR.TRANSACTION_NOT_FOUND
      );
    }

    const row = rows[0];
    // Deposit is captured at shortlist (before identity reveal) → keep anonymized.
    const isDeposit =
      row.transactionType === RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_DEPOSIT;
    const showRealName = row.status === "captured" && !isDeposit;
    const realName =
      row.candidateFirstName && row.candidateLastName
        ? `${row.candidateFirstName} ${row.candidateLastName}`
        : row.candidateFirstName || null;

    return {
      id: row.id,
      jobTitle: row.jobTitle,
      companyName: row.companyName,
      candidateLabel:
        showRealName && realName
          ? realName
          : (row.candidateLabel ?? "Unknown Candidate"),
      candidateEmail: showRealName ? row.candidateEmail : null,
      totalAmount: row.totalAmount,
      status: row.status,
      transactionType: row.transactionType,
      createdAt: row.createdAt.toISOString(),
      authorizedAt: row.authorizedAt?.toISOString() ?? null,
      capturedAt: row.capturedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      chargeAmount: row.chargeAmount ?? null,
      receiptUrl: row.receiptUrl ?? null,
      paymentError: row.paymentError ?? null,
      // Only the per-interview charge has a bounty + fees split. Every other type
      // (deposit, flat/success-fee top-ups, success fee) is a single amount, so
      // skip the breakdown (the header shows the amount).
      breakdown:
        row.transactionType === RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST &&
        row.bountyAmount
          ? {
              bountyAmount: row.bountyAmount,
              providerFee: row.providerFee,
              processingFee: row.processingFee,
              totalAmount: row.totalAmount,
            }
          : null,
      timeline: this.buildTimeline(row),
    };
  }

  private buildTimeline(row: {
    createdAt: Date;
    authorizedAt: Date | null;
    capturedAt: Date | null;
    cancelledAt: Date | null;
  }): SpendingTimelineEvent[] {
    const events: SpendingTimelineEvent[] = [
      { event: "Transaction Created", date: row.createdAt.toISOString() },
    ];

    if (row.authorizedAt) {
      events.push({
        event: "Payment Authorized",
        date: row.authorizedAt.toISOString(),
      });
    }

    if (row.capturedAt) {
      events.push({
        event: "Payment Captured",
        date: row.capturedAt.toISOString(),
      });
    }

    if (row.cancelledAt) {
      events.push({
        event: "Payment Cancelled",
        date: row.cancelledAt.toISOString(),
      });
    }

    return events;
  }
}
