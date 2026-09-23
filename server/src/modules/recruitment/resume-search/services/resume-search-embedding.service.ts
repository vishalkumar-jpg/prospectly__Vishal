import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { REDIS_TOKEN } from "config/redis.provider";
import { geminiConfig } from "config/gemini.config";
import {
  AiUsageLoggerService,
  AI_PROVIDER_GEMINI,
} from "services/ai-usage-logger.service";
import { tokensFromGeminiUsageMetadata } from "utils/gemini-usage-metadata.util";
import {
  isTransientFetchError,
  isTransientHttpResponse,
  retryAfterDelayMs,
} from "utils/gemini-fetch-retry.utils";
import type Redis from "ioredis";
import { createHash } from "node:crypto";
import { RESUME_EMBEDDING_MODEL } from "../../resume-indexing/resume-indexing.constants";
import {
  RESUME_SEARCH_EMBEDDING_CACHE_PREFIX,
  RESUME_SEARCH_EMBEDDING_CACHE_TTL_SECONDS,
  RESUME_SEARCH_EMBEDDING_DIMENSIONS,
  RESUME_SEARCH_EMBEDDING_MAX_ATTEMPTS,
  RESUME_SEARCH_EMBEDDING_TIMEOUT_MS,
} from "../resume-search.constants";

const EMBEDDING_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const ACTION_TYPE = "resume-search-query-embedding";

interface EmbedContentResponse {
  embedding?: { values?: number[] };
  error?: { message?: string };
  usageMetadata?: unknown;
}

/**
 * Query-side embedding with a Redis cache.
 *
 * The cache key is a SHA-256 of the normalized query and is deliberately
 * global rather than tenant-scoped: the embedding of a typed phrase is not
 * tenant data, and sharing it across orgs is the entire point. Only the digest
 * is stored, so the plaintext query never lands in Redis.
 */
@Injectable()
export class ResumeSearchEmbeddingService {
  private readonly logger = new Logger(ResumeSearchEmbeddingService.name);

  constructor(
    private readonly aiUsageLogger: AiUsageLoggerService,
    @Optional() @Inject(REDIS_TOKEN) private readonly redis?: Redis
  ) {}

  /**
   * Returns null instead of throwing — that null is the degraded-mode signal
   * the caller uses to drop the vector half and rank on keywords alone.
   */
  async embedQuery(
    normalizedQuery: string,
    userId?: string
  ): Promise<number[] | null> {
    const key = this.cacheKey(normalizedQuery);

    const cached = await this.readCache(key);
    if (cached) return cached;

    const embedding = await this.callEmbeddingApi(normalizedQuery, userId);
    if (!embedding) return null;

    await this.writeCache(key, embedding);
    return embedding;
  }

  private cacheKey(normalizedQuery: string): string {
    const digest = createHash("sha256").update(normalizedQuery).digest("hex");
    return `${RESUME_SEARCH_EMBEDDING_CACHE_PREFIX}${digest}`;
  }

