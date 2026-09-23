import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { StripeService } from "modules/stripe/stripe.service";
import { RECRUITMENT_INTERVIEW_TXN_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import { RecruitmentLifecycleNotificationDispatchService } from "modules/recruitment/notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { RejectCandidateDto } from "../candidate-workflow.dto";
import {
  REJECTION_CATEGORIES,
  CANDIDATE_WORKFLOW_MESSAGES,
} from "../candidate-workflow.constants";
import { truncateStageHistoryNote } from "../candidate-workflow-stage-history.helper";

@Injectable()
export class CandidateWorkflowRejectService {
  private readonly logger = new Logger(CandidateWorkflowRejectService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async rejectCandidate(
    userId: string,
    candidateId: string,
    dto: RejectCandidateDto
  ) {
    const now = toUTC();

    // 1. Validate category
    if (
      !REJECTION_CATEGORIES.includes(
        dto.category as (typeof REJECTION_CATEGORIES)[number]
      )
    ) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.INVALID_REJECTION_CATEGORY
      );
    }

    const result = await this.db.transaction(async (tx) => {
      // 2. Fetch candidate + verify job ownership
      const [candidate] = await tx
        .select({
          id: schema.recruitmentJobCandidates.id,
          stageId: schema.recruitmentJobCandidates.stageId,
          jobId: schema.recruitmentJobCandidates.jobId,
          requesterId: schema.recruitmentJobsSchema.requesterId,
        })
        .from(schema.recruitmentJobCandidates)
        .innerJoin(
          schema.recruitmentJobsSchema,
          eq(
            schema.recruitmentJobCandidates.jobId,
            schema.recruitmentJobsSchema.id
          )
        )
        .where(
          and(
            eq(schema.recruitmentJobCandidates.id, candidateId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        )
        .limit(1);

      if (!candidate) {
        throw new NotFoundException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
        );
      }

      // 3. Look up "rejected" stage
      const [rejectedStage] = await tx
        .select()
        .from(schema.recruitmentStagesSchema)
        .where(eq(schema.recruitmentStagesSchema.stageKey, "rejected"))
        .limit(1);

      // 4. Check not already rejected
      if (rejectedStage && candidate.stageId === rejectedStage.id) {
        throw new ConflictException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.ALREADY_REJECTED
        );
      }

      // 5. Cancel authorized bounty PaymentIntent if candidate was shortlisted.
      //    Success-fee rows are never in 'authorized' state (they're inserted
      //    already 'captured' at booking-confirm), so the type filter is
      //    defensive but explicit.
      //
      //    Flat-referral jobs are a natural no-op here: nothing is authorized at
      //    shortlist (only the one-time deposit is captured, and the scheduling
      //    interview_cost charge is inserted already 'captured'). Both are
      //    non-refundable by design, so the status='authorized' filter below
      //    simply finds nothing and reject proceeds without a Stripe call.
      const [activeTxn] = await tx
        .select({
          id: schema.recruitmentInterviewTransactions.id,
          intentId: schema.recruitmentInterviewTransactions.intentId,
        })
        .from(schema.recruitmentInterviewTransactions)
        .where(
          and(
            eq(
              schema.recruitmentInterviewTransactions.candidateId,
              candidateId
            ),
            eq(
              schema.recruitmentInterviewTransactions.transactionType,
              RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
            ),
            eq(schema.recruitmentInterviewTransactions.status, "authorized")
          )
        )
        .limit(1);

      if (activeTxn?.intentId) {
        try {
          await this.stripeService.cancelPaymentIntent(activeTxn.intentId);
          await tx
            .update(schema.recruitmentInterviewTransactions)
            .set({
              status: "cancelled",
              cancelledAt: now,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(
              eq(schema.recruitmentInterviewTransactions.id, activeTxn.id)
            );
        } catch (error) {
          this.logger.error(
            `CANDIDATE_WORKFLOW_REJECT_SERVICE :: REJECT_CANDIDATE : CANCEL PAYMENT ERROR : ${error}`
          );
          // Don't block rejection — the hold will auto-expire
          await tx
            .update(schema.recruitmentInterviewTransactions)
            .set({
              status: "cancelled",
              cancelledAt: now,
              paymentError: String(error),
              updatedAt: now,
              updatedBy: userId,
            })
            .where(
              eq(schema.recruitmentInterviewTransactions.id, activeTxn.id)
            );
        }
      }

      // 6. Update candidate stage
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: rejectedStage?.id ?? null,
          stageUpdatedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      // 7. Update workflow row
      const noteText = `Rejected: ${dto.category} — ${dto.note}`;

      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          rejectedAt: now,
          rejectionCategory: dto.category,
          rejectionNote: dto.note,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId)
        );

      // 8. Insert stage history (note column is varchar(500))
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: rejectedStage?.id ?? null,
        note: truncateStageHistoryNote(noteText),
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      return {
        candidateId,
        message: CANDIDATE_WORKFLOW_MESSAGES.SUCCESS.REJECTED,
      };
    });

    void this.lifecycleDispatch
      .dispatchReject(candidateId, dto.category, dto.note, userId)
      .catch((err) => {
        this.logger.error(
          `CANDIDATE_WORKFLOW_REJECT_SERVICE :: REJECT_CANDIDATE : NOTIFICATION ERROR : ${err}`
        );
      });

    return result;
  }
}
