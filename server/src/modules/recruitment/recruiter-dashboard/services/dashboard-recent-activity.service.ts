import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import type { RecentActivityItem } from "../recruiter-dashboard.response";
import {
  ACTIVITY_HIRED_STAGE,
  ACTIVITY_STAGE_KEYS,
  DASHBOARD_LIMITS,
} from "../recruiter-dashboard.constants";

function formatUserName(
  fullName: string | null,
  firstName: string | null,
  lastName: string | null
): string {
  if (fullName?.trim()) return fullName.trim();
  const parts = [firstName, lastName].filter(Boolean).join(" ").trim();
  return parts || "Someone";
}

@Injectable()
export class DashboardRecentActivityService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getRecentActivity(
    userId: string,
    countries: string[]
  ): Promise<RecentActivityItem[]> {
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const { users } = schema;
    const history = schema.recruitmentCandidateStageHistory;
    const stages = schema.recruitmentStagesSchema;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );

    const [appliedRows, stageRows] = await Promise.all([
      this.db
        .select({
          id: candidates.id,
          timestamp: candidates.createdAt,
          candidateName: users.fullName,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: jobs.title,
        })
        .from(candidates)
        .innerJoin(jobs, eq(jobs.id, candidates.jobId))
        .innerJoin(users, eq(users.id, candidates.candidateUserId))
        .where(and(jobWhere, isNull(candidates.deletedAt)))
        .orderBy(desc(candidates.createdAt))
        .limit(DASHBOARD_LIMITS.RECENT_ACTIVITY * 2),
      this.db
        .select({
          id: history.id,
          timestamp: history.createdAt,
          stageKey: stages.stageKey,
          candidateName: users.fullName,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: jobs.title,
        })
        .from(history)
        .innerJoin(candidates, eq(candidates.id, history.candidateId))
        .innerJoin(jobs, eq(jobs.id, candidates.jobId))
        .innerJoin(stages, eq(stages.id, history.stageId))
        .innerJoin(users, eq(users.id, candidates.candidateUserId))
        .where(
          and(
            jobWhere,
            isNull(history.deletedAt),
            isNull(candidates.deletedAt),
            inArray(stages.stageKey, [...ACTIVITY_STAGE_KEYS])
          )
        )
        .orderBy(desc(history.createdAt))
        .limit(DASHBOARD_LIMITS.RECENT_ACTIVITY * 2),
    ]);

    const events: RecentActivityItem[] = [
      ...appliedRows.map((row) => ({
        id: `applied-${row.id}`,
        type: "applied" as const,
        message: `${formatUserName(row.candidateName, row.firstName, row.lastName)} applied for ${row.jobTitle}`,
        timestamp: row.timestamp.toISOString(),
      })),
      ...stageRows.map((row) => ({
        id: `stage-${row.id}`,
        type:
          row.stageKey === ACTIVITY_HIRED_STAGE
            ? ("hired" as const)
            : ("interview_scheduled" as const),
        message:
          row.stageKey === ACTIVITY_HIRED_STAGE
            ? `${formatUserName(row.candidateName, row.firstName, row.lastName)} hired for ${row.jobTitle}`
            : `Interview scheduled with ${formatUserName(row.candidateName, row.firstName, row.lastName)}`,
        timestamp: row.timestamp.toISOString(),
      })),
    ];

    return events
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, DASHBOARD_LIMITS.RECENT_ACTIVITY);
  }
}
