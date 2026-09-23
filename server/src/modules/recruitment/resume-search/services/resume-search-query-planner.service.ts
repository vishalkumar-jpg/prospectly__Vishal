import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { REDIS_TOKEN } from "config/redis.provider";
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
import type Redis from "ioredis";
import { createHash } from "node:crypto";
import {
  sanitizeResumeSearchPlan,
  type ResumeSearchPlan,
} from "./resume-search-plan";
import {
  RESUME_SEARCH_PLAN_CACHE_PREFIX,
  RESUME_SEARCH_PLAN_CACHE_TTL_SECONDS,
  RESUME_SEARCH_PLAN_MAX_ATTEMPTS,
  RESUME_SEARCH_PLAN_TIMEOUT_MS,
} from "../resume-search.constants";

const ACTION_TYPE = "resume-search-query-plan";

/**
 * The hard/soft split is the entire job of this prompt. An over-eager hard
 * requirement silently excludes a good candidate, while an over-eager soft term
 * only shifts ranking — so the rules resolve ambiguity toward soft, and name
 * the categories that were misclassified in testing.
 */
const PLANNER_PROMPT = `You convert a recruiter's natural-language candidate search into a structured filter for a resume database.

Split the query into HARD requirements and SOFT intent.

HARD (requiredSkills) — ONLY a specific, named, checkable product: a language, framework, library, database, cloud service, or certification. It must be a proper noun you could find verbatim in a resume.
  Include: Laravel, Vue.js, Elasticsearch, AWS, Kubernetes, PostgreSQL, AWS Certified Solutions Architect
  EXCLUDE and put in semanticIntent instead:
    - broad categories: cloud, database, frontend, backend, devops, AI, machine learning, microservices
    - role or seniority words: developer, engineer, senior, junior, lead, architect
    - responsibilities or qualities: team leadership, mentoring, communication, startup experience
  If unsure whether a term is a specific product or a broad category, treat it as SOFT.

For each hard requirement give the canonical label plus every spelling that could plausibly appear in a resume: dots, spaces, hyphens, abbreviations, expansions, common alternates. Be generous with variants — a missed spelling wrongly rejects a candidate.

minYearsExperience: total years of professional experience demanded, or null if not stated.
semanticIntent: everything else, as a short natural phrase describing the kind of person wanted. Empty string only if the query was purely a list of named products.

Query: `;

const PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    requiredSkills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          variants: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["label", "variants"],
      },
    },
    minYearsExperience: { type: "INTEGER", nullable: true },
    semanticIntent: { type: "STRING" },
  },
  required: ["requiredSkills", "semanticIntent"],
} as const;

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
  usageMetadata?: unknown;
}

/**
 * Turns the recruiter's sentence into a structured filter.
 *
 * Returns null on any failure — that null is the degraded-mode signal telling
 * the caller to apply no hard filters and fall back to pure hybrid ranking,
 * which is the behaviour that shipped before planning existed.
 */
@Injectable()
export class ResumeSearchQueryPlannerService {
  private readonly logger = new Logger(ResumeSearchQueryPlannerService.name);

  constructor(
    private readonly aiUsageLogger: AiUsageLoggerService,
    @Optional() @Inject(REDIS_TOKEN) private readonly redis?: Redis
  ) {}

  async plan(
    normalizedQuery: string,
    userId?: string
  ): Promise<ResumeSearchPlan | null> {
    const key = this.cacheKey(normalizedQuery);

    const cached = await this.readCache(key);
    if (cached) return cached;

    const plan = await this.callPlannerApi(normalizedQuery, userId);
    if (!plan) return null;

    await this.writeCache(key, plan);
    return plan;
  }

  private cacheKey(normalizedQuery: string): string {
    const digest = createHash("sha256").update(normalizedQuery).digest("hex");
    return `${RESUME_SEARCH_PLAN_CACHE_PREFIX}${digest}`;
  }

  private async readCache(key: string): Promise<ResumeSearchPlan | null> {
    if (!this.redis) return null;

    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;

      return sanitizeResumeSearchPlan(JSON.parse(raw));
    } catch (error) {
      this.logger.warn(`RESUME_SEARCH_PLANNER :: readCache : ERROR : ${error}`);
      return null;
    }
  }

  private async writeCache(key: string, plan: ResumeSearchPlan): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(
        key,
        RESUME_SEARCH_PLAN_CACHE_TTL_SECONDS,
        JSON.stringify(plan)
      );
    } catch (error) {
      this.logger.warn(
        `RESUME_SEARCH_PLANNER :: writeCache : ERROR : ${error}`
      );
    }
  }

  private async callPlannerApi(
    query: string,
    userId?: string
  ): Promise<ResumeSearchPlan | null> {
    const url = this.resolveUrl();
    if (!url) {
      this.logger.warn(
        "RESUME_SEARCH_PLANNER :: callPlannerApi : Gemini not configured"
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

      // The timer is owned here, not by the helper, so it stays armed across
      // response.json(). Cleared in the helper it would fire on headers, and a
      // server that stalls the body afterwards would hang forever.
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        RESUME_SEARCH_PLAN_TIMEOUT_MS
      );

      try {
        const response = await this.postQuery(url, query, controller.signal);

        if (!response.ok) {
          if (!isLastAttempt && isTransientHttpResponse(response)) {
            this.logger.warn(
              `RESUME_SEARCH_PLANNER :: callPlannerApi : RETRY : status=${response.status} attempt=${attempt}`
            );
            await this.sleep(
              retryAfterDelayMs(response.headers.get("retry-after"), attempt)
            );
            continue;
          }
          throw new Error(`Planner API error: ${response.status}`);
        }

        const data = (await response.json()) as GenerateContentResponse;
        if (data.error) {
          throw new Error(data.error.message || "Unknown planner error");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Planner returned no content");

        const plan = sanitizeResumeSearchPlan(JSON.parse(text));

        void this.aiUsageLogger.logUsage({
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

        // Only transient failures earn a retry. A malformed plan or a
        // permanent 4xx is deterministic — the same prompt reproduces it
        // exactly, so retrying costs a second billed call and doubles the
        // latency the searcher waits through before the query even runs.
        if (!isLastAttempt && isTransientFetchError(error)) {
          this.logger.warn(
            `RESUME_SEARCH_PLANNER :: callPlannerApi : RETRY : attempt=${attempt} ${message}`
          );
          continue;
        }

        void this.aiUsageLogger.logUsage({
          trackingData: { userId, actionType: ACTION_TYPE },
          provider: AI_PROVIDER_GEMINI,
          model,
          status: "failure",
          errorMessage: message,
          responseTimeMs: Date.now() - started,
          retryCount: attempt,
        });

        // Expected, handled path — the caller drops the hard filters.
        this.logger.warn(
          `RESUME_SEARCH_PLANNER :: callPlannerApi : DEGRADED : ${message}`
        );
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    return null;
  }

  /** Reuses the configured generateContent endpoint, with the key appended. */
  private resolveUrl(): string | null {
    const base = geminiConfig.apiUrl?.trim();
    if (!base || !geminiConfig.apiKey) return null;

    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}key=${geminiConfig.apiKey}`;
  }

  private postQuery(
    url: string,
    query: string,
    signal: AbortSignal
  ): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${PLANNER_PROMPT}"${query}"` }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: PLAN_RESPONSE_SCHEMA,
        },
      }),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
