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
import { toUTC, utcDayjs } from "utils/dayjs";
import { RecruitmentLifecycleNotificationDispatchService } from "modules/recruitment/notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { truncateStageHistoryNote } from "modules/recruitment/candidate-workflow/candidate-workflow-stage-history.helper";
import { MarkInterviewOutcomeDto } from "../recruitment-payout.dto";
import {
  INTERVIEW_OUTCOMES,
  RECRUITMENT_PAYOUT_STATUS,
} from "../recruitment-payout.constants";

@Injectable()
export class RecruitmentPayoutOutcomeService {
  private readonly logger = new Logger(RecruitmentPayoutOutcomeService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async markOutcome(
    candidateId: string,
    dto: MarkInterviewOutcomeDto,
    currentUserId: string
  ) {
    const now = toUTC();

    // 1. Fetch candidate + job and verify ownership
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
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    // 2. Verify candidate is in interview_scheduled stage
    const [scheduledStage] = await this.db
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "interview_scheduled"))
      .limit(1);

    if (!scheduledStage || candidate.stageId !== scheduledStage.id) {
      throw new BadRequestException(
        "Candidate must be in interview_scheduled stage"
      );
    }

    // 3. Fetch meeting and verify meetingDate has passed
    const [meeting] = await this.db
      .select({
        id: schema.recruitmentInterviewMeetings.id,
        meetingDate: schema.recruitmentInterviewMeetings.meetingDate,
        interviewOutcome: schema.recruitmentInterviewMeetings.interviewOutcome,
      })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    if (!meeting?.meetingDate) {
      throw new NotFoundException("Interview meeting not found");
    }

    if (
      dto.outcome !== INTERVIEW_OUTCOMES.CANCELLED &&
      utcDayjs(meeting.meetingDate).isAfter(utcDayjs())
    ) {
      throw new BadRequestException(
        "Cannot mark outcome before the interview date"
      );
    }

    if (meeting.interviewOutcome) {
      throw new ConflictException("Interview outcome already marked");
    }

    // No payout rows exist yet at the interview-outcome stage — the recruiter
    // isn't charged until "Move to Hired", which is where payouts are created.

    const outcomeComment =
      dto.outcome === INTERVIEW_OUTCOMES.COMPLETED
        ? dto.completedComment || null
        : dto.comment || null;

    // 4. Transaction: update meeting, payout, stage, workflow, history
    await this.db.transaction(async (tx) => {
      // Update meeting with outcome
      await tx
        .update(schema.recruitmentInterviewMeetings)
        .set({
          interviewOutcome: dto.outcome,
          interviewOutcomeComment: outcomeComment,
          interviewOutcomeMarkedAt: now,
          interviewOutcomeMarkedBy: currentUserId,
          updatedAt: now,
          updatedBy: currentUserId,
        })
        .where(eq(schema.recruitmentInterviewMeetings.id, meeting.id));

      if (dto.outcome === INTERVIEW_OUTCOMES.COMPLETED) {
        await this.handleCompletedOutcome(tx, candidateId, currentUserId, now);
      } else {
        await this.handleFailedOutcome(
          tx,
          candidateId,
          dto.outcome,
          outcomeComment,
          currentUserId,
          now
        );
      }
    });

    if (dto.outcome === INTERVIEW_OUTCOMES.COMPLETED) {
      void this.lifecycleDispatch
        .dispatchInterviewCompleted(candidateId)
        .catch((err) => {
          this.logger.error(
            `RECRUITMENT_PAYOUT_OUTCOME_SERVICE :: markOutcome : ERROR : ${err}`
          );
        });
    } else {
      const rejectionCategory =
        dto.outcome === INTERVIEW_OUTCOMES.NO_SHOW
          ? "Interview No-Show"
          : "Interview Cancelled";
      void this.lifecycleDispatch
        .dispatchReject(
          candidateId,
          rejectionCategory,
          outcomeComment ?? "",
          currentUserId
        )
        .catch((err) => {
          this.logger.error(
            `RECRUITMENT_PAYOUT_OUTCOME_SERVICE :: markOutcome : ERROR : ${err}`
          );
        });
    }

    // Connector payouts are NOT queued here. All connector payouts (every job,
    // success fee or not) are released manually from the Hired stage, gated by
    // the per-type connector waiting period
    // (recruitment_job_prices.int/ext_connector_payout_wait_days).
    // Marking "completed" only advances the candidate to interview_completed so
    // the recruiter can move them to Hired. See RecruitmentPayoutReleaseService.
    return {
      candidateId,
      outcome: dto.outcome,
      message: "Interview outcome marked successfully",
    };
  }

  private async handleCompletedOutcome(
    tx: PostgresJsDatabase<typeof schema>,
    candidateId: string,
    userId: string,
    now: Date
  ) {
    const [completedStage] = await tx
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "interview_completed"))
      .limit(1);

    if (completedStage) {
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: completedStage.id,
          stageUpdatedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: completedStage.id,
        note: "Interview completed by recruiter",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });
    }
  }

  private async handleFailedOutcome(
    tx: PostgresJsDatabase<typeof schema>,
    candidateId: string,
    outcome: string,
    comment: string | null,
    userId: string,
    now: Date
  ) {
    // Cancel ALL non-deleted payout rows for this candidate. Split candidates
    // have two rows (claimer + sharer) — both must be cancelled together,
    // since it was the same interview that failed.
    await tx
      .update(schema.recruitmentPayoutHistory)
      .set({
        status: RECRUITMENT_PAYOUT_STATUS.CANCELLED,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    // Move candidate to rejected
    const [rejectedStage] = await tx
      .select({ id: schema.recruitmentStagesSchema.id })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, "rejected"))
      .limit(1);

    if (rejectedStage) {
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: rejectedStage.id,
          stageUpdatedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      const rejectionCategory =
        outcome === INTERVIEW_OUTCOMES.NO_SHOW
          ? "Interview No-Show"
          : "Interview Cancelled";

      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          rejectedAt: now,
          rejectionCategory,
          rejectionNote: comment,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId)
        );

      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: rejectedStage.id,
        note: truncateStageHistoryNote(
          `${rejectionCategory}${comment ? ` — ${comment}` : ""}`
        ),
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });
    }
  }
}
