import { geminiConfig } from "config/gemini.config";
import {
  AiUsageLoggerService,
  AI_PROVIDER_GEMINI,
} from "services/ai-usage-logger.service";
import {
  geminiModelIdFromApiUrl,
  tokensFromGeminiUsageMetadata,
} from "utils/gemini-usage-metadata.util";
import {
  isTransientFetchError,
  isTransientHttpResponse,
  retryAfterDelayMs,
} from "utils/gemini-fetch-retry.utils";
import {
  RESUME_SEARCH_PLAN_MAX_ATTEMPTS,
  RESUME_SEARCH_PLAN_TIMEOUT_MS,
} from "modules/recruitment/resume-search/resume-search.constants";
import {
  sanitizeCandidateSearchIntentPlan,
  type CandidateSearchIntentPlan,
} from "../criteria/candidate-search-intent-plan";

const ACTION_TYPE = "candidate-search-query-intent";

const INTENT_PROMPT = `You interpret a recruiter's candidate search query for a resume database.

Return JSON only. Extract:
- nameAlternatives: person names only, as OR groups (each group is a full name phrase). Never put languages, frameworks, or tools here.
- requiredSkills: specific products the candidate must have — languages, frameworks, databases, cloud services, certifications. When the recruiter says "X and Y" for skills, both go here (AND).
- skillAlternatives: OR groups of skills when the recruiter says "X or Y" among skills.
- titleTokens: job titles if explicitly requested.
- companyTokens: company names if explicitly requested.
- semanticIntent: short phrase for semantic ranking; empty if the query is only concrete skills/names.

Rules:
- Drop filler: "someone who is", "looking for", "knows skill", "experienced in", "candidate".
- TypeScript, GraphQL, React, Python, AWS are skills, never names.
- "vivek or sana and python" → nameAlternatives [["vivek"],["sana"]], requiredSkills ["python"].
- "TypeScript and GraphQL" → requiredSkills ["TypeScript","GraphQL"], nameAlternatives [].
- Use empty arrays when absent. No NOT, no parentheses.

Query: `;

const INTENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    nameAlternatives: {
      type: "ARRAY",
      items: { type: "ARRAY", items: { type: "STRING" } },
    },
    requiredSkills: { type: "ARRAY", items: { type: "STRING" } },
    skillAlternatives: {
      type: "ARRAY",
      items: { type: "ARRAY", items: { type: "STRING" } },
    },
    titleTokens: { type: "ARRAY", items: { type: "STRING" } },
    companyTokens: { type: "ARRAY", items: { type: "STRING" } },
    semanticIntent: { type: "STRING" },
  },
  required: [
    "nameAlternatives",
    "requiredSkills",
    "skillAlternatives",
    "titleTokens",
    "companyTokens",
    "semanticIntent",
  ],
} as const;

function resolveUrl(): string | null {
  const base = geminiConfig.apiUrl?.trim();
  if (!base || !geminiConfig.apiKey) return null;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}key=${geminiConfig.apiKey}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callCandidateSearchIntentApi(
  query: string,
  userId: string | undefined,
  logger: { warn: (message: string) => void },
  aiUsageLogger: AiUsageLoggerService
): Promise<CandidateSearchIntentPlan | null> {
  const url = resolveUrl();
  if (!url) {
    logger.warn(
      "CANDIDATE_SEARCH_INTENT :: callIntentApi : Gemini not configured"
    );
    return null;
  }

  const started = Date.now();
  const model = geminiModelIdFromApiUrl(geminiConfig.apiUrl);

  for (
    let attempt = 0;
    attempt < RESUME_SEARCH_PLAN_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const isLastAttempt = attempt === RESUME_SEARCH_PLAN_MAX_ATTEMPTS - 1;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      RESUME_SEARCH_PLAN_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${INTENT_PROMPT}"${query}"` }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: INTENT_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        if (!isLastAttempt && isTransientHttpResponse(response)) {
          await sleep(
            retryAfterDelayMs(response.headers.get("retry-after"), attempt)
          );
          continue;
        }
        throw new Error(`Intent API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
        usageMetadata?: unknown;
      };
      if (data.error) throw new Error(data.error.message || "Intent error");

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Intent returned no content");

      const plan = sanitizeCandidateSearchIntentPlan(JSON.parse(text));
      void aiUsageLogger.logUsage({
        trackingData: { userId, actionType: ACTION_TYPE },
        provider: AI_PROVIDER_GEMINI,
        model,
        ...tokensFromGeminiUsageMetadata(data.usageMetadata),
        status: "success",
        responseTimeMs: Date.now() - started,
        retryCount: attempt,
      });
      return plan;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isLastAttempt && isTransientFetchError(error)) continue;

      void aiUsageLogger.logUsage({
        trackingData: { userId, actionType: ACTION_TYPE },
        provider: AI_PROVIDER_GEMINI,
        model,
        status: "failure",
        errorMessage: message,
        responseTimeMs: Date.now() - started,
        retryCount: attempt,
      });
      logger.warn(
        `CANDIDATE_SEARCH_INTENT :: callIntentApi : DEGRADED : ${message}`
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
