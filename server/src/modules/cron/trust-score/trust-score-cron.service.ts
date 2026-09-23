import { Injectable, Logger, Inject } from "@nestjs/common";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { HighSuccessRateHandlerService } from "./high-success-rate-handler.service";
import { NoResponseHandlerService } from "./no-response-handler.service";

@Injectable()
export class TrustScoreCronService {
  private readonly logger = new Logger(TrustScoreCronService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    @Inject(NoResponseHandlerService)
    private readonly noResponseHandlerService: NoResponseHandlerService,
    @Inject(HighSuccessRateHandlerService)
    private readonly highSuccessRateHandlerService: HighSuccessRateHandlerService
  ) {}

  /**
   * Check for potential connectors with no response after 48 hours
   * Runs every 2 hours
   * Delegates to NoResponseHandlerService
   */
  async checkNoResponse48h(): Promise<void> {
    await this.noResponseHandlerService.checkNoResponse48h();
  }

  /**
   * Check high success rate for all connectors
   * Runs every 6 hours
   * Delegates to HighSuccessRateHandlerService
   */
  async checkHighSuccessRate(): Promise<void> {
    await this.highSuccessRateHandlerService.checkHighSuccessRate();
  }

  /**
   * Recover failed jobs from the queue
   * Runs every 2 hours
   */
  async recoverFailedJobs(): Promise<void> {
    this.logger.log("🔄 Recovering failed trust score jobs...");

    try {
      const queueStats = await this.trustScoreQueueService.getQueueStats();

      if (queueStats.failed === 0) {
        this.logger.log("No failed jobs to recover");
        return;
      }
      this.logger.log(
        `⚠️  Failed job recovery: ${queueStats.failed} failed jobs found. Consider implementing manual recovery if needed.`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in recoverFailedJobs: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
