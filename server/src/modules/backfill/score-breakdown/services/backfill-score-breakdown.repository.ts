import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";

const ANALYSIS_STATUS_COMPLETED = "completed" as const;

export type ScoreBreakdownSourceTable = "candidates" | "poolMatches";

export interface ScoreBreakdownRow {
  id: string;
  matchScore: string | null;
  gapAnalysis: unknown;
}

@Injectable()
export class BackfillScoreBreakdownRepository {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Applicant rows that already carry a completed analysis. Rows without a
   * score or gap analysis have nothing to explain and are filtered out here.
   */
  async findCandidateRows(jobId: string): Promise<ScoreBreakdownRow[]> {
    return this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        matchScore: schema.recruitmentJobCandidates.matchScore,
        gapAnalysis: schema.recruitmentJobCandidates.gapAnalysis,
      })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.jobId, jobId),
          isNull(schema.recruitmentJobCandidates.deletedAt),
          eq(
            schema.recruitmentJobCandidates.analysisStatus,
            ANALYSIS_STATUS_COMPLETED
          ),
          isNotNull(schema.recruitmentJobCandidates.matchScore),
          isNotNull(schema.recruitmentJobCandidates.gapAnalysis)
        )
      );
  }

  /**
   * Connector pool matches. `ai_matched` rows have no gap analysis at all and
   * are excluded by the same filter.
   */
  async findPoolMatchRows(jobId: string): Promise<ScoreBreakdownRow[]> {
    return this.db
      .select({
        id: schema.recruitmentJobPoolMatches.id,
        matchScore: schema.recruitmentJobPoolMatches.matchScore,
        gapAnalysis: schema.recruitmentJobPoolMatches.gapAnalysis,
      })
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.jobId, jobId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt),
          isNotNull(schema.recruitmentJobPoolMatches.gapAnalysis)
        )
      );
  }

  /**
   * Writes only the `gap_analysis` column. `updated_at` / `updated_by` are left
   * alone on purpose: this is a derived-data annotation, not a business update,
   * and list views order on recency.
   */
  async updateGapAnalysis(
    table: ScoreBreakdownSourceTable,
    id: string,
    gapAnalysis: Record<string, unknown>
  ): Promise<void> {
    if (table === "candidates") {
      await this.db
        .update(schema.recruitmentJobCandidates)
        .set({ gapAnalysis })
        .where(eq(schema.recruitmentJobCandidates.id, id));
      return;
    }

    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({ gapAnalysis })
      .where(eq(schema.recruitmentJobPoolMatches.id, id));
  }
}
