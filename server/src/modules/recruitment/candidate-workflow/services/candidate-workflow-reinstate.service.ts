import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, desc } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { ReinstateCandidateDto } from "../candidate-workflow.dto";
import { truncateStageHistoryNote } from "../candidate-workflow-stage-history.helper";
import {
  REINSTATE_PIPELINE_STAGES,
  REINSTATE_STAGE_KEYS,
  reinstateStageOrder,
  REINSTATE_UNAVAILABLE_REASON,
  REINSTATE_INVITE_SENT_ORDER,
  CANDIDATE_REINSTATE_MESSAGES,
} from "../candidate-workflow-reinstate.constants";

export interface ReinstateStageOption {
  stageKey: string;
  label: string;
  /** False when the stage was reached but is a dead end — render it disabled. */
  available: boolean;
  /** Human-readable explanation shown next to a disabled option. */
  unavailableReason: string | null;
}

export interface ReinstateOptionsResponse {
  candidateId: string;
  /** Current stage key; the options list is only non-empty when this is `rejected`. */
  currentStageKey: string | null;
  /** The stage the candidate was in immediately before being rejected. */
  rejectedFromStageKey: string | null;
  /** Ordered earliest → latest. Never contains a stage the candidate never reached. */
  options: ReinstateStageOption[];
}

interface CandidateContext {
  candidateId: string;
  jobId: string;
  currentStageKey: string | null;
  currentStageId: number | null;
}

/**
 * Moves a REJECTED candidate back to a stage they previously occupied.
 *
 * Deliberately a brand-new service rather than a branch inside the reject or
 * shortlist services, so no existing flow changes behaviour.
 *
 * MONEY: this service issues no Stripe call and writes no
 * `recruitment_interview_transactions` row. See
 * candidate-workflow-reinstate.constants.ts for why that is safe.
 *
 * SAFETY: the option list is derived server-side from
 * `recruitment_candidate_stage_history`, and the write path re-derives it and
 * re-validates the requested target against it. The client can therefore never
 * push a candidate into a stage they never actually reached — which is what
 * keeps `Move to Hired` on the well-tested path (a candidate can only land in
 * `interview_completed` if they genuinely completed an interview, so the hire
 * charge always has the meeting row that `createPayoutRecord` needs).
 */
