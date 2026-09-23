import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC, utcDayjs } from "utils/dayjs";
import {
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PAYOUT_CANCELLATION_REASON,
  RECRUITMENT_CONNECTOR_CLASSIFICATION,
} from "../../payout/recruitment-payout.constants";
import { CANDIDATE_WORKFLOW_MESSAGES } from "../candidate-workflow.constants";
import { HireCandidateDto } from "../candidate-workflow.dto";
import {
  InterviewBookingFlatChargeService,
  InterviewBookingSuccessFeePaymentService,
} from "../../interview-booking/services";
import { RecruitmentPayoutCreateService } from "../../payout/services/recruitment-payout-create.service";
import { RecruitmentLifecycleNotificationDispatchService } from "../../notifications/services/recruitment-lifecycle-notification-dispatch.service";

// Moves a candidate from interview_completed to hired. This is the single
// entry point for the connector payout flow (every job, success fee or not):
//
//   - Records hire_date on the candidate row (the "moved to Hired" timestamp
//     is derivable from recruitment_candidate_stage_history written below).
//   - Requires + persists per-connector classification (internal/external +
//     active-employee for internal) for ALL jobs.
//   - Cancels internal connectors that are NOT active employees with reason
//     'inactive_employee'.
//   - Does NOT queue any payout. Every payable connector row stays `pending`;
//     the recruiter releases them from the Hired stage via
//     RecruitmentPayoutReleaseService, gated by the per-type connector waiting
//     period (hire_date + int/ext connector_payout_wait_days). The success-fee row
//     (when present) likewise stays pending, released after probation.
@Injectable()
export class CandidateWorkflowHireService {
  private readonly logger = new Logger(CandidateWorkflowHireService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly flatChargeService: InterviewBookingFlatChargeService,
    private readonly successFeePaymentService: InterviewBookingSuccessFeePaymentService,
    private readonly payoutCreateService: RecruitmentPayoutCreateService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async hireCandidate(
    userId: string,
    candidateId: string,
    dto: HireCandidateDto
  ) {
    const now = toUTC();

    const hireDate = utcDayjs(dto.hireDate);
    if (!hireDate.isValid()) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.HIRE_FAILED
      );
    }
    if (hireDate.isAfter(utcDayjs())) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.HIRE_DATE_IN_FUTURE
      );
    }

    // 1. Fetch candidate + job ownership
    const [candidate] = await this.db
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
      .leftJoin(
        schema.recruitmentJobPricesSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobPricesSchema.jobId
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

    // 2. Verify candidate is in interview_completed stage
    const [completedStage, hiredStage] = await Promise.all([
      this.fetchStage("interview_completed"),
      this.fetchStage("hired"),
    ]);

    if (!completedStage || !hiredStage) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.HIRE_FAILED
      );
    }

    if (candidate.stageId !== completedStage.id) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.INVALID_STAGE_FOR_HIRE
      );
    }

    // 3. Fetch all active connectors and validate classifications cover them
    const connectors = await this.db
      .select({
        id: schema.recruitmentCandidateConnectors.id,
        connectorUserId: schema.recruitmentCandidateConnectors.connectorUserId,
      })
      .from(schema.recruitmentCandidateConnectors)
      .where(
        and(
          eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      );

    if (connectors.length === 0) {
      throw new BadRequestException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.MISSING_CONNECTOR_CLASSIFICATIONS
      );
    }

    const classificationByConnector = new Map<
      string,
      (typeof dto.classifications)[number]
    >();
    for (const c of dto.classifications) {
      classificationByConnector.set(c.connectorUserId, c);
    }

    // Classification is required for EVERY connector on EVERY job — it drives
    // the per-connector waiting-period gate (internal vs external) and the
    // inactive-employee skip rule at Release time.
    for (const conn of connectors) {
      const cls = classificationByConnector.get(conn.connectorUserId);
      if (!cls) {
        throw new BadRequestException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.MISSING_CONNECTOR_CLASSIFICATIONS
        );
      }
      if (
        cls.classificationType ===
          RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL &&
        cls.isActiveEmployee === undefined
      ) {
        throw new BadRequestException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.INTERNAL_REQUIRES_ACTIVE_FLAG
        );
      }
    }

    // 3b. The recruiter is charged at HIRE (not at booking). Charge the pending
    //     referral fee (remainder for the first hire on the job, full for later
    //     hires), the success fee if any, and create the connector payout rows —
    //     all BEFORE the payouts fetch below so the inactive-internal
    //     cancellation in the transaction sees them. Stripe calls run outside
    //     the hire transaction; a failure throws and blocks the hire (candidate
    //     stays in Interview Completed). Each service is idempotent, so a
    //     retried hire after a partial failure is safe.
    await this.flatChargeService.chargeFlatInterviewFee(candidateId);
    await this.successFeePaymentService.captureSuccessFeePayment(candidateId);
    await this.payoutCreateService.createPayoutRecord(
      this.db,
      candidateId,
      candidate.jobId
    );

    // 4. Fetch pending connector payout rows so inactive-internal connectors
    //    can be cancelled at hire. (The candidate success-fee row, if any, is
    //    not in the classification map and is left untouched.)
    const payouts = await this.db
      .select({
        id: schema.recruitmentPayoutHistory.id,
        recipientId: schema.recruitmentPayoutHistory.recipientId,
        status: schema.recruitmentPayoutHistory.status,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    // 5. Transaction: record hire + classifications + cancel inactive-internal.
    //    No payout is queued here — every payable connector row stays `pending`
    //    and is released manually from the Hired stage.
    const skippedInactive: string[] = [];

    await this.db.transaction(async (tx) => {
      // a. Update candidate: hire_date + stage (the "moved to Hired" system
      // timestamp is captured by the stage_history insert in step (c)).
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: hiredStage.id,
          stageUpdatedAt: now,
          hireDate: hireDate.toDate(),
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      // b. Persist classification on each connector mapping row
      for (const cls of dto.classifications) {
        await tx
          .update(schema.recruitmentCandidateConnectors)
          .set({
            classificationType: cls.classificationType,
            isActiveEmployee:
              cls.classificationType ===
              RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
                ? (cls.isActiveEmployee ?? null)
                : null,
          })
          .where(
            and(
              eq(
                schema.recruitmentCandidateConnectors.candidateId,
                candidateId
              ),
              eq(
                schema.recruitmentCandidateConnectors.connectorUserId,
                cls.connectorUserId
              ),
              isNull(schema.recruitmentCandidateConnectors.deletedAt)
            )
          );
      }

      // c. Stage history
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: hiredStage.id,
        note: `Candidate hired (start ${hireDate.format("YYYY-MM-DD")})`,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      // d. Cancel inactive internal connectors. Everything else stays pending
      //    for manual release.
      for (const payout of payouts) {
        if (payout.status !== RECRUITMENT_PAYOUT_STATUS.PENDING) continue;

        const cls = classificationByConnector.get(payout.recipientId);
        if (!cls) continue;

        if (
          cls.classificationType ===
            RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL &&
          cls.isActiveEmployee === false
        ) {
          await tx
            .update(schema.recruitmentPayoutHistory)
            .set({
              status: RECRUITMENT_PAYOUT_STATUS.CANCELLED,
              cancellationReason:
                RECRUITMENT_PAYOUT_CANCELLATION_REASON.INACTIVE_EMPLOYEE,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(schema.recruitmentPayoutHistory.id, payout.id));
          skippedInactive.push(payout.id);
        }
      }
    });

    void this.lifecycleDispatch
      .dispatchHire(candidateId, userId)
      .catch((err) => {
        this.logger.error(`RECRUITMENT_LIFECYCLE_DISPATCH :: hire :: ${err}`);
      });

    return {
      candidateId,
      stage: "hired",
      hireDate: hireDate.toISOString(),
      skippedInactive: skippedInactive.length,
      message: CANDIDATE_WORKFLOW_MESSAGES.SUCCESS.HIRED,
    };
  }

  private async fetchStage(stageKey: string) {
    const [row] = await this.db
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, stageKey))
      .limit(1);
    return row;
  }
}
