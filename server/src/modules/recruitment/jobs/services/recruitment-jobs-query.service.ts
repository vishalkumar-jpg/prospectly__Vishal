import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  and,
  eq,
  isNull,
  ilike,
  or,
  inArray,
  count,
  desc,
  asc,
  sql,
  getTableColumns,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { parseClampPagination } from "utils/pagination.utils";
import { GetRecruitmentJobsQueryDto } from "../recruitment-jobs.dto";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { ResolvedJobAccess } from "../../collaboration/services/recruitment-access.service";
import { COLLABORATOR_STATUS } from "../../collaboration/recruitment-collaboration.constants";
import { countriesJsonbOverlapCondition } from "../../recruitment-country-filter.utils";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "../../recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";

/** Per-user access metadata attached to a job for the frontend to gate UI. */
export interface JobAccessMeta {
  accessRole: "owner" | "collaborator";
  permissions: string[];
}

/** Pipeline view of a job with only essential fields */
export interface PipelineJobView {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  workType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  bountyAmount: string;
  status: string;
  closedAt: Date | null;
  closedReason: string | null;
}

@Injectable()
export class RecruitmentJobsQueryService {
  private readonly logger = new Logger(RecruitmentJobsQueryService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getJobById(
    access: ResolvedJobAccess,
    options: { view: "pipeline" }
  ): Promise<PipelineJobView & JobAccessMeta>;
  async getJobById(
    access: ResolvedJobAccess,
    options?: { view?: "full" }
  ): Promise<
    Omit<schema.RecruitmentJob, "embedding"> &
      JobAccessMeta & {
        assessmentQuestions: schema.RecruitmentJobAssessmentQuestion[];
      }
  >;
  async getJobById(
    access: ResolvedJobAccess,
    options?: { view?: "full" | "pipeline" }
  ): Promise<
    | (PipelineJobView & JobAccessMeta)
    | (Omit<schema.RecruitmentJob, "embedding"> &
        JobAccessMeta & {
          assessmentQuestions: schema.RecruitmentJobAssessmentQuestion[];
        })
  > {
    // Access was resolved by RecruitmentPermissionGuard (owner or active
    // collaborator) and passed in — no re-resolve here.
    const accessMeta: JobAccessMeta = {
      accessRole: access.role,
      permissions: [...access.permissions],
    };

    const table = schema.recruitmentJobsSchema;
    const whereClause = and(
      eq(table.id, access.job.id),
      isNull(table.deletedAt)
    );

    if (options?.view === "pipeline") {
      const pricing = schema.recruitmentJobPricesSchema;

      const [job] = await this.db
        .select({
          id: table.id,
          title: table.title,
          companyName: table.companyName,
          location: table.location,
          workType: table.workType,
          employmentType: table.employmentType,
          experienceLevel: table.experienceLevel,
          salaryRangeMin: pricing.salaryRangeMin,
          salaryRangeMax: pricing.salaryRangeMax,
          salaryCurrency: pricing.salaryCurrency,
          salaryPeriod: pricing.salaryPeriod,
          bountyAmount: pricing.bountyAmount,
          // The kanban needs hasSuccessFee to gate the per-connector
          // classification UI in Hire / Release / Edit dialogs and to gate
          // the manual-release CTAs on the Hired card.
          hasSuccessFee: pricing.hasSuccessFee,
          status: table.status,
          closedAt: table.closedAt,
          closedReason: table.closedReason,
        })
        .from(table)
        .leftJoin(pricing, eq(table.id, pricing.jobId))
        .where(whereClause);

      if (!job) {
        throw new NotFoundException(
          RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
        );
      }

      return { ...job, ...accessMeta };
    }

    const { embedding: _embedding, ...jobColumns } = getTableColumns(table);
    const pricing = schema.recruitmentJobPricesSchema;
    const [job] = await this.db
      .select({
        ...jobColumns,
        salaryRangeMin: pricing.salaryRangeMin,
        salaryRangeMax: pricing.salaryRangeMax,
        salaryCurrency: pricing.salaryCurrency,
        salaryPeriod: pricing.salaryPeriod,
        salaryRangeNotes: pricing.salaryRangeNotes,
        bountyAmount: pricing.bountyAmount,
        providerFee: pricing.providerFee,
        processingFee: pricing.processingFee,
        totalAmount: pricing.totalAmount,
        hasSuccessFee: pricing.hasSuccessFee,
        successFeeAmount: pricing.successFeeAmount,
        intPayoutWaits: pricing.intPayoutWaits,
        extPayoutWaits: pricing.extPayoutWaits,
        intConnectorPayoutWaitDays: pricing.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays: pricing.extConnectorPayoutWaitDays,
        flatReferralAmount: pricing.flatReferralAmount,
        flatDepositFeePercent: pricing.flatDepositFeePercent,
        flatDepositAmount: pricing.flatDepositAmount,
      })
      .from(table)
      .leftJoin(pricing, eq(table.id, pricing.jobId))
      .where(whereClause);

    if (!job) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    // Assessment questions are self-contained rows (copy-on-add) — no join to
    // the bank needed. Ordered by the recruiter's drag sequence.
    const jobQuestions = schema.recruitmentJobAssessmentQuestionsSchema;
    const assessmentQuestions = await this.db
      .select()
      .from(jobQuestions)
      .where(
        and(
          eq(jobQuestions.jobId, access.job.id),
          isNull(jobQuestions.deletedAt)
        )
      )
      .orderBy(asc(jobQuestions.orderIndex));

    return { ...job, assessmentQuestions, ...accessMeta };
  }

  async getJobsByUser(userId: string, query: GetRecruitmentJobsQueryDto) {
    const { newLimit } = parseClampPagination(
      query.limit ?? "10",
      undefined,
      10,
      50
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const offset = (page - 1) * newLimit;

    const table = schema.recruitmentJobsSchema;

    // Jobs the user owns OR actively collaborates on. Collaborated jobs appear
    // in the same list, tagged with accessRole so the UI can badge + gate them.
    // Mirror the access resolver's verified-org re-check (usersShareVerifiedOrg)
    // so a collaborator who left the owner's org stops seeing the card here too —
    // otherwise the list and the detail route (which 403s them) disagree.
    const meOrg = alias(schema.organisationMemberSchema, "me_org");
    const ownerOrg = alias(schema.organisationMemberSchema, "owner_org");
    const collaboratorJobIds = this.db
      .selectDistinct({ jobId: schema.recruitmentJobCollaborators.jobId })
      .from(schema.recruitmentJobCollaborators)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobsSchema.id,
          schema.recruitmentJobCollaborators.jobId
        )
      )
      .innerJoin(
        meOrg,
        and(
          eq(meOrg.userId, userId),
          eq(meOrg.isVerified, true),
          isNull(meOrg.deletedAt)
        )
      )
      .innerJoin(
        ownerOrg,
        and(
          eq(ownerOrg.userId, schema.recruitmentJobsSchema.requesterId),
          eq(ownerOrg.organisationId, meOrg.organisationId),
          eq(ownerOrg.isVerified, true),
          isNull(ownerOrg.deletedAt)
        )
      )
      .innerJoin(
        schema.organisation,
        and(
          eq(schema.organisation.id, meOrg.organisationId),
          eq(schema.organisation.isActive, true),
          isNull(schema.organisation.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.collaboratorUserId, userId),
          eq(
            schema.recruitmentJobCollaborators.status,
            COLLABORATOR_STATUS.ACTIVE
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      );

    const conditions = [
      or(eq(table.requesterId, userId), inArray(table.id, collaboratorJobIds))!,
      isNull(table.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(table.status, query.status));
    }

    if (query.search) {
      const search = `%${query.search}%`;
      conditions.push(
        or(
          ilike(table.title, search),
          ilike(table.companyName, search),
          ilike(table.location, search),
          ilike(table.description, search)
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
    const notifications = schema.recruitmentNotificationsSchema;
    const jobSettings = schema.recruitmentJobSettingsSchema;

    // A job can have multiple notification rows (one per send). Pick the latest
    // per job so the listing shows one row per job and reflects the most recent
    // send, rather than duplicating jobs across their notification history.
    const latestNotification = this.db
      .selectDistinctOn([notifications.jobId], {
        jobId: notifications.jobId,
        status: notifications.status,
        sentCount: notifications.sentCount,
        totalRecipients: notifications.totalRecipients,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, "new_job_post"),
          isNull(notifications.deletedAt)
        )
      )
      .orderBy(notifications.jobId, desc(notifications.createdAt))
      .as("latest_notification");

    const jobs = await this.db
      .select({
        id: table.id,
        title: table.title,
        companyName: table.companyName,
        location: table.location,
        workType: table.workType,
        employmentType: table.employmentType,
        status: table.status,
        salaryRangeMin: pricing.salaryRangeMin,
        salaryRangeMax: pricing.salaryRangeMax,
        salaryCurrency: pricing.salaryCurrency,
        salaryPeriod: pricing.salaryPeriod,
        bountyAmount: pricing.bountyAmount,
        totalAmount: pricing.totalAmount,
        hasSuccessFee: pricing.hasSuccessFee,
        successFeeAmount: pricing.successFeeAmount,
        intPayoutWaits: pricing.intPayoutWaits,
        extPayoutWaits: pricing.extPayoutWaits,
        intConnectorPayoutWaitDays: pricing.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays: pricing.extConnectorPayoutWaitDays,
        flatReferralAmount: pricing.flatReferralAmount,
        flatDepositFeePercent: pricing.flatDepositFeePercent,
        flatDepositAmount: pricing.flatDepositAmount,
        probationPeriodDays: table.probationPeriodDays,
        experienceLevel: table.experienceLevel,
        description: table.description,
        createdAt: table.createdAt,
        closedAt: table.closedAt,
        closedReason: table.closedReason,
        accessRole: sql<string>`CASE WHEN ${table.requesterId} = ${userId} THEN 'owner' ELSE 'collaborator' END`,
        notificationStatus: latestNotification.status,
        notificationSentCount: latestNotification.sentCount,
        notificationTotalRecipients: latestNotification.totalRecipients,
        // Number of times this job has been notified (one row per send).
        notificationSendCount: sql<number>`COALESCE((
          SELECT COUNT(rn.id)
          FROM recruitment_notifications rn
          WHERE rn.job_id = recruitment_jobs.id
            AND rn.type = 'new_job_post'
            AND rn.deleted_at IS NULL
        ), 0)`.mapWith(Number),
        viewCount: sql<number>`COALESCE((
          SELECT COUNT(rjse.id)
          FROM recruitment_job_shares rjs
          JOIN recruitment_job_share_events rjse ON rjse.share_id = rjs.id
          WHERE rjs.job_id = recruitment_jobs.id
            AND rjse.event_type = 'view'
        ), 0)`.mapWith(Number),
        activeCandidateCount: sql<number>`COALESCE((
          SELECT COUNT(rjc.id)
          FROM recruitment_job_candidates rjc
          JOIN recruitment_stages rs ON rs.id = rjc.stage_id
          WHERE rjc.job_id = recruitment_jobs.id
            AND rjc.deleted_at IS NULL
            AND rs.stage_key IN (
              'not_qualified',
              'in_review',
              'shortlisted',
              'interview_invite_sent',
              'interview_scheduled'
            )
        ), 0)`.mapWith(Number),
        notificationSnapshot: jobSettings.notificationSnapshot,
      })
      .from(table)
      .leftJoin(pricing, eq(table.id, pricing.jobId))
      .leftJoin(latestNotification, eq(latestNotification.jobId, table.id))
      .leftJoin(
        jobSettings,
        and(eq(jobSettings.jobId, table.id), isNull(jobSettings.deletedAt))
      )
      .where(whereClause)
      .orderBy(desc(table.createdAt))
      .limit(newLimit)
      .offset(offset);

    const shapedJobs = jobs.map((job) => {
      const {
        notificationStatus,
        notificationSentCount,
        notificationTotalRecipients,
        notificationSendCount,
        ...rest
      } = job;
      return {
        ...rest,
        notification: notificationStatus
          ? {
              status: notificationStatus,
              sentCount: notificationSentCount ?? 0,
              totalRecipients: notificationTotalRecipients ?? 0,
              sendCount: notificationSendCount ?? 0,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(totalJobs / newLimit);

    return {
      jobs: shapedJobs,
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

  async getJobStats(userId: string) {
    const table = schema.recruitmentJobsSchema;
    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const accessibleWhere = buildAccessibleJobsCondition(
      userId,
      table,
      collabSubquery,
      []
    );

    const [result] = await this.db
      .select({
        totalJobs: count(),
        activeJobs: count(sql`CASE WHEN ${table.status} = 'active' THEN 1 END`),
        closedJobs: count(sql`CASE WHEN ${table.status} = 'closed' THEN 1 END`),
      })
      .from(table)
      .where(accessibleWhere);

    return {
      totalJobs: result?.totalJobs ?? 0,
      activeJobs: result?.activeJobs ?? 0,
      closedJobs: result?.closedJobs ?? 0,
    };
  }
}
