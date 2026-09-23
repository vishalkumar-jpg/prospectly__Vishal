import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { RECRUITMENT_INTERVIEW_TXN_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import { CANDIDATE_WORKFLOW_MESSAGES } from "../candidate-workflow.constants";
import { RecruitmentLifecycleNotificationDispatchService } from "../../notifications/services/recruitment-lifecycle-notification-dispatch.service";

@Injectable()
export class CandidateWorkflowShortlistService {
  private readonly logger = new Logger(CandidateWorkflowShortlistService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async shortlistCandidate(userId: string, candidateId: string) {
    const now = toUTC();

    const result = await this.db.transaction(async (tx) => {
      // 1. Fetch candidate + verify job ownership
      const [candidate] = await tx
        .select({
          id: schema.recruitmentJobCandidates.id,
          stageId: schema.recruitmentJobCandidates.stageId,
          jobId: schema.recruitmentJobCandidates.jobId,
        })
        .from(schema.recruitmentJobCandidates)
        // Existence guard: the candidate must belong to a live job.
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

      // 2. Look up "shortlisted" stage and validate not already shortlisted
      const [shortlistedStage] = await tx
        .select()
        .from(schema.recruitmentStagesSchema)
        .where(eq(schema.recruitmentStagesSchema.stageKey, "shortlisted"))
        .limit(1);

      if (shortlistedStage && candidate.stageId === shortlistedStage.id) {
        throw new ConflictException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.ALREADY_SHORTLISTED
        );
      }

      // 3. Check no existing active referral-fee transaction (success-fee rows
      //    are inserted later at hire, never in pending/authorized).
      const existingTxns = await tx
        .select({ id: schema.recruitmentInterviewTransactions.id })
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
            inArray(schema.recruitmentInterviewTransactions.status, [
              "pending",
              "authorized",
            ])
          )
        )
        .limit(1);

      if (existingTxns.length > 0) {
        throw new ConflictException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.ALREADY_SHORTLISTED
        );
      }

      // 4. Update candidate stage
      await tx
        .update(schema.recruitmentJobCandidates)
        .set({
          stageId: shortlistedStage?.id ?? null,
          stageUpdatedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));

      // 5. Update workflow row
      await tx
        .update(schema.recruitmentCandidateWorkflow)
        .set({
          requesterShortlisted: true,
          requesterShortlistedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(
          eq(schema.recruitmentCandidateWorkflow.candidateId, candidateId)
        );

      // 6. Insert stage history
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId,
        stageId: shortlistedStage?.id ?? null,
        note: "Shortlisted",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      return {
        candidateId,
        message: CANDIDATE_WORKFLOW_MESSAGES.SUCCESS.SHORTLISTED,
      };
    });

    void this.lifecycleDispatch
      .dispatchShortlist(candidateId, userId)
      .catch((err) => {
        this.logger.error(
          `RECRUITMENT_LIFECYCLE_DISPATCH :: shortlist :: ${err}`
        );
      });

    return result;
  }
}
