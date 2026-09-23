import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { resolveDashboardPeriod } from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-period.utils";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import { buildCandidateReachedStageCondition } from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-funnel.utils";
import type { RecruiterCandidateFunnelResponse } from "../recruiter-dashboard.response";
import {
  DEFAULT_DASHBOARD_PERIOD,
  FUNNEL_INTERVIEWED_STAGES,
  FUNNEL_SCREENED_STAGES,
  type DashboardPeriod,
} from "../recruiter-dashboard.constants";

@Injectable()
export class DashboardCandidateFunnelService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getCandidateFunnel(
    userId: string,
    countries: string[],
    period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD
  ): Promise<RecruiterCandidateFunnelResponse> {
    const { periodStart } = resolveDashboardPeriod(period);
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const stages = schema.recruitmentStagesSchema;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );
    const baseWhere = and(
      jobWhere,
      isNull(candidates.deletedAt),
      ...(periodStart ? [gte(candidates.createdAt, periodStart)] : [])
    );

    const screenedCondition = buildCandidateReachedStageCondition(
      candidates.id,
      stages.stageKey,
      FUNNEL_SCREENED_STAGES
    );
    const interviewedCondition = buildCandidateReachedStageCondition(
      candidates.id,
      stages.stageKey,
      FUNNEL_INTERVIEWED_STAGES
    );
    const hiredCondition = buildCandidateReachedStageCondition(
      candidates.id,
      stages.stageKey,
      ["hired"]
    );

    const [row] = await this.db
      .select({
        applied: count(candidates.id),
        screened: sql<number>`COUNT(*) FILTER (WHERE ${screenedCondition})`,
        interviewed: sql<number>`COUNT(*) FILTER (WHERE ${interviewedCondition})`,
        hired: sql<number>`COUNT(*) FILTER (WHERE ${hiredCondition})`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${stages.stageKey} = 'rejected')`,
      })
      .from(candidates)
      .innerJoin(jobs, eq(jobs.id, candidates.jobId))
      .leftJoin(stages, eq(stages.id, candidates.stageId))
      .where(baseWhere);

    return {
      applied: Number(row?.applied ?? 0),
      screened: Number(row?.screened ?? 0),
      interviewed: Number(row?.interviewed ?? 0),
      hired: Number(row?.hired ?? 0),
      rejected: Number(row?.rejected ?? 0),
    };
  }
}
