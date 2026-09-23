import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { REDIS_TOKEN } from "config/redis.provider";
import { AiUsageLoggerService } from "services/ai-usage-logger.service";
import { normalizeResumeSearchQuery } from "modules/recruitment/resume-search/services/resume-search-query.normalizer";
import type Redis from "ioredis";
import { createHash } from "node:crypto";
import { callCandidateSearchIntentApi } from "./candidate-search-intent-api";
import {
  CANDIDATE_SEARCH_INTENT_CACHE_PREFIX,
  CANDIDATE_SEARCH_INTENT_CACHE_TTL_SECONDS,
} from "../candidate-search.constants";
import {
  intentPlanToSearchQueryParse,
  sanitizeCandidateSearchIntentPlan,
  type CandidateSearchIntentPlan,
} from "../criteria/candidate-search-intent-plan";
import { needsAiIntent } from "../criteria/candidate-search-query-intent";
import {
  extractSearchQuery,
  type SearchQueryParse,
} from "../criteria/candidate-search-query-parse";

@Injectable()
export class CandidateSearchQueryIntentService {
  private readonly logger = new Logger(CandidateSearchQueryIntentService.name);

  constructor(
    private readonly aiUsageLogger: AiUsageLoggerService,
    @Optional() @Inject(REDIS_TOKEN) private readonly redis?: Redis
  ) {}

  async resolve(
    rawQuery: string | null,
    userId?: string
  ): Promise<SearchQueryParse> {
    const heuristic = extractSearchQuery(rawQuery);
    if (!needsAiIntent(rawQuery, heuristic)) return heuristic;

    const normalized = rawQuery ? normalizeResumeSearchQuery(rawQuery) : "";
    if (!normalized) return heuristic;

    const ai = await this.interpret(normalized, userId);
    return ai ?? heuristic;
  }

  private async interpret(
    normalizedQuery: string,
    userId?: string
  ): Promise<SearchQueryParse | null> {
    const key = this.cacheKey(normalizedQuery);
    const cached = await this.readCache(key);
    if (cached) return intentPlanToSearchQueryParse(cached);

    const plan = await callCandidateSearchIntentApi(
      normalizedQuery,
      userId,
      this.logger,
      this.aiUsageLogger
    );
    if (!plan) return null;

    await this.writeCache(key, plan);
    return intentPlanToSearchQueryParse(plan);
  }

  private cacheKey(normalizedQuery: string): string {
    const digest = createHash("sha256").update(normalizedQuery).digest("hex");
    return `${CANDIDATE_SEARCH_INTENT_CACHE_PREFIX}${digest}`;
  }

  private async readCache(
    key: string
  ): Promise<CandidateSearchIntentPlan | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return sanitizeCandidateSearchIntentPlan(JSON.parse(raw));
    } catch (error) {
      this.logger.warn(
        `CANDIDATE_SEARCH_INTENT :: readCache : ERROR : ${error}`
      );
      return null;
    }
  }

  private async writeCache(
    key: string,
    plan: CandidateSearchIntentPlan
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(
        key,
        CANDIDATE_SEARCH_INTENT_CACHE_TTL_SECONDS,
        JSON.stringify(plan)
      );
    } catch (error) {
      this.logger.warn(
        `CANDIDATE_SEARCH_INTENT :: writeCache : ERROR : ${error}`
      );
    }
  }
}
