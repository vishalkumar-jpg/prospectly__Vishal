import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";

export const AI_PROVIDER_GEMINI = "gemini";

export type AiUsageLogStatus = "success" | "failure";

/** Optional context attached at call sites (e.g. controller user + action). */
export interface AiUsageTrackingData {
  userId?: string;
  actionType?: string;
}

export interface LogAiUsageParams {
  trackingData?: AiUsageTrackingData;
  provider: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  status: AiUsageLogStatus;
  errorMessage?: string | null;
  responseTimeMs: number;
  retryCount: number;
}

@Injectable()
export class AiUsageLoggerService {
  private readonly logger = new Logger(AiUsageLoggerService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Persist one AI call outcome. Never throws — failures are logged only.
   */
  async logUsage(params: LogAiUsageParams): Promise<void> {
    try {
      await this.db.insert(schema.aiUsageLogs).values({
        userId: params.trackingData?.userId ?? null,
        actionType: params.trackingData?.actionType ?? null,
        provider: params.provider,
        model: params.model,
        promptTokens: params.promptTokens ?? null,
        completionTokens: params.completionTokens ?? null,
        totalTokens: params.totalTokens ?? null,
        status: params.status,
        errorMessage: params.errorMessage?.slice(0, 4000) ?? null,
        responseTimeMs: params.responseTimeMs,
        retryCount: params.retryCount,
        createdAt: toUTC(),
      });
    } catch (error) {
      this.logger.error(
        `AI_USAGE_LOGGER :: logUsage : ERROR : ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
