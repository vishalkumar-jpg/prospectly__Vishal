import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { S3Service } from "shared/s3.service";
import {
  REVEALED_STAGES,
  EARLY_ACCESS_STAGES,
  canViewCandidateDetails,
} from "./candidates-query.helpers";
import {
  CANDIDATES_MESSAGES,
  CANDIDATE_RESUME_URL_TTL_SECONDS,
} from "../candidates.constants";

@Injectable()
export class CandidatesResumeService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly moduleAccessService: ModuleAccessService,
    private readonly s3Service: S3Service
  ) {}

  /**
   * Mint a short-lived presigned GET URL for the candidate's original resume.
   *
   * Ownership/collaboration is already enforced by the route guard
   * (`@RequirePermission(CANDIDATE_VIEW, { from: "candidate" })`); this only
   * re-checks the resume-visibility business rule (same stage/early-access logic
   * as the detail payload) so the URL can never be minted before the resume is
   * meant to be visible. Returns a 404 (not 403) when hidden or absent so an
   * unauthorized resume is indistinguishable from a missing one.
   */
  async getCandidateResumeUrl(requesterId: string, candidateId: string) {
    const [row] = await this.db
      .select({
        stageKey: schema.recruitmentStagesSchema.stageKey,
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
      })
      .from(schema.recruitmentJobCandidates)
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .leftJoin(
        schema.mediaSchema,
        eq(schema.recruitmentJobCandidates.resumeMediaId, schema.mediaSchema.id)
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        CANDIDATES_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    const isRevealed =
      row.stageKey !== null && REVEALED_STAGES.has(row.stageKey);
    const earlyCandidateDetailsAccess =
      await this.moduleAccessService.isEarlyCandidateDetailsAccessEnabledForUser(
        requesterId
      );

    // Rejected candidates keep their pre-rejection visibility tier (detail API
    // already does this). Without stage history, resume URL always 404s after
    // reject even when the modal correctly shows the resume filename.
    const { reachedReviewStage, reachedRevealedStage } =
      await this.getRejectionVisibilityFlags(candidateId);

    const canViewResume = canViewCandidateDetails(
      row.stageKey,
      isRevealed,
      earlyCandidateDetailsAccess,
      reachedReviewStage,
      reachedRevealedStage
    );

    if (!canViewResume || !row.resumeFilePath) {
      throw new NotFoundException(
        CANDIDATES_MESSAGES.ERROR.RESUME_NOT_AVAILABLE
      );
    }

    const url = await this.s3Service.generatePresignedGetUrl(
      row.resumeFilePath,
      CANDIDATE_RESUME_URL_TTL_SECONDS
    );

    return {
      url,
      fileName: row.resumeFileName || null,
      expiresIn: CANDIDATE_RESUME_URL_TTL_SECONDS,
    };
  }

  private async getRejectionVisibilityFlags(candidateId: string): Promise<{
    reachedReviewStage: boolean;
    reachedRevealedStage: boolean;
  }> {
    const stageHistoryRows = await this.db
      .select({
        stageKey: schema.recruitmentStagesSchema.stageKey,
      })
      .from(schema.recruitmentCandidateStageHistory)
      .leftJoin(
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
      );

    const completedStageKeys = new Set(
      stageHistoryRows
        .map((h) => h.stageKey)
        .filter((k): k is string => k != null)
    );

    return {
      reachedRevealedStage: [...REVEALED_STAGES].some((k) =>
        completedStageKeys.has(k)
      ),
      reachedReviewStage: (EARLY_ACCESS_STAGES as readonly string[]).some((k) =>
        completedStageKeys.has(k)
      ),
    };
  }
}
