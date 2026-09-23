import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, count, eq, isNull } from "drizzle-orm";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import type { RecruitmentStageKey } from "../../recruitment-stage-keys.constants";
import type { PriorityActionItem } from "../recruiter-dashboard.response";
import { DASHBOARD_LIMITS } from "../recruiter-dashboard.constants";
import {
  DRAFT_PRIORITY_ACTION,
  PRIORITY_STAGE_CONFIGS,
} from "../dashboard-priority-actions.config";
import {
  buildJobPermissionAccessMap,
  countWaitingPriorityActions,
  filterPriorityActionsByJobPermissions,
  type PriorityActionCandidate,
} from "../utils/dashboard-priority-actions-permissions.helper";

@Injectable()
export class DashboardPriorityActionsService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getPriorityActions(
    userId: string,
    countries: string[]
  ): Promise<{ waitingCount: number; items: PriorityActionItem[] }> {
    const jobs = schema.recruitmentJobsSchema;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );

    const [stageRows, draftRows] = await Promise.all([
      Promise.all(
        PRIORITY_STAGE_CONFIGS.map((config) =>
          this.countCandidatesByStage(jobWhere, config.stageKey)
        )
      ),
      this.db
        .select({ jobId: jobs.id, jobTitle: jobs.title })
        .from(jobs)
        .where(and(jobWhere, eq(jobs.status, "draft"))),
    ]);

    const allActions: PriorityActionCandidate[] = [
      ...PRIORITY_STAGE_CONFIGS.flatMap((config, index) =>
        stageRows[index].map((row) => ({
          jobId: row.jobId,
          jobTitle: row.jobTitle,
          type: config.type,
          count: Number(row.count),
          message: config.buildMessage(Number(row.count)),
          priority: config.priority,
        }))
      ),
      ...draftRows.map((row) => ({
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        type: DRAFT_PRIORITY_ACTION.type,
        count: DRAFT_PRIORITY_ACTION.count,
        message: DRAFT_PRIORITY_ACTION.message,
        priority: DRAFT_PRIORITY_ACTION.priority,
      })),
    ].sort((a, b) => b.priority - a.priority || b.count - a.count);

    const jobIds = allActions.map((action) => action.jobId);
    const accessByJob = await buildJobPermissionAccessMap(
      this.db,
      userId,
      jobIds
    );
    const permittedActions = filterPriorityActionsByJobPermissions(
      allActions,
      accessByJob
    );

    const waitingCount = countWaitingPriorityActions(permittedActions);
    const items: PriorityActionItem[] = permittedActions
      .slice(0, DASHBOARD_LIMITS.PRIORITY_ACTIONS)
      .map(({ priority: _priority, ...item }) => item);

    return {
      waitingCount,
      items,
    };
  }

  private async countCandidatesByStage(
    jobWhere: ReturnType<typeof buildAccessibleJobsCondition>,
    stageKey: RecruitmentStageKey
  ) {
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const stages = schema.recruitmentStagesSchema;

    return this.db
      .select({
        jobId: jobs.id,
        jobTitle: jobs.title,
        count: count(candidates.id),
      })
      .from(jobs)
      .innerJoin(candidates, eq(candidates.jobId, jobs.id))
      .innerJoin(stages, eq(stages.id, candidates.stageId))
      .where(
        and(
          jobWhere,
          eq(jobs.status, "active"),
          eq(stages.stageKey, stageKey),
          isNull(candidates.deletedAt)
        )
      )
      .groupBy(jobs.id, jobs.title);
  }
}
