import { Injectable, Logger, Inject } from "@nestjs/common";
import { SuccessRateTrustScoreService } from "modules/trust-score-queue/success-rate-trust-score.service";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { eq } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class HighSuccessRateHandlerService {
  private readonly logger = new Logger(HighSuccessRateHandlerService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(SuccessRateTrustScoreService)
    private readonly successRateTrustScoreService: SuccessRateTrustScoreService
  ) {}

  /**
   * Check high success rate for all connectors
   * Runs every 6 hours
   *
   * This function:
   * 1. Gets all connectors who have accepted at least one request
   * 2. Processes each connector's success rate
   * 3. Awards or deducts trust score points based on threshold
   */
  async checkHighSuccessRate(): Promise<void> {
    this.logger.log("🔄 Checking high success rate for all connectors...");

    try {
      // Get the high_success_rate rule
      const successRateRule =
        await this.successRateTrustScoreService.getSuccessRateRule();

      if (!successRateRule) {
        this.logger.warn("No active high_success_rate rule found");
        return;
      }

      // Get all connectors who have accepted at least one request
      const connectors = await this.db
        .selectDistinct({
          connectorId:
            schema.introductionPotentialConnectors.potentialConnectorId,
        })
        .from(schema.introductionPotentialConnectors)
        .where(eq(schema.introductionPotentialConnectors.status, "accepted"));

      this.logger.log(`Found ${connectors.length} connectors to check`);

      let processedCount = 0;

      // Process each connector
      for (const { connectorId } of connectors) {
        try {
          await this.successRateTrustScoreService.processSuccessRateTrustScore(
            connectorId
          );
          processedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to process success rate for connector ${connectorId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      this.logger.log(
        `✅ Processed success rate check for ${processedCount} connectors`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in checkHighSuccessRate: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
