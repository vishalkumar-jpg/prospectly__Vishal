import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull, ilike, or, count, desc, ne, sql } from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import { GetMarketplaceJobsQueryDto } from "../marketplace.dto";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import { countriesJsonbOverlapCondition } from "../../recruitment-country-filter.utils";
import {
  buildHasSharedLinkSql,
  buildMyReferCountSql,
} from "../../connector-job-engagement.helpers";

@Injectable()
export class MarketplaceQueryService {
  private readonly logger = new Logger(MarketplaceQueryService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async getMarketplaceJobs(userId: string, query: GetMarketplaceJobsQueryDto) {
    const { newLimit } = parseClampPagination(
      query.limit ?? "10",
      undefined,
      10,
      50
    );
    const MAX_PAGE = 1000;

    const page = Math.min(
      MAX_PAGE,
      Math.max(1, parseInt(query.page ?? "1", 10) || 1)
    );
    const offset = (page - 1) * newLimit;

    const table = schema.recruitmentJobsSchema;

    const conditions = [
      eq(table.status, "active"),
      isNull(table.deletedAt),
      ne(table.requesterId, userId),
    ];

    if (query.search) {
      const search = `%${query.search}%`;
      conditions.push(
        or(
          ilike(table.title, search),
          ilike(table.companyName, search),
          ilike(table.location, search),
          ilike(table.experienceLevel, search),
          ilike(table.description, search),
          sql`${table.requiredSkills}::text ilike ${search}`
        )!
      );
    }

    const countryFilter = countriesJsonbOverlapCondition(
      table.countries,
      query.countries ?? []
    );
    if (countryFilter) {
      conditions.push(countryFilter);
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ total: count() })
      .from(table)
      .where(whereClause);

    const totalJobs = totalResult?.total ?? 0;

    const pricing = schema.recruitmentJobPricesSchema;

    const rows = await this.db
      .select({
        id: table.id,
        title: table.title,
        companyName: table.companyName,
        location: table.location,
        salaryRangeMin: pricing.salaryRangeMin,
        salaryRangeMax: pricing.salaryRangeMax,
        salaryCurrency: pricing.salaryCurrency,
        salaryPeriod: pricing.salaryPeriod,
        salaryRangeNotes: pricing.salaryRangeNotes,
        bountyAmount: pricing.bountyAmount,
        requiredSkills: table.requiredSkills,
        preferredSkills: table.preferredSkills,
        description: table.description,
        createdAt: table.createdAt,
        viewCount: sql<number>`COALESCE((
          SELECT COUNT(rjse.id)
          FROM recruitment_job_shares rjs
          JOIN recruitment_job_share_events rjse ON rjse.share_id = rjs.id
          WHERE rjs.job_id = recruitment_jobs.id
            AND rjse.event_type = 'view'
        ), 0)`.mapWith(Number),
        myReferCount: buildMyReferCountSql(
          sql`${table.id}`,
          sql`${userId}`
        ).mapWith(Number),
        hasSharedLink: buildHasSharedLinkSql(
          sql`${table.id}`,
          sql`${userId}`
        ).mapWith(Boolean),
      })
      .from(table)
      .leftJoin(pricing, eq(table.id, pricing.jobId))
      .where(whereClause)
      .orderBy(desc(table.createdAt))
      .limit(newLimit)
      .offset(offset);

    const connectorPercent = this.feeConfig.getConnectorPercent();
    const jobs = rows.map((row) => {
      const grossAmount = Number(row.bountyAmount);
      return {
        ...row,
        connectorPayout: this.feeConfig.splitAmount(
          grossAmount,
          connectorPercent
        ),
        sharerPayout: this.feeConfig.getSharerPayoutAmount(grossAmount),
      };
    });

    const totalPages = Math.ceil(totalJobs / newLimit);

    return {
      jobs,
      pagination: {
        page,
        limit: newLimit,
        totalJobs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
