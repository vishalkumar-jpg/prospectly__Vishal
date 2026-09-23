import { Injectable, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_INTERVIEW_TXN_TYPE,
} from "../recruitment-payout.constants";
import { CandidateConnectorsService } from "../../candidate-connectors/candidate-connectors.service";
import { CANDIDATE_CONNECTOR_ROLE } from "../../candidate-connectors/candidate-connectors.constants";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";

// Creates one or more pending payout_history rows when a candidate books an
// interview and payment is captured. Reads the candidate-connector mapping
// table to decide between single (one row, 80%) and split (two rows, 40%
// each, both flagged as marketplace deal).
@Injectable()
export class RecruitmentPayoutCreateService {
  private readonly logger = new Logger(RecruitmentPayoutCreateService.name);

  constructor(
    private readonly candidateConnectorsService: CandidateConnectorsService,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async createPayoutRecord(
    tx: PostgresJsDatabase<typeof schema>,
    candidateId: string,
    jobId: string
  ): Promise<void> {
    const now = toUTC();

    // 1. Get bounty amount from job pricing
    const [pricing] = await tx
      .select({ bountyAmount: schema.recruitmentJobPricesSchema.bountyAmount })
      .from(schema.recruitmentJobPricesSchema)
      .where(
        and(
          eq(schema.recruitmentJobPricesSchema.jobId, jobId),
          isNull(schema.recruitmentJobPricesSchema.deletedAt)
        )
      )
      .limit(1);

    if (!pricing?.bountyAmount) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CREATE :: createPayoutRecord : ERROR : No pricing found for job ${jobId}`
      );
      return;
    }

    // 2. Get connector attribution for this candidate from the mapping table
    const connectors =
      await this.candidateConnectorsService.getConnectorsByCandidate(
        tx,
        candidateId
      );

    if (connectors.length === 0) {
      this.logger.warn(
        `RECRUITMENT_PAYOUT_CREATE :: createPayoutRecord : No connectors for candidate ${candidateId}, skipping payout record`
      );
      return;
    }

    // 3. Get the BOUNTY transaction (success-fee row, if any, is fetched
    //    later in maybeCreateCandidateSuccessFeeRow).
    const [transaction] = await tx
      .select({
        id: schema.recruitmentInterviewTransactions.id,
        recruiterId: schema.recruitmentInterviewTransactions.recruiterId,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    if (!transaction) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CREATE :: createPayoutRecord : ERROR : No transaction found for candidate ${candidateId}`
      );
      return;
    }

    // 4. Get meeting record
    const [meeting] = await tx
      .select({ id: schema.recruitmentInterviewMeetings.id })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    if (!meeting) {
      this.logger.error(
        `RECRUITMENT_PAYOUT_CREATE :: createPayoutRecord : ERROR : No meeting found for candidate ${candidateId}`
      );
      return;
    }

    // 5. Determine split vs single based on mapping table roles
    const grossAmount = Number(pricing.bountyAmount);
    const isSplit = connectors.some(
      (c) =>
        c.role === CANDIDATE_CONNECTOR_ROLE.CLAIMER ||
        c.role === CANDIDATE_CONNECTOR_ROLE.SHARER
    );

    // Build the row(s) to insert. Each row's recipientAmount comes from
    // RecruitmentFeeConfigService.getConnectorPayoutBreakdown so the persisted
    // amount matches the read-side connector-pipeline payout exactly.
    const rows = this.buildPayoutRows({ connectors, grossAmount });

    // 6. Insert payout record(s). Idempotent via unique (candidate, job, recipient).
    for (const row of rows) {
      await tx
        .insert(schema.recruitmentPayoutHistory)
        .values({
          candidateId,
          jobId,
          recruiterId: transaction.recruiterId,
          interviewTransactionId: transaction.id,
          interviewMeetingId: meeting.id,
          payoutType: RECRUITMENT_PAYOUT_TYPE.CONNECTOR,
          recipientId: row.recipientId,
          grossAmount: grossAmount.toFixed(2),
          recipientAmount: row.recipientAmount,
          platformAmount: row.platformAmount,
          currency: "usd",
          status: "pending",
          processingStatus: "pending",
          isMarketplaceDeal: isSplit,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [
            schema.recruitmentPayoutHistory.candidateId,
            schema.recruitmentPayoutHistory.jobId,
            schema.recruitmentPayoutHistory.recipientId,
          ],
          where: sql`deleted_at IS NULL`,
        });
    }

