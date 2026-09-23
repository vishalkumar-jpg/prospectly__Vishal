import { Injectable, Logger } from "@nestjs/common";
import { geminiConfig } from "config/gemini.config";
import {
  AiUsageLoggerService,
  AI_PROVIDER_GEMINI,
  type AiUsageTrackingData,
} from "services/ai-usage-logger.service";
import {
  geminiModelIdFromApiUrl,
  tokensFromGeminiUsageMetadata,
} from "utils/gemini-usage-metadata.util";
import {
  isTransientHttpResponse,
  retryAfterDelayMs,
} from "utils/gemini-fetch-retry.utils";
import { LLM_BATCH_SIZE } from "../job-pool-matches.constants";

interface CandidateForScoring {
  candidateIndex: number;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  company?: string | null;
  skills?: string[] | null;
  cosineSimilarity: number;
}

export interface LlmScoringResult {
  candidateIndex: number;
  score: number;
  matchedSignals: string[];
  concerns: string[];
}

interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
  usageMetadata?: unknown;
}

@Injectable()
export class LlmScoringService {
  private readonly logger = new Logger(LlmScoringService.name);

  constructor(private readonly aiUsageLogger: AiUsageLoggerService) {}

  /**
   * Score a batch of candidates against a job using Gemini 2.0 Flash.
   * Splits candidates into groups of LLM_BATCH_SIZE and scores each group.
   */
  async scoreCandidates(
    job: {
      title: string;
      companyName: string;
      description?: string | null;
      experienceLevel?: string | null;
      requiredSkills?: string[] | null;
      preferredSkills?: string[] | null;
      requirements?: string | null;
    },
    candidates: CandidateForScoring[],
    tracking?: AiUsageTrackingData
  ): Promise<LlmScoringResult[]> {
    if (candidates.length === 0) return [];

    const results: LlmScoringResult[] = [];

    for (let i = 0; i < candidates.length; i += LLM_BATCH_SIZE) {
      const batch = candidates.slice(i, i + LLM_BATCH_SIZE);

      try {
        const batchResults = await this.scoreBatch(job, batch, tracking);
        results.push(...batchResults);
      } catch (error) {
        this.logger.error(
          `LLM_SCORING_SERVICE :: scoreCandidates : ERROR scoring batch ${Math.floor(i / LLM_BATCH_SIZE) + 1} : ${error}`
        );
        // On failure, assign score 0 to this batch so matching can continue
        for (const candidate of batch) {
          results.push({
            candidateIndex: candidate.candidateIndex,
            score: 0,
            matchedSignals: [],
            concerns: ["LLM scoring failed for this candidate"],
          });
        }
      }

      // Small delay between LLM calls
      if (i + LLM_BATCH_SIZE < candidates.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  private async scoreBatch(
    job: {
      title: string;
      companyName: string;
      description?: string | null;
      experienceLevel?: string | null;
      requiredSkills?: string[] | null;
      preferredSkills?: string[] | null;
      requirements?: string | null;
    },
    candidates: CandidateForScoring[],
    tracking?: AiUsageTrackingData
  ): Promise<LlmScoringResult[]> {
    const prompt = this.buildScoringPrompt(job, candidates);
    const responseText = await this.callGeminiApi(prompt, 3, tracking);
    return this.parseResponse(responseText, candidates);
  }

  private buildScoringPrompt(
    job: {
      title: string;
      companyName: string;
      description?: string | null;
      experienceLevel?: string | null;
      requiredSkills?: string[] | null;
      preferredSkills?: string[] | null;
      requirements?: string | null;
    },
    candidates: CandidateForScoring[]
  ): string {
    const jobDescription = [
      `Title: ${job.title}`,
      `Company: ${job.companyName}`,
      job.experienceLevel ? `Experience Level: ${job.experienceLevel}` : null,
      job.description
        ? `Description: ${job.description.substring(0, 500)}`
        : null,
      job.requiredSkills?.length
        ? `Required Skills: ${job.requiredSkills.join(", ")}`
        : null,
      job.preferredSkills?.length
        ? `Preferred Skills: ${job.preferredSkills.join(", ")}`
        : null,
      job.requirements
        ? `Requirements: ${job.requirements.substring(0, 300)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const candidateDescriptions = candidates
      .map((c, i) => {
        const parts = [`Candidate ${i + 1}:`];
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
        if (name) parts.push(`  Name: ${name}`);
        if (c.title) parts.push(`  Title: ${c.title}`);
        if (c.company) parts.push(`  Company: ${c.company}`);
        if (c.skills?.length) parts.push(`  Skills: ${c.skills.join(", ")}`);
        parts.push(
          `  Embedding Similarity: ${(c.cosineSimilarity * 100).toFixed(1)}%`
        );
        return parts.join("\n");
      })
      .join("\n\n");

    return `You are an expert recruiter evaluating candidate-job fit. Score each candidate's match to the job below.

JOB:
${jobDescription}

CANDIDATES:
${candidateDescriptions}

For each candidate, evaluate:
1. Role relevance — how well does their title/experience match the job?
2. Skill transferability — do they have the required/preferred skills or closely related ones?
3. Seniority appropriateness — does their level match the job's expectations?
4. Domain experience — is their industry/company background relevant?

CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanation.
Format:
[
  {
    "candidateIndex": 1,
    "score": <0-100>,
    "matchedSignals": ["reason1", "reason2"],
    "concerns": ["concern1"]
  }
]

Score guidelines:
- 80-100: Strong match — right role, right skills, right level
- 60-79: Good match — most criteria met, minor gaps
- 40-59: Moderate match — some relevant experience but notable gaps
- 20-39: Weak match — loosely related but significant mismatches
- 0-19: Poor match — largely irrelevant`;
  }

  private async callGeminiApi(
    prompt: string,
    retries = 3,
    tracking?: AiUsageTrackingData
  ): Promise<string> {
    if (!geminiConfig.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const url = `${geminiConfig.apiUrl}?key=${geminiConfig.apiKey}`;
    const modelId = geminiModelIdFromApiUrl(geminiConfig.apiUrl);
    const runStarted = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048 },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();

          if (isTransientHttpResponse(response) && attempt < retries) {
            const delay = retryAfterDelayMs(
              response.headers.get("Retry-After"),
              attempt
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }

        const data = (await response.json()) as GeminiContentResponse;

        if (data.error) {
          throw new Error(
            `Gemini API error: ${data.error.message || "Unknown error"}`
          );
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
          throw new Error("Empty response from Gemini API");
        }

        const tok = tokensFromGeminiUsageMetadata(data.usageMetadata);
        const trackingData: AiUsageTrackingData = {
          userId: tracking?.userId,
          actionType: tracking?.actionType ?? "job-pool-llm-scoring",
        };
        this.aiUsageLogger
          .logUsage({
            trackingData,
            provider: AI_PROVIDER_GEMINI,
            model: modelId,
            promptTokens: tok.promptTokens,
            completionTokens: tok.completionTokens,
            totalTokens: tok.totalTokens,
            status: "success",
            responseTimeMs: Date.now() - runStarted,
            retryCount: Math.max(0, attempt - 1),
          })
          .catch((logError) => {
            this.logger.warn(
              `LLM_SCORING_SERVICE :: callGeminiApi : AI_USAGE_LOG_ERROR : ${String(logError)}`
            );
          });

        return text;
      } catch (error) {
        if (attempt === retries) {
          const message =
            error instanceof Error ? error.message : String(error);
          const trackingData: AiUsageTrackingData = {
            userId: tracking?.userId,
            actionType: tracking?.actionType ?? "job-pool-llm-scoring",
          };
          this.aiUsageLogger
            .logUsage({
              trackingData,
              provider: AI_PROVIDER_GEMINI,
              model: modelId,
              status: "failure",
              errorMessage: message,
              responseTimeMs: Date.now() - runStarted,
              retryCount: Math.max(0, attempt - 1),
            })
            .catch((logError) => {
              this.logger.warn(
                `LLM_SCORING_SERVICE :: callGeminiApi : AI_USAGE_LOG_ERROR (failure) : ${String(logError)}`
              );
            });
          throw error;
        }
        const delay = retryAfterDelayMs(null, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Failed to call Gemini API after retries");
  }

  private parseResponse(
    responseText: string,
    candidates: CandidateForScoring[]
  ): LlmScoringResult[] {
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = responseText.match(
        /```(?:json)?\s*(\[[\s\S]*\])\s*```/
      );
      const jsonText = jsonMatch ? jsonMatch[1] : responseText.trim();

      const parsed = JSON.parse(jsonText) as Array<{
        candidateIndex: number;
        score: number;
        matchedSignals?: string[];
        concerns?: string[];
      }>;

      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      return parsed.map((item, i) => ({
        candidateIndex: candidates[i]?.candidateIndex ?? item.candidateIndex,
        score: Math.max(0, Math.min(100, Math.round(item.score ?? 0))),
        matchedSignals: Array.isArray(item.matchedSignals)
          ? item.matchedSignals
          : [],
        concerns: Array.isArray(item.concerns) ? item.concerns : [],
      }));
    } catch (error) {
      this.logger.error(
        `LLM_SCORING_SERVICE :: parseResponse : ERROR : ${error}. Response: ${responseText.substring(0, 300)}`
      );

      // Return zero scores on parse failure
      return candidates.map((c) => ({
        candidateIndex: c.candidateIndex,
        score: 0,
        matchedSignals: [],
        concerns: ["Failed to parse LLM scoring response"],
      }));
    }
  }
}
