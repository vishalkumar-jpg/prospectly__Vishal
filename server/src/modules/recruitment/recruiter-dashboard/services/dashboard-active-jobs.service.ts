import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { utcDayjs } from "utils/dayjs";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import type { ActiveJobItem } from "../recruiter-dashboard.response";
import { DASHBOARD_LIMITS } from "../recruiter-dashboard.constants";

@Injectable()
export class DashboardActiveJobsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getActiveJobs(
    userId: string,
    countries: string[]
  ): Promise<ActiveJobItem[]> {
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );

    const rows = await this.db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        createdAt: jobs.createdAt,
        applicationCount: count(candidates.id),
      })
      .from(jobs)
      .leftJoin(
        candidates,
        and(eq(candidates.jobId, jobs.id), isNull(candidates.deletedAt))
      )
      .where(and(jobWhere, inArray(jobs.status, ["active", "draft"])))
      .groupBy(jobs.id, jobs.title, jobs.status, jobs.createdAt)
      .orderBy(asc(jobs.createdAt))
      .limit(DASHBOARD_LIMITS.ACTIVE_JOBS);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      applicationCount: Number(row.applicationCount),
      status: row.status === "draft" ? "draft" : "active",
      daysOpen: Math.max(0, utcDayjs().diff(utcDayjs(row.createdAt), "day")),
    }));
  }
}
