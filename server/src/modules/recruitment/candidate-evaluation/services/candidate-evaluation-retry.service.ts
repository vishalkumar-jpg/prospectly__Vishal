import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { CandidateEvaluationQueueService } from "../candidate-evaluation-queue.service";
import {
  CANDIDATE_EVALUATION_CONFIG,
  CANDIDATE_EVALUATION_MESSAGES,
  MAX_CANDIDATE_EVALUATION_RETRIES,
} from "../candidate-evaluation.constants";

@Injectable()
export class CandidateEvaluationRetryService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queueService: CandidateEvaluationQueueService
  ) {}

  async retryEvaluation(candidateId: string, userId: string): Promise<void> {
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
        evaluationRetryCount:
          schema.recruitmentJobCandidates.evaluationRetryCount,
      })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          eq(schema.recruitmentJobCandidates.candidateUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) {
      throw new NotFoundException(
        CANDIDATE_EVALUATION_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    if (
      candidate.analysisStatus !==
      CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.FAILED
    ) {
      throw new BadRequestException(
        CANDIDATE_EVALUATION_MESSAGES.ERROR.EVALUATION_NOT_FAILED
      );
    }

    if (candidate.evaluationRetryCount >= MAX_CANDIDATE_EVALUATION_RETRIES) {
      throw new BadRequestException(
        CANDIDATE_EVALUATION_MESSAGES.ERROR.EVALUATION_MAX_RETRIES
      );
    }

    const found = await this.queueService.retryExistingJob(candidateId);
    if (!found) {
      await this.queueService.queueAnalysis({
        candidateId,
        jobId: candidate.jobId,
        userId,
      });
    }

    const [updated] = await this.db
      .update(schema.recruitmentJobCandidates)
      .set({
        analysisStatus: CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING,
        analysisAt: null,
        evaluationRetryCount: sql`${schema.recruitmentJobCandidates.evaluationRetryCount} + 1`,
        updatedAt: toUTC(),
      })
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          eq(schema.recruitmentJobCandidates.candidateUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt),
          eq(
            schema.recruitmentJobCandidates.analysisStatus,
            CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.FAILED
          ),
          lt(
            schema.recruitmentJobCandidates.evaluationRetryCount,
            MAX_CANDIDATE_EVALUATION_RETRIES
          )
        )
      )
      .returning({ id: schema.recruitmentJobCandidates.id });

    if (!updated) {
      throw new BadRequestException(
        CANDIDATE_EVALUATION_MESSAGES.ERROR.EVALUATION_NOT_FAILED
      );
    }
  }
}