  private async readCache(key: string): Promise<number[] | null> {
    if (!this.redis) return null;

    try {
      const buffer = await this.redis.getBuffer(key);
      if (!buffer || buffer.length !== RESUME_SEARCH_EMBEDDING_DIMENSIONS * 4) {
        return null;
      }

      const view = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        RESUME_SEARCH_EMBEDDING_DIMENSIONS
      );
      return Array.from(view);
    } catch (error) {
      this.logger.warn(
        `RESUME_SEARCH_EMBEDDING :: readCache : ERROR : ${error}`
      );
      return null;
    }
  }

  private async writeCache(key: string, embedding: number[]): Promise<void> {
    if (!this.redis) return;

    try {
      const floats = Float32Array.from(embedding);
      const buffer = Buffer.from(
        floats.buffer,
        floats.byteOffset,
        floats.byteLength
      );
      await this.redis.setex(
        key,
        RESUME_SEARCH_EMBEDDING_CACHE_TTL_SECONDS,
        buffer
      );
    } catch (error) {
      this.logger.warn(
        `RESUME_SEARCH_EMBEDDING :: writeCache : ERROR : ${error}`
      );
    }
  }

  private async callEmbeddingApi(
    query: string,
    userId?: string
  ): Promise<number[] | null> {
    if (!geminiConfig.apiKey) {
      this.logger.warn(
        "RESUME_SEARCH_EMBEDDING :: callEmbeddingApi : GEMINI_API_KEY not configured"
      );
      return null;
    }

    const url = `${EMBEDDING_API_BASE}/${RESUME_EMBEDDING_MODEL}:embedContent?key=${geminiConfig.apiKey}`;
    const started = Date.now();

    for (
      let attempt = 0;
      attempt < RESUME_SEARCH_EMBEDDING_MAX_ATTEMPTS;
      attempt += 1
    ) {
      // The timer is owned here, not by the helper, so it stays armed across
      // response.json(). Cleared in the helper it would fire on headers, and a
      // server that stalls the body afterwards would hang forever.
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        RESUME_SEARCH_EMBEDDING_TIMEOUT_MS
      );

      try {
        const response = await this.postQuery(url, query, controller.signal);

        if (!response.ok) {
          const isLastAttempt =
            attempt === RESUME_SEARCH_EMBEDDING_MAX_ATTEMPTS - 1;
          if (!isLastAttempt && isTransientHttpResponse(response)) {
            this.logger.warn(
              `RESUME_SEARCH_EMBEDDING :: callEmbeddingApi : RETRY : status=${response.status} attempt=${attempt}`
            );
            await this.sleep(
              retryAfterDelayMs(response.headers.get("retry-after"), attempt)
            );
            continue;
          }
          throw new Error(`Embedding API error: ${response.status}`);
        }

        const data = (await response.json()) as EmbedContentResponse;
        if (data.error) {
          throw new Error(data.error.message || "Unknown embedding error");
        }

        const values = data.embedding?.values;
        if (
          !Array.isArray(values) ||
          values.length !== RESUME_SEARCH_EMBEDDING_DIMENSIONS
        ) {
          throw new Error(
            `Expected ${RESUME_SEARCH_EMBEDDING_DIMENSIONS} dimensions, got ${values?.length ?? 0}`
          );
        }

        void this.aiUsageLogger.logUsage({
          trackingData: { userId, actionType: ACTION_TYPE },
          provider: AI_PROVIDER_GEMINI,
          model: RESUME_EMBEDDING_MODEL,
          ...tokensFromGeminiUsageMetadata(data.usageMetadata),
          status: "success",
          responseTimeMs: Date.now() - started,
          retryCount: attempt,
        });

        return values;
      } catch (error) {
        const isLastAttempt =
          attempt === RESUME_SEARCH_EMBEDDING_MAX_ATTEMPTS - 1;
        const message = error instanceof Error ? error.message : String(error);

        // Only transient failures earn a retry. A dimension mismatch or a
        // malformed payload is deterministic — the same model with the same
        // request reproduces it exactly, so retrying costs a second billed
        // call and doubles the latency the searcher waits through.
        if (!isLastAttempt && isTransientFetchError(error)) {
          this.logger.warn(
            `RESUME_SEARCH_EMBEDDING :: callEmbeddingApi : RETRY : attempt=${attempt} ${message}`
          );
          continue;
        }

        void this.aiUsageLogger.logUsage({
          trackingData: { userId, actionType: ACTION_TYPE },
          provider: AI_PROVIDER_GEMINI,
          model: RESUME_EMBEDDING_MODEL,
          status: "failure",
          errorMessage: message,
          responseTimeMs: Date.now() - started,
          retryCount: attempt,
        });

        // Expected, handled path — the caller degrades to keyword-only.
        this.logger.warn(
          `RESUME_SEARCH_EMBEDDING :: callEmbeddingApi : DEGRADED : ${message}`
        );
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    return null;
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
        model: `models/${RESUME_EMBEDDING_MODEL}`,
        content: { parts: [{ text: query }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: RESUME_SEARCH_EMBEDDING_DIMENSIONS,
      }),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
