import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import {
  extractLegacySkillsFromDimensions,
  toGapAnalysisStored,
} from "../../candidate-evaluation/gap-analysis.mapper";
import { CandidateEvaluationService } from "../../candidate-evaluation/services/candidate-evaluation.service";
import {
  JOB_POOL_MATCH_STATUS,
  CONSENT_LOCKED_STATUSES,
} from "../../job-pool-matches/job-pool-matches.constants";

type EvalResult = Awaited<
  ReturnType<CandidateEvaluationService["analyzeSkillMatch"]>
>;
type DbExecutor = PostgresJsDatabase<typeof schema>;

@Injectable()
export class ConnectorUploadMatchResultsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async updateMatchWithResults(
    matchId: string,
    evalResult: EvalResult,
    options?: { forceStatus?: string; executor?: DbExecutor }
  ): Promise<void> {
    this.assertFiniteMatchPercentage(evalResult.matchPercentage);
    const { matchedSkills, missingSkills } = extractLegacySkillsFromDimensions(
      evalResult.dimensions
    );
    const gapAnalysis = toGapAnalysisStored(evalResult);
    const executor = options?.executor ?? this.db;

    const lockedStatuses = new Set<string>(CONSENT_LOCKED_STATUSES);
    const [current] = await executor
      .select({ status: schema.recruitmentJobPoolMatches.status })
      .from(schema.recruitmentJobPoolMatches)
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId))
      .limit(1);

    const nextStatus =
      options?.forceStatus ??
      (current && lockedStatuses.has(current.status)
        ? current.status
        : JOB_POOL_MATCH_STATUS.PENDING);

    await executor
      .update(schema.recruitmentJobPoolMatches)
      .set({
        status: nextStatus,
        matchScore: evalResult.matchPercentage.toString(),
        matchedSignals: matchedSkills,
        concerns: missingSkills,
        gapAnalysis,
        failureReason: null,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId));
  }

  async demoteConsentPending(
    matchId: string,
    evalResult: EvalResult
  ): Promise<void> {
    this.assertFiniteMatchPercentage(evalResult.matchPercentage);
    const { matchedSkills, missingSkills } = extractLegacySkillsFromDimensions(
      evalResult.dimensions
    );
    const gapAnalysis = toGapAnalysisStored(evalResult);

    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({
        status: JOB_POOL_MATCH_STATUS.PENDING,
        matchScore: evalResult.matchPercentage.toString(),
        matchedSignals: matchedSkills,
        concerns: missingSkills,
        gapAnalysis,
        consentToken: null,
        consentSentAt: null,
        failureReason: null,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId));
  }

  private assertFiniteMatchPercentage(matchPercentage: unknown): void {
    if (
      typeof matchPercentage !== "number" ||
      !Number.isFinite(matchPercentage)
    ) {
      throw new Error(`Invalid matchPercentage: ${String(matchPercentage)}`);
    }
  }
}
