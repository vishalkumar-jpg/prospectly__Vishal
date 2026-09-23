import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { sql } from "drizzle-orm";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { AnyType } from "types/common";
import { MarketplaceBrowseService } from "./services/marketplace-browse.service";
import { BrowseMarketplaceQueryDto } from "./dto/browse-marketplace.dto";

@Injectable()
export class GlobalMarketplaceService {
  private readonly logger = new Logger(GlobalMarketplaceService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly browseService: MarketplaceBrowseService
  ) {}

  // Delegate browse methods to browse service
  async browseMarketplace(userId: string, query: BrowseMarketplaceQueryDto) {
    return this.browseService.browseMarketplace(userId, query);
  }

  async getPublicRequestDetails(requestId: string, sharerCode: string) {
    return this.browseService.getPublicRequestDetails(requestId, sharerCode);
  }

  getFilterOptions() {
    return this.browseService.getFilterOptions();
  }

  async removeRequestFromMarketplace(userId: string, requestId: string) {
    return this.browseService.removeRequestFromMarketplace(userId, requestId);
  }

  /**
   * Get count of marketplace opportunities matched to user's network
   */
  async getMatchedOpportunitiesCount(userId: string): Promise<number> {
    try {
      if (!userId || typeof userId !== "string") {
        return 0;
      }

      const result = await this.db.execute(
        sql<{
          count: number;
        }>`
        SELECT COUNT(DISTINCT ir.id) as count
        FROM introduction_requests ir
        WHERE ir.is_marketplace_visible = true
        AND ir.status = ${IntroductionStatus.PENDING}
        AND ir.requester_id != ${userId}
        AND ir.contact_id IS NOT NULL
        AND (ir.expired_at IS NULL OR ir.expired_at > NOW())
        AND EXISTS (
          SELECT 1
          FROM contact_relationships cr
          INNER JOIN contacts c ON cr.contact_id = c.id
          WHERE cr.contact_id = ir.contact_id
          AND cr.user_id = ${userId}
          AND c.deleted_at IS NULL
        )
        `
      );

      const stats = Array.isArray(result)
        ? result[0]
        : (result as AnyType).rows[0];

      return Number(stats?.count ?? 0);
    } catch (error) {
      this.logger.error(
        `GLOBAL_MARKETPLACE_SERVICE :: GET_MATCHED_OPPORTUNITIES_COUNT :: ERROR :: ${error}`
      );
      return 0;
    }
  }

  /**
   * Get high-value opportunities from the marketplace
   */
  async getHighValueOpportunities(userId: string): Promise<
    Array<{
      id: string;
      bountyAmount: number;
      title: string;
      description: string;
      isUrgent: boolean;
    }>
  > {
    try {
      if (!userId || typeof userId !== "string") {
        return [];
      }

      const result = await this.db.execute(
        sql<{
          id: string;
          bounty_amount: string;
          meeting_title: string;
          meeting_description: string;
          is_urgent: boolean;
        }>`
        SELECT
          ir.id,
          ir.bounty_amount,
          ir.meeting_title,
          ir.meeting_description,
          ir.is_urgent
        FROM introduction_requests ir
        WHERE ir.is_marketplace_visible = true
        AND ir.status = ${IntroductionStatus.PENDING}
        AND ir.requester_id != ${userId}
        AND (ir.expired_at IS NULL OR ir.expired_at > NOW())
        ORDER BY
          CASE WHEN CAST(ir.bounty_amount AS DECIMAL) > 500 THEN 0 ELSE 1 END,
          CAST(ir.bounty_amount AS DECIMAL) DESC,
          ir.created_at DESC
        LIMIT 5
        `
      );

      const opportunities = Array.isArray(result)
        ? result
        : (result as AnyType).rows || [];

      return opportunities.map((opp) => ({
        id: opp.id,
        bountyAmount: Number(opp.bounty_amount ?? 0),
        title: opp.meeting_title,
        description: opp.meeting_description,
        isUrgent: Boolean(opp.is_urgent ?? false),
      }));
    } catch (error) {
      this.logger.error(
        `GLOBAL_MARKETPLACE_SERVICE :: GET_HIGH_VALUE_OPPORTUNITIES :: ERROR :: ${error}`
      );
      return [];
    }
  }
}
