import { Injectable, Logger } from "@nestjs/common";
import { parseGapAnalysisStored } from "modules/recruitment/candidate-evaluation/gap-analysis.mapper";
import { SCORE_BREAKDOWN_TOTAL_WEIGHT } from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants";
import {
  BackfillScoreBreakdownRepository,
  type ScoreBreakdownRow,
  type ScoreBreakdownSourceTable,
} from "./backfill-score-breakdown.repository";
import { BackfillScoreBreakdownAiService } from "./backfill-score-breakdown-ai.service";
import {
  SCORE_BREAKDOWN_AI_DELAY_MS,
  SCORE_BREAKDOWN_KEY,
} from "../backfill-score-breakdown.constants";
import { projectDimensionsForPrompt } from "../backfill-score-breakdown.projection";

export interface ScoreBreakdownTableSummary {
  eligible: number;
  processed: number;
  skippedExisting: number;
  skippedUnusable: number;
  rescaled: number;
  failed: number;
}

export interface ScoreBreakdownJobSummary {
  jobId: string;
  candidates: ScoreBreakdownTableSummary;
  poolMatches: ScoreBreakdownTableSummary;
}

export interface ScoreBreakdownRunSummary {
  jobCount: number;
  jobs: ScoreBreakdownJobSummary[];
}

type RowOutcome = "processed" | "skippedExisting" | "skippedUnusable";

function emptySummary(): ScoreBreakdownTableSummary {
  return {
    eligible: 0,
    processed: 0,
    skippedExisting: 0,
    skippedUnusable: 0,
    rescaled: 0,
    failed: 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class BackfillScoreBreakdownRunnerService {
  private readonly logger = new Logger(
    BackfillScoreBreakdownRunnerService.name
  );

  constructor(
    private readonly repository: BackfillScoreBreakdownRepository,
    private readonly ai: BackfillScoreBreakdownAiService
  ) {}

  async runBackfill(
    jobIds: string[],
    force: boolean
  ): Promise<ScoreBreakdownRunSummary> {
    const jobs: ScoreBreakdownJobSummary[] = [];

    for (const jobId of jobIds) {
      const [candidateRows, poolMatchRows] = await Promise.all([
        this.repository.findCandidateRows(jobId),
        this.repository.findPoolMatchRows(jobId),
      ]);

      const summary: ScoreBreakdownJobSummary = {
        jobId,
        candidates: await this.processRows(candidateRows, "candidates", force),
        poolMatches: await this.processRows(
          poolMatchRows,
          "poolMatches",
          force
        ),
      };

      this.logger.log(
        `BACKFILL_SCORE_BREAKDOWN_RUNNER :: job done : ${JSON.stringify(summary)}`
      );
      jobs.push(summary);
    }

    return { jobCount: jobIds.length, jobs };
  }

  private async processRows(
    rows: ScoreBreakdownRow[],
    table: ScoreBreakdownSourceTable,
    force: boolean
  ): Promise<ScoreBreakdownTableSummary> {
    const summary = emptySummary();
    summary.eligible = rows.length;

    for (const row of rows) {
      try {
        const outcome = await this.processRow(row, table, force, summary);
        summary[outcome] += 1;
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `BACKFILL_SCORE_BREAKDOWN_RUNNER :: processRow : ERROR : table=${table} id=${row.id} : ${message}`,
          error instanceof Error ? error.stack : undefined
        );
      }
    }

    return summary;
  }

  /**
   * Read-modify-write that only adds a key. The raw stored object is spread
   * as-is so `verdict`, `verdictStatus`, `dimensions` and anything else
   * survive byte for byte.
   */
  private async processRow(
    row: ScoreBreakdownRow,
    table: ScoreBreakdownSourceTable,
    force: boolean,
    summary: ScoreBreakdownTableSummary
  ): Promise<RowOutcome> {
    if (!row.gapAnalysis || typeof row.gapAnalysis !== "object") {
      return "skippedUnusable";
    }
    const raw = row.gapAnalysis as Record<string, unknown>;

    if (!force && raw[SCORE_BREAKDOWN_KEY]) {
      return "skippedExisting";
    }

    const stored = parseGapAnalysisStored(raw);
    if (!stored) return "skippedUnusable";

    const dimensions = projectDimensionsForPrompt(stored);
    if (!dimensions) return "skippedUnusable";

    const totalScore = this.resolveTotalScore(row.matchScore);
    if (totalScore === null) return "skippedUnusable";

    const breakdown = await this.ai.generateBreakdown({
      totalScore,
      dimensions,
    });
    await sleep(SCORE_BREAKDOWN_AI_DELAY_MS);

    await this.repository.updateGapAnalysis(table, row.id, {
      ...raw,
      [SCORE_BREAKDOWN_KEY]: breakdown,
    });

    if (breakdown.reconciled === "rescaled") {
      summary.rescaled += 1;
    }

    return "processed";
  }

  /** Mirrors the client's `Math.round(matchScore)` so the two never disagree. */
  private resolveTotalScore(matchScore: string | null): number | null {
    if (matchScore === null) return null;
    const parsed = Number(matchScore);
    if (!Number.isFinite(parsed)) return null;

    const rounded = Math.round(parsed);
    if (rounded < 0 || rounded > SCORE_BREAKDOWN_TOTAL_WEIGHT) return null;
    return rounded;
  }
}
