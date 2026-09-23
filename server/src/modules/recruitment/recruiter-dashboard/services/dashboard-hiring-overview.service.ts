/* eslint-disable no-nested-ternary */
import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, count, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { resolveDashboardPeriod } from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-period.utils";
import { buildMetricWithChange } from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-metrics.utils";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import type { RecruiterHiringOverviewResponse } from "../recruiter-dashboard.response";
import {
  DEFAULT_DASHBOARD_PERIOD,
  type DashboardPeriod,
} from "../recruiter-dashboard.constants";

@Injectable()
export class DashboardHiringOverviewService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getHiringOverview(
    userId: string,
    countries: string[],
    period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD
  ): Promise<RecruiterHiringOverviewResponse> {
    const window = resolveDashboardPeriod(period);
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );

    const openAt = (asOf: Date) =>
      and(
        jobWhere,
        eq(jobs.status, "active"),
        lt(jobs.createdAt, asOf),
        or(isNull(jobs.closedAt), gte(jobs.closedAt, asOf))
      );

    const closedCurrentWhere = window.periodStart
      ? and(
          jobWhere,
          eq(jobs.status, "closed"),
          gte(jobs.closedAt, window.periodStart)
        )
      : and(jobWhere, eq(jobs.status, "closed"));

    const closedPreviousWhere = window.isAllTimeSnapshot
      ? and(
          jobWhere,
          eq(jobs.status, "closed"),
          lt(jobs.closedAt, window.comparisonStart)
        )
      : and(
          jobWhere,
          eq(jobs.status, "closed"),
          gte(jobs.closedAt, window.previousStart!),
          lt(jobs.closedAt, window.previousEnd!)
        );

    const [
      openNow,
      openPrev,
      closedCurrent,
      closedPrevious,
      candidatesCurrent,
      candidatesPrevious,
      avgFillCurrent,
      avgFillPrevious,
    ] = await Promise.all([
      this.countJobs(openAt(window.now)),
      this.countJobs(openAt(window.comparisonStart)),
      this.countJobs(closedCurrentWhere),
      this.countJobs(closedPreviousWhere),
      this.countCandidates(jobWhere, candidates, jobs, window.periodStart),
      window.isAllTimeSnapshot
        ? this.countCandidates(
            jobWhere,
            candidates,
            jobs,
            null,
            window.comparisonStart
          )
        : this.countCandidates(
            jobWhere,
            candidates,
            jobs,
            window.previousStart!,
            window.previousEnd!
          ),
      this.avgTimeToFill(jobWhere, jobs, window.periodStart),
      window.isAllTimeSnapshot
        ? this.avgTimeToFill(jobWhere, jobs, null, window.comparisonStart)
        : this.avgTimeToFill(
            jobWhere,
            jobs,
            window.previousStart!,
            window.previousEnd!
          ),
    ]);

    return {
      openRoles: buildMetricWithChange(openNow, openPrev),
      closedRoles: buildMetricWithChange(closedCurrent, closedPrevious),
      totalCandidates: buildMetricWithChange(
        candidatesCurrent,
        candidatesPrevious
      ),
      avgTimeToFillDays: {
        ...buildMetricWithChange(
          Math.round(avgFillCurrent),
          Math.round(avgFillPrevious)
        ),
        targetDays: 20,
      },
    };
  }

  private async countJobs(where: ReturnType<typeof and>) {
    const jobs = schema.recruitmentJobsSchema;
    const [row] = await this.db
      .select({ total: count() })
      .from(jobs)
      .where(where);
    return Number(row?.total ?? 0);
  }

  private async countCandidates(
    jobWhere: ReturnType<typeof buildAccessibleJobsCondition>,
    candidates: typeof schema.recruitmentJobCandidates,
    jobs: typeof schema.recruitmentJobsSchema,
    from: Date | null,
    to?: Date
  ) {
    const dateFilter = from
      ? to
        ? and(gte(candidates.createdAt, from), lt(candidates.createdAt, to))
        : gte(candidates.createdAt, from)
      : to
        ? lt(candidates.createdAt, to)
        : undefined;
    const [row] = await this.db
      .select({ total: count(candidates.id) })
      .from(candidates)
      .innerJoin(jobs, eq(jobs.id, candidates.jobId))
      .where(
        and(
          jobWhere,
          isNull(candidates.deletedAt),
          ...(dateFilter ? [dateFilter] : [])
        )
      );
    return Number(row?.total ?? 0);
  }

  private async avgTimeToFill(
    jobWhere: ReturnType<typeof buildAccessibleJobsCondition>,
    jobs: typeof schema.recruitmentJobsSchema,
    from: Date | null,
    to?: Date
  ) {
    const dateFilter = from
      ? to
        ? and(
            eq(jobs.status, "closed"),
            gte(jobs.closedAt, from),
            lt(jobs.closedAt, to)
          )
        : and(eq(jobs.status, "closed"), gte(jobs.closedAt, from))
      : to
        ? and(eq(jobs.status, "closed"), lt(jobs.closedAt, to))
        : eq(jobs.status, "closed");
    const [row] = await this.db
      .select({
        avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${jobs.closedAt} - ${jobs.createdAt})) / 86400), 0)`,
      })
      .from(jobs)
      .where(and(jobWhere, dateFilter));
    return Number(row?.avgDays ?? 0);
  }
}
