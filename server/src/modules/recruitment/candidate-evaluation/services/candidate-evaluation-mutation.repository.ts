import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { CandidateEvaluationResult } from "../candidate-evaluation.constants";
import { CANDIDATE_EVALUATION_CONFIG } from "../candidate-evaluation.constants";
import {
  extractLegacySkillsFromDimensions,
  toGapAnalysisStored,
} from "../gap-analysis.mapper";

type DbTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

@Injectable()
export class CandidateEvaluationMutationRepository {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async persistAnalysisResult(
    candidateId: string,
    analysisResult: CandidateEvaluationResult,
    newStageId: number | undefined,
    userId: string,
    notQualifiedReason: string | null = null,
    executor?: DbTransaction
  ) {
    const now = toUTC();
    const { matchedSkills, missingSkills } = extractLegacySkillsFromDimensions(
      analysisResult.dimensions
    );
    const gapAnalysis = toGapAnalysisStored(analysisResult);

    const run = async (tx: DbTransaction) => {
      const [lockedCandidate] = await tx
        .select({
          stageId: schema.recruitmentJobCandidates.stageId,
        })
        .from(schema.recruitmentJobCandidates)
        .where(
          and(
            eq(schema.recruitmentJobCandidates.id, candidateId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        )
        .for("update");

      if (!lockedCandidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      // Ensure the target stage exists if newStageId is provided
      if (newStageId) {
        const [stageExists] = await tx
          .select()
          .from(schema.recruitmentStagesSchema)
          .where(eq(schema.recruitmentStagesSchema.id, newStageId))
          .limit(1);

        if (!stageExists) {
          throw new Error(`Target stage ${newStageId} not found`);
        }
      }

      if (
        typeof analysisResult.matchPercentage !== "number" ||
        !Number.isFinite(analysisResult.matchPercentage)
      ) {
        throw new Error(
          `Invalid matchPercentage: ${analysisResult.matchPercentage}`
        );
      }
      // Prepare update data
      const updateData: Partial<
        typeof schema.recruitmentJobCandidates.$inferInsert
      > = {
        matchScore: String(analysisResult.matchPercentage),
        matchedSkills: matchedSkills.length > 0 ? matchedSkills : null,
        missingSkills: missingSkills.length > 0 ? missingSkills : null,
        gapAnalysis,
        analysisAt: now,
        analysisStatus: CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.COMPLETED,
        analysisNote: analysisResult.verdict,
        // Populated only for Not Qualified placements; cleared otherwise.
        notQualifiedReason,
        updatedAt: now,
        updatedBy: userId,
      };

      // Only update stage fields if stage actually changed
      const stageChanged = newStageId && newStageId !== lockedCandidate.stageId;
      if (stageChanged) {
        updateData.stageId = newStageId;
        updateData.stageUpdatedAt = now;
      }

      // Update candidate record
      await tx
        .update(schema.recruitmentJobCandidates)
        .set(updateData)
        .where(
          and(
            eq(schema.recruitmentJobCandidates.id, candidateId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        );

      // Add stage history entry only if stage changed
      if (stageChanged && newStageId) {
        // Threshold disabled — all evaluated candidates are eligible.
        // const isEligible =
        //   analysisResult.matchPercentage >=
        //   CANDIDATE_EVALUATION_CONFIG.THRESHOLDS.MINIMUM_MATCH;
        // const eligibilityNote = isEligible
        //   ? "Eligible for this job"
        //   : "Not eligible for this job";
        const eligibilityNote = "Eligible for this job";

        await tx.insert(schema.recruitmentCandidateStageHistory).values({
          candidateId,
          stageId: newStageId,
          note: eligibilityNote,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    };

    if (executor) {
      await run(executor);
      return;
    }
    await this.db.transaction(run);
  }

  async markAnalysisFailed(candidateId: string) {
    const now = toUTC();
    await this.db
      .update(schema.recruitmentJobCandidates)
      .set({
        analysisStatus: CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.FAILED,
        analysisAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt),
          ne(
            schema.recruitmentJobCandidates.analysisStatus,
            CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.COMPLETED
          )
        )
      );
  }
}
