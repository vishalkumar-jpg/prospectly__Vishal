import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import { JobExtractionGeminiService } from "modules/recruitment/job-extraction/services/job-extraction-gemini.service";
import { parseJsonObjectFromAiResponse } from "modules/recruitment/job-extraction/utils/job-extraction-json-repair.utils";
import { geminiModelIdFromApiUrl } from "utils/gemini-usage-metadata.util";
import type { AiUsageTrackingData } from "services/ai-usage-logger.service";
import {
  validateCandidateEvaluationResponse,
  type CandidateEvaluationAiResult,
  type CandidateEvaluationResult,
} from "../candidate-evaluation.constants";
import { CANDIDATE_GAP_ANALYSIS_PROMPT } from "../candidate-evaluation-gap-analysis.prompt";
import { CANDIDATE_EVALUATION_MAX_PROMPT_CHARS } from "../gap-analysis-score-breakdown.constants";
import { enrichGapAnalysisResult } from "../gap-analysis-score-breakdown.enrich";

export interface CandidateEvaluationAnalysis {
  jobTitle?: string;
  jobDescription: string;
  jobRequirements?: string;
  jobResponsibilities?: string;
  jobRequiredSkills?: string[];
  jobPreferredSkills?: string[];
  jobExperienceLevel?: string;
  jobWorkType?: string;
  jobLocation?: string;
  resumeText: string;
}

@Injectable()
export class CandidateEvaluationService {
  private readonly logger = new Logger(CandidateEvaluationService.name);

  constructor(private readonly gemini: JobExtractionGeminiService) {}

  async analyzeSkillMatch(
    analysis: CandidateEvaluationAnalysis,
    tracking?: AiUsageTrackingData
  ): Promise<CandidateEvaluationResult> {
    try {
      const prompt = this.buildAnalysisPrompt(analysis);
      const response = await this.gemini.generateText(prompt, 3, tracking, {
        jsonMode: true,
        maxPromptChars: CANDIDATE_EVALUATION_MAX_PROMPT_CHARS,
      });

      const parsed = this.parseResponse(response);
      const enriched = enrichGapAnalysisResult(
        parsed,
        geminiModelIdFromApiUrl(geminiConfig.apiUrl)
      );

      if (enriched.scoreBreakdown.derived?.length) {
        this.logger.warn(
          `CANDIDATE_EVALUATION_SERVICE :: analyzeSkillMatch : points inferred from badge for ${enriched.scoreBreakdown.derived.join(", ")}`
        );
      }

      return enriched;
    } catch (error) {
      this.logger.error(
        `CANDIDATE_EVALUATION_SERVICE :: analyzeSkillMatch : ERROR : ${error}`
      );
      throw new InternalServerErrorException("Failed to analyze skill match");
    }
  }

  private buildAnalysisPrompt(analysis: CandidateEvaluationAnalysis): string {
    const {
      jobTitle,
      jobDescription,
      jobRequirements,
      jobResponsibilities,
      jobRequiredSkills,
      jobPreferredSkills,
      jobExperienceLevel,
      jobWorkType,
      jobLocation,
      resumeText,
    } = analysis;

    let jobInfo = "";
    if (jobTitle) jobInfo += `JOB TITLE: ${jobTitle}\n`;
    jobInfo += `JOB DESCRIPTION:\n${jobDescription}\n\n`;

    if (jobRequirements) {
      jobInfo += `JOB REQUIREMENTS:\n${jobRequirements}\n\n`;
    }
    if (jobResponsibilities) {
      jobInfo += `JOB RESPONSIBILITIES:\n${jobResponsibilities}\n\n`;
    }
    if (jobRequiredSkills?.length) {
      jobInfo += `REQUIRED SKILLS:\n${jobRequiredSkills.join(", ")}\n\n`;
    }
    if (jobPreferredSkills?.length) {
      jobInfo += `PREFERRED SKILLS:\n${jobPreferredSkills.join(", ")}\n\n`;
    }
    if (jobExperienceLevel) {
      jobInfo += `EXPERIENCE LEVEL: ${jobExperienceLevel}\n\n`;
    }
    if (jobWorkType) {
      jobInfo += `WORK TYPE: ${jobWorkType}\n\n`;
    }
    if (jobLocation) {
      jobInfo += `LOCATION: ${jobLocation}\n\n`;
    }

    return `${CANDIDATE_GAP_ANALYSIS_PROMPT}\n\n${jobInfo}\nRESUME:\n${resumeText}`;
  }

  private parseResponse(responseText: string): CandidateEvaluationAiResult {
    try {
      const parsed = parseJsonObjectFromAiResponse(responseText) as Record<
        string,
        unknown
      >;
      return validateCandidateEvaluationResponse(parsed);
    } catch (error) {
      this.logger.error(
        `CANDIDATE_EVALUATION_SERVICE :: parseResponse : ERROR : ${error}`
      );
      throw error;
    }
  }
}