    // 7. Candidate success-fee (bonus) row — only when the job has a Success Fee.
    // 100% goes to the candidate (no platform cut).
    await this.maybeCreateCandidateSuccessFeeRow(tx, {
      candidateId,
      jobId,
      now,
    });
  }

  private async maybeCreateCandidateSuccessFeeRow(
    tx: PostgresJsDatabase<typeof schema>,
    params: { candidateId: string; jobId: string; now: Date }
  ): Promise<void> {
    const { candidateId, jobId, now } = params;

    const [pricing] = await tx
      .select({
        hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
        successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      })
      .from(schema.recruitmentJobPricesSchema)
      .where(
        and(
          eq(schema.recruitmentJobPricesSchema.jobId, jobId),
          isNull(schema.recruitmentJobPricesSchema.deletedAt)
        )
      )
      .limit(1);

    if (!pricing?.hasSuccessFee || !pricing.successFeeAmount) return;

    await this.createCandidateSuccessFeeRow(tx, {
      candidateId,
      jobId,
      successFeeAmount: Number(pricing.successFeeAmount),
      now,
    });
  }

  /**
   * Backfills pending candidate-bonus rows for every candidate already in the
   * hired stage on a job whose Success Fee was just enabled — so the "Release
   * Candidate Bonus" action appears for them. Their funding is `0` (they were
   * booked before the fee existed) and is charged in full at release. Idempotent
   * via the unique (candidate, job, recipient) index.
   */
  async backfillCandidateSuccessFeeRows(
    tx: PostgresJsDatabase<typeof schema>,
    jobId: string
  ): Promise<void> {
    const now = toUTC();

    const [pricing] = await tx
      .select({
        hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
        successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      })
      .from(schema.recruitmentJobPricesSchema)
      .where(
        and(
          eq(schema.recruitmentJobPricesSchema.jobId, jobId),
          isNull(schema.recruitmentJobPricesSchema.deletedAt)
        )
      )
      .limit(1);

    if (!pricing?.hasSuccessFee || !pricing.successFeeAmount) return;
    const successFeeAmount = Number(pricing.successFeeAmount);

    const [hiredStage] = await tx
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "hired"))
      .limit(1);

    if (!hiredStage) return;

    const hiredCandidates = await tx
      .select({ id: schema.recruitmentJobCandidates.id })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.jobId, jobId),
          eq(schema.recruitmentJobCandidates.stageId, hiredStage.id),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      );

    for (const candidate of hiredCandidates) {
      await this.createCandidateSuccessFeeRow(tx, {
        candidateId: candidate.id,
        jobId,
        successFeeAmount,
        now,
      });
    }
  }

  // Inserts one pending candidate success-fee (bonus) row, 100% to the candidate.
  // Links to the success-fee charge when it exists; otherwise to the interview_cost
  // charge (the Success Fee was enabled after this candidate booked, so no
  // success-fee charge was taken — the full amount is charged at release instead).
  // No-op when the candidate has no interview_cost charge or meeting yet.
  private async createCandidateSuccessFeeRow(
    tx: PostgresJsDatabase<typeof schema>,
    params: {
      candidateId: string;
      jobId: string;
      successFeeAmount: number;
      now: Date;
    }
  ): Promise<void> {
    const { candidateId, jobId, successFeeAmount, now } = params;

    const [interviewCostTxn] = await tx
      .select({
        id: schema.recruitmentInterviewTransactions.id,
        recruiterId: schema.recruitmentInterviewTransactions.recruiterId,
      })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    if (!interviewCostTxn) return;

    const [meeting] = await tx
      .select({ id: schema.recruitmentInterviewMeetings.id })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    if (!meeting) return;

    const [candidateRow] = await tx
      .select({
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
      })
      .from(schema.recruitmentJobCandidates)
      .where(eq(schema.recruitmentJobCandidates.id, candidateId))
      .limit(1);

    if (!candidateRow) return;

    const [successFeeTxn] = await tx
      .select({ id: schema.recruitmentInterviewTransactions.id })
      .from(schema.recruitmentInterviewTransactions)
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .limit(1);

    await tx
      .insert(schema.recruitmentPayoutHistory)
      .values({
        candidateId,
        jobId,
        recruiterId: interviewCostTxn.recruiterId,
        interviewTransactionId: successFeeTxn?.id ?? interviewCostTxn.id,
        interviewMeetingId: meeting.id,
        payoutType: RECRUITMENT_PAYOUT_TYPE.CANDIDATE,
        recipientId: candidateRow.candidateUserId,
        grossAmount: successFeeAmount.toFixed(2),
        recipientAmount: this.feeConfig.splitAmount(
          successFeeAmount,
          this.feeConfig.getCandidateSuccessFeeRecipientPercent()
        ),
        platformAmount: this.feeConfig.splitAmount(
          successFeeAmount,
          this.feeConfig.getCandidateSuccessFeePlatformPercent()
        ),
        currency: "usd",
        status: "pending",
        processingStatus: "pending",
        isMarketplaceDeal: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [
          schema.recruitmentPayoutHistory.candidateId,
          schema.recruitmentPayoutHistory.jobId,
          schema.recruitmentPayoutHistory.recipientId,
        ],
        where: sql`deleted_at IS NULL`,
      });
  }

  // Builds one row per connector. The math (recipient and platform slice)
  // lives in RecruitmentFeeConfigService.getConnectorPayoutBreakdown so the
  // single-connector and split branches collapse into one map call, and the
  // persisted recipient amount stays in lockstep with the read-side payout
  // shown on the connector pipeline.
  private buildPayoutRows(params: {
    connectors: Array<{ connectorUserId: string; sharePercent: number }>;
    grossAmount: number;
  }): Array<{
    recipientId: string;
    recipientAmount: string;
    platformAmount: string;
  }> {
    const { connectors, grossAmount } = params;
    return connectors.map((c) => {
      const { recipientAmount, platformAmount } =
        this.feeConfig.getConnectorPayoutBreakdown(grossAmount, c.sharePercent);
      return {
        recipientId: c.connectorUserId,
        recipientAmount,
        platformAmount,
      };
    });
  }
}
