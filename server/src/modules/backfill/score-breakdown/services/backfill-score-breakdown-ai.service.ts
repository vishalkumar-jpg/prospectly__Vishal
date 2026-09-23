import { Injectable, Logger } from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import { JobExtractionGeminiService } from "modules/recruitment/job-extraction/services/job-extraction-gemini.service";
import { parseJsonObjectFromAiResponse } from "modules/recruitment/job-extraction/utils/job-extraction-json-repair.utils";
import { geminiModelIdFromApiUrl } from "utils/gemini-usage-metadata.util";
import {
  SCORE_BREAKDOWN_SOURCE_BACKFILL,
  type ScoredDimensionKey,
} from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.constants";
import { assembleScoreBreakdown } from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.assemble";
import type { ScoreBreakdownPromptDimension } from "../backfill-score-breakdown.projection";
import type { ScoreBreakdown } from "modules/recruitment/candidate-evaluation/gap-analysis-score-breakdown.types";
import {
  SCORE_BREAKDOWN_AI_ACTION_TYPE,
  SCORE_BREAKDOWN_AI_ATTEMPTS,
  SCORE_BREAKDOWN_GEMINI_RETRIES,
} from "../backfill-score-breakdown.constants";
import { buildScoreBreakdownPrompt } from "../backfill-score-breakdown.prompt";
import {
  validateScoreBreakdownAiResponse,
  type ScoreBreakdownAiResponse,
} from "../backfill-score-breakdown.schema";
import {
  reconcileEarnedPoints,
  type ReconcileResult,
} from "../backfill-score-breakdown.reconcile";

export interface GenerateScoreBreakdownInput {
  totalScore: number;
  dimensions: ScoreBreakdownPromptDimension[];
}

@Injectable()
export class BackfillScoreBreakdownAiService {
  private readonly logger = new Logger(BackfillScoreBreakdownAiService.name);

  constructor(private readonly gemini: JobExtractionGeminiService) {}

  /**
   * Asks Gemini to split the already-stored score across the fixed-weight
   * dimensions. If the returned points do not sum to that score the call is
   * retried once, and if it still disagrees the values are rescaled in code —
   * so the persisted breakdown always adds up.
   */
  async generateBreakdown(
    input: GenerateScoreBreakdownInput
  ): Promise<ScoreBreakdown> {
    const prompt = buildScoreBreakdownPrompt(input);
    const model = geminiModelIdFromApiUrl(geminiConfig.apiUrl);

    let lastAi: ScoreBreakdownAiResponse | null = null;
    let lastReconcile: ReconcileResult | null = null;

    for (let attempt = 1; attempt <= SCORE_BREAKDOWN_AI_ATTEMPTS; attempt++) {
      const response = await this.gemini.generateText(
        prompt,
        SCORE_BREAKDOWN_GEMINI_RETRIES,
        { actionType: SCORE_BREAKDOWN_AI_ACTION_TYPE },
        { jsonMode: true }
      );

      let parsed: ScoreBreakdownAiResponse;
      try {
        parsed = this.parseResponse(response);
      } catch (error) {
        if (attempt === SCORE_BREAKDOWN_AI_ATTEMPTS) throw error;
        this.logger.warn(
          `BACKFILL_SCORE_BREAKDOWN_AI_SERVICE :: generateBreakdown :: parse failed on attempt ${String(attempt)} : ${String(error)}`
        );
        continue;
      }

      const reconcile = reconcileEarnedPoints(
        this.toEarnedPoints(parsed),
        input.totalScore
      );

      lastAi = parsed;
      lastReconcile = reconcile;

      if (reconcile.reconciled === "exact") {
        return this.assemble(input.totalScore, model, parsed, reconcile);
      }

      this.logger.warn(
        `BACKFILL_SCORE_BREAKDOWN_AI_SERVICE :: generateBreakdown :: points did not sum to ${String(input.totalScore)} on attempt ${String(attempt)}`
      );
    }

    if (!lastAi || !lastReconcile) {
      throw new Error("No usable AI score breakdown response");
    }

    return this.assemble(input.totalScore, model, lastAi, lastReconcile);
  }

  /** Adapts the backfill's response shape onto the shared assembler. */
  private assemble(
    totalScore: number,
    model: string,
    parsed: ScoreBreakdownAiResponse,
    reconcile: ReconcileResult
  ): ScoreBreakdown {
    const reasons: Partial<Record<ScoredDimensionKey, string>> = {};
    for (const dimension of parsed.dimensions) {
      reasons[dimension.key] = dimension.reason;
    }

    return assembleScoreBreakdown({
      totalScore,
      model,
      source: SCORE_BREAKDOWN_SOURCE_BACKFILL,
      earned: reconcile.earned,
      reasons,
      topReasons: parsed.topReasons,
      reconciled: reconcile.reconciled,
    });
  }

  private toEarnedPoints(
    parsed: ScoreBreakdownAiResponse
  ): Partial<Record<ScoredDimensionKey, number>> {
    const earned: Partial<Record<ScoredDimensionKey, number>> = {};
    for (const dimension of parsed.dimensions) {
      earned[dimension.key] = dimension.pointsEarned;
    }
    return earned;
  }

  private parseResponse(responseText: string): ScoreBreakdownAiResponse {
    return validateScoreBreakdownAiResponse(
      parseJsonObjectFromAiResponse(responseText)
    );
  }
}