@Injectable()
export class CandidateWorkflowReinstateService {
  private readonly logger = new Logger(CandidateWorkflowReinstateService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /** Read-only: what the "Move Back to Stage" dropdown should show. */
  async getReinstateOptions(
    candidateId: string
  ): Promise<ReinstateOptionsResponse> {
    const candidate = await this.fetchCandidateContext(this.db, candidateId);

    // Not rejected → nothing to offer. Returned as an empty list rather than an
    // error so the read endpoint stays safe to call from any card.
    if (candidate.currentStageKey !== "rejected") {
      return {
        candidateId,
        currentStageKey: candidate.currentStageKey,
        rejectedFromStageKey: null,
        options: [],
      };
    }

    const { options, rejectedFromStageKey } = await this.buildOptions(
      this.db,
      candidateId
    );

    return {
      candidateId,
      currentStageKey: candidate.currentStageKey,
      rejectedFromStageKey,
      options,
    };
  }

  /**
   * Write path: validate + move inside one transaction so concurrent
   * reinstate/reject/shortlist cannot race past the "must be rejected" check.
   */
  async reinstateCandidate(
    userId: string,
    candidateId: string,
    dto: ReinstateCandidateDto
  ) {
    const now = toUTC();

    try {
      const result = await this.db.transaction(async (tx) => {
        const candidate = await this.fetchCandidateContext(tx, candidateId);

        if (
          candidate.currentStageKey !== "rejected" ||
          candidate.currentStageId == null
        ) {
          throw new BadRequestException(
            CANDIDATE_REINSTATE_MESSAGES.ERROR.NOT_REJECTED
          );
        }

        // Job status is intentionally NOT gated here. Shortlist / hire / reject
        // already work on closed jobs; blocking only Move Back was inconsistent.
        // Fee capture still happens only at Hire, same as any other closed-job hire.

        // Re-derive the allow-list on the same connection as the write.
        const { options } = await this.buildOptions(tx, candidateId);
        const target = options.find((o) => o.stageKey === dto.targetStageKey);

        if (!target) {
          throw new BadRequestException(
            options.length === 0
              ? CANDIDATE_REINSTATE_MESSAGES.ERROR.NO_STAGES_AVAILABLE
              : CANDIDATE_REINSTATE_MESSAGES.ERROR.STAGE_NOT_ALLOWED
          );
        }

        if (!target.available) {
          throw new BadRequestException(
            target.unavailableReason ??
              CANDIDATE_REINSTATE_MESSAGES.ERROR.STAGE_NOT_ALLOWED
          );
        }

        const [targetStage] = await tx
          .select({
            id: schema.recruitmentStagesSchema.id,
            label: schema.recruitmentStagesSchema.label,
          })
          .from(schema.recruitmentStagesSchema)
          .where(
            eq(schema.recruitmentStagesSchema.stageKey, dto.targetStageKey)
          )
          .limit(1);

        if (!targetStage) {
          throw new BadRequestException(
            CANDIDATE_REINSTATE_MESSAGES.ERROR.STAGE_NOT_CONFIGURED
          );
        }

        // Optimistic guard: still rejected at write time (concurrent move loses).
        const moved = await tx
          .update(schema.recruitmentJobCandidates)
          .set({
            stageId: targetStage.id,
            stageUpdatedAt: now,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(schema.recruitmentJobCandidates.id, candidateId),
              eq(
                schema.recruitmentJobCandidates.stageId,
                candidate.currentStageId
              ),
              isNull(schema.recruitmentJobCandidates.deletedAt)
            )
          )
          .returning({ id: schema.recruitmentJobCandidates.id });

        if (moved.length === 0) {
          throw new ConflictException(
            CANDIDATE_REINSTATE_MESSAGES.ERROR.NOT_REJECTED
          );
        }

        // Clear rejection so workflow-derived surfaces stop reading "Rejected".
        // `requesterShortlisted*` left alone — shortlist keys off stageId.
        await tx
          .update(schema.recruitmentCandidateWorkflow)
          .set({
            rejectedAt: null,
            rejectionCategory: null,
            rejectionNote: null,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(
            and(
              eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId),
              isNull(schema.recruitmentCandidateWorkflow.deletedAt)
            )
          );

        await this.resetInterviewState(tx, {
          candidateId,
          targetStageKey: dto.targetStageKey,
          userId,
          now,
        });

        await tx.insert(schema.recruitmentCandidateStageHistory).values({
          candidateId,
          stageId: targetStage.id,
          note: truncateStageHistoryNote(
            `Moved back to ${targetStage.label ?? target.label} from Rejected`
          ),
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });

        return {
          stageKey: dto.targetStageKey,
          stageLabel: targetStage.label ?? target.label,
        };
      });

      return {
        candidateId,
        stageKey: result.stageKey,
        stageLabel: result.stageLabel,
        message: CANDIDATE_REINSTATE_MESSAGES.SUCCESS.REINSTATED,
      };
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_REINSTATE_SERVICE :: REINSTATE_CANDIDATE : ERROR : ${error}`
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        CANDIDATE_REINSTATE_MESSAGES.ERROR.REINSTATE_FAILED
      );
    }
  }

  /**
   * Builds the allow-list: every reinstate-eligible stage the candidate has
   * actually been in, ordered earliest → latest, capped at the stage they were
   * rejected from. A stage the candidate never occupied is never returned.
   */
  private async buildOptions(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<{
    options: ReinstateStageOption[];
    rejectedFromStageKey: string | null;
  }> {
    // Full stage history, newest first, joined to stage keys.
    const history = await db
      .select({
        stageKey: schema.recruitmentStagesSchema.stageKey,
        createdAt: schema.recruitmentCandidateStageHistory.createdAt,
      })
      .from(schema.recruitmentCandidateStageHistory)
      .innerJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentCandidateStageHistory.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .where(
        and(
          eq(schema.recruitmentCandidateStageHistory.candidateId, candidateId),
          isNull(schema.recruitmentCandidateStageHistory.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentCandidateStageHistory.createdAt));

    // The stage the candidate held immediately before the rejection: the most
    // recent history row that is a reinstate-eligible pipeline stage.
    const rejectedFromStageKey =
      history.find((h) => REINSTATE_STAGE_KEYS.includes(h.stageKey))
        ?.stageKey ?? null;

    if (!rejectedFromStageKey) {
      return { options: [], rejectedFromStageKey: null };
    }

    const reachedStageKeys = new Set(
      history
        .map((h) => h.stageKey)
        .filter((key) => REINSTATE_STAGE_KEYS.includes(key))
    );
    const cap = reinstateStageOrder(rejectedFromStageKey);

    // A candidate auto-rejected by a no-show/cancelled outcome IS allowed back
    // to Interview Scheduled — the reinstate transaction clears the recorded
    // outcome so `markOutcome` can run again (that is how a mis-clicked
    // "No-Show" is undone). The only genuine dead end left is a missing meeting
    // row, without which `markOutcome` throws "Interview meeting not found".
    const hasMeeting = await this.hasInterviewMeeting(db, candidateId);

    const options: ReinstateStageOption[] = REINSTATE_PIPELINE_STAGES.filter(
      (stage) =>
        reachedStageKeys.has(stage.stageKey) &&
        reinstateStageOrder(stage.stageKey) <= cap
    ).map((stage) => {
      const blocked = stage.stageKey === "interview_scheduled" && !hasMeeting;

      return {
        stageKey: stage.stageKey,
        label: stage.label,
        available: !blocked,
        unavailableReason: blocked
          ? REINSTATE_UNAVAILABLE_REASON.MEETING_MISSING
          : null,
      };
    });

    return { options, rejectedFromStageKey };
  }

  /** True when the candidate still has a live interview meeting row. */
  private async hasInterviewMeeting(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<boolean> {
    const [meeting] = await db
      .select({ id: schema.recruitmentInterviewMeetings.id })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .limit(1);

    return !!meeting;
  }

  private async fetchCandidateContext(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<CandidateContext> {
    const [candidate] = await db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        currentStageId: schema.recruitmentJobCandidates.stageId,
        currentStageKey: schema.recruitmentStagesSchema.stageKey,
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
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
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
        CANDIDATE_REINSTATE_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    return {
      candidateId: candidate.id,
      jobId: candidate.jobId,
      currentStageKey: candidate.currentStageKey ?? null,
      currentStageId: candidate.currentStageId ?? null,
    };
  }

  /**
   * Clears interview state that would otherwise strand a reinstated candidate.
   *
   * Two problems this solves, both only reachable because reinstate is the
   * first flow that can move a candidate BACKWARDS:
   *
   * 1. `markOutcome` throws "Interview outcome already marked" on a second
   *    call. A candidate auto-rejected by a no-show/cancelled outcome could
   *    therefore re-interview but never reach Interview Completed — and so
   *    never be hired. Clearing the recorded outcome reopens that path (and is
   *    what lets a recruiter undo a mis-clicked "No-Show").
   * 2. `recruitment_interview_meetings.candidate_id` is a plain index, NOT
   *    unique. Sending a fresh invite from Shortlisted takes the INSERT branch
   *    of the invite service, so a candidate returned to Shortlisted while an
   *    old meeting row survives would end up with TWO meeting rows — and every
   *    consumer reads one with `.limit(1)` and no ordering. Soft-deleting the
   *    old row keeps exactly one live meeting per candidate.
   *
   * By target stage:
   *   - `interview_completed` → nothing (the recorded outcome is still true).
   *   - `interview_scheduled` → clear the outcome; the meeting itself is kept
   *     so the recruiter can simply re-mark it.
   *   - `interview_invite_sent` → clear the outcome and reset the meeting to a
   *     pristine invite, mirroring what the reschedule path already does.
   *   - `shortlisted` / `in_review` → soft-delete the meeting entirely; the
   *     next invite creates a clean one.
   *
   * The booking token is cleared for every target at or before
   * `interview_invite_sent`, so the candidate's old booking link cannot be used
   * while the recruiter decides what to do next. Resending the invite mints a
   * fresh token and link.
   */
  private async resetInterviewState(
    tx: PostgresJsDatabase<typeof schema>,
    params: {
      candidateId: string;
      targetStageKey: string;
      userId: string;
      now: Date;
    }
  ): Promise<void> {
    const { candidateId, targetStageKey, userId, now } = params;
    const targetOrder = reinstateStageOrder(targetStageKey);

    if (targetStageKey === "interview_completed") {
      return;
    }

    const meetingWhere = and(
      eq(schema.recruitmentInterviewMeetings.candidateId, candidateId),
      isNull(schema.recruitmentInterviewMeetings.deletedAt)
    );

    const clearedOutcome = {
      interviewOutcome: null,
      interviewOutcomeComment: null,
      interviewOutcomeMarkedAt: null,
      interviewOutcomeMarkedBy: null,
      updatedAt: now,
      updatedBy: userId,
    };

    if (targetStageKey === "interview_scheduled") {
      await tx
        .update(schema.recruitmentInterviewMeetings)
        .set(clearedOutcome)
        .where(meetingWhere);
      return;
    }

    if (targetStageKey === "interview_invite_sent") {
      await tx
        .update(schema.recruitmentInterviewMeetings)
        .set({
          ...clearedOutcome,
          status: "invite_sent",
          meetingDate: null,
          meetingLink: null,
          calendarEventId: null,
          calendarProvider: null,
          meetingPlatform: null,
        })
        .where(meetingWhere);
    } else {
      // shortlisted / in_review — the interview cycle is void.
      await tx
        .update(schema.recruitmentInterviewMeetings)
        .set({ deletedAt: now, updatedAt: now, updatedBy: userId })
        .where(meetingWhere);
    }

    if (targetOrder <= REINSTATE_INVITE_SENT_ORDER) {
      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          interviewBookingToken: null,
          interviewBookingTokenExpiresAt: null,
          interviewScheduledAt: null,
          interviewMeetingLink: null,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          and(
            eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId),
            isNull(schema.recruitmentCandidateWorkflow.deletedAt)
          )
        );
    }
  }
}
