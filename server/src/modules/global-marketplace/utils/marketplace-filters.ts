import { sql, eq, or, gte, lte, desc, asc, SQL } from "drizzle-orm";
import * as schema from "database/schema";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { BrowseMarketplaceQueryDto } from "../dto/browse-marketplace.dto";

/**
 * Builds filter conditions array for marketplace browse query
 */
export function buildFilterConditions(
  userId: string,
  query: BrowseMarketplaceQueryDto
): SQL[] {
  const conditions: SQL[] = [
    eq(schema.introductionRequests.isMarketplaceVisible, true),
    eq(schema.introductionRequests.status, IntroductionStatus.PENDING),
    eq(schema.introductionRequests.requesterArchived, false),
    sql`${schema.introductionRequests.requesterId} != ${userId}`,
    or(
      sql`${schema.introductionRequests.expiredAt} IS NULL`,
      sql`${schema.introductionRequests.expiredAt} > NOW()`
    ),
  ];

  if (query.bountyMin) {
    conditions.push(
      gte(schema.introductionRequests.bountyAmount, query.bountyMin)
    );
  }
  if (query.bountyMax) {
    conditions.push(
      lte(schema.introductionRequests.bountyAmount, query.bountyMax)
    );
  }

  return conditions;
}

/**
 * Builds orderBy clause from sortBy parameter
 */
export function buildOrderBy(sortBy?: string) {
  switch (sortBy) {
    case "bounty-low":
      return asc(schema.introductionRequests.bountyAmount);
    case "ending":
      return asc(schema.introductionRequests.expiredAt);
    case "bounty-high":
    default:
      return desc(schema.introductionRequests.bountyAmount);
  }
}

/**
 * Returns filter options configuration
 */
export function getFilterOptions() {
  return {
    urgencyOptions: ["urgent", "high", "normal", "flexible"],
    bountyRange: { min: 10, max: 10000 },
    sortOptions: [
      { value: "bounty-high", label: "Highest Referral Payout" },
      { value: "bounty-low", label: "Lowest Referral Payout" },
      { value: "ending", label: "Ending Soon" },
      { value: "interest", label: "Most Interest" },
    ],
  };
}
