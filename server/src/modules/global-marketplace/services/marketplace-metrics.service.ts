import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, or, inArray, count } from "drizzle-orm";

@Injectable()
export class MarketplaceMetricsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getViewsCounts(requestIds: string[]) {
    if (requestIds.length === 0) {
      return [];
    }

    return await this.db
      .select({
        requestId: schema.marketplaceShares.introductionRequestId,
        views: count(),
      })
      .from(schema.marketplaceShareEvents)
      .innerJoin(
        schema.marketplaceShares,
        eq(schema.marketplaceShareEvents.shareId, schema.marketplaceShares.id)
      )
      .where(
        and(
          eq(schema.marketplaceShareEvents.eventType, "view"),
          inArray(schema.marketplaceShares.introductionRequestId, requestIds)
        )
      )
      .groupBy(schema.marketplaceShares.introductionRequestId);
  }

  async getInterestedCounts(requestIds: string[]) {
    if (requestIds.length === 0) {
      return [];
    }

    return await this.db
      .select({
        requestId: schema.marketplaceClaims.introductionRequestId,
        interested: count(),
      })
      .from(schema.marketplaceClaims)
      .where(
        and(
          inArray(schema.marketplaceClaims.introductionRequestId, requestIds),
          or(
            eq(schema.marketplaceClaims.status, "failed"),
            eq(schema.marketplaceClaims.status, "completed"),
            eq(schema.marketplaceClaims.status, "pending")
          )
        )
      )
      .groupBy(schema.marketplaceClaims.introductionRequestId);
  }

  async getInterestedCountForRequest(requestId: string): Promise<number> {
    const interestedCounts = await this.db
      .select({
        requestId: schema.marketplaceClaims.introductionRequestId,
        interested: count(),
      })
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.introductionRequestId, requestId),
          or(
            eq(schema.marketplaceClaims.status, "failed"),
            eq(schema.marketplaceClaims.status, "completed"),
            eq(schema.marketplaceClaims.status, "pending")
          )
        )
      )
      .groupBy(schema.marketplaceClaims.introductionRequestId);

    return interestedCounts.length > 0
      ? Number(interestedCounts[0].interested)
      : 0;
  }

  async getViewCountForRequest(requestId: string): Promise<number> {
    const viewsCounts = await this.getViewsCounts([requestId]);
    return viewsCounts.length > 0 ? Number(viewsCounts[0].views) : 0;
  }

  createMetricsMaps(
    viewsCounts: Array<{ requestId: string; views: number }>,
    interestedCounts: Array<{ requestId: string; interested: number }>
  ): {
    viewsMap: Map<string, number>;
    interestedMap: Map<string, number>;
  } {
    const viewsMap = new Map<string, number>();
    viewsCounts.forEach((vc) => {
      viewsMap.set(vc.requestId, Number(vc.views));
    });

    const interestedMap = new Map<string, number>();
    interestedCounts.forEach((ic) => {
      interestedMap.set(ic.requestId, Number(ic.interested));
    });

    return { viewsMap, interestedMap };
  }
}
