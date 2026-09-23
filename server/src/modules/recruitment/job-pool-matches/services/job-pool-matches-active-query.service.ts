import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  eq,
  and,
  isNull,
  sql,
  desc,
  inArray,
  or,
  ilike,
  count,
} from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import {
  mergeReferredJobsIntoInboxMaps,
  queryReferredInboxJobAggregates,
} from "./job-pool-matches-referred-inbox.helper";
import { GetJobPoolMatchesQueryDto } from "../job-pool-matches.dto";
import {
  JOB_POOL_MATCH_STATUS,
  CLAIMED_STATUSES,
} from "../job-pool-matches.constants";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
  type ClientGapAnalysisPayload,
} from "../../candidate-evaluation/gap-analysis.mapper";
import {
  buildHasSharedLinkSql,
  buildMyReferCountSql,
} from "../../connector-job-engagement.helpers";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";

/** Non-terminal statuses shown in the connector inbox (drives which jobs list) */
const INBOX_STATUSES = [
  JOB_POOL_MATCH_STATUS.PROCESSING,
  JOB_POOL_MATCH_STATUS.PENDING,
  JOB_POOL_MATCH_STATUS.APPROVED,
  JOB_POOL_MATCH_STATUS.CONNECTOR_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
  JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
  JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
  JOB_POOL_MATCH_STATUS.FAILED,
] as const;

/**
 * Pool-match statuses rendered in the per-job board's pool-sourced columns
 * (AI Analysis / Qualified / Not Qualified / Consent Pending / Consent Declined
 * / Not Referred). Excludes `consent_accepted` (superseded by its
 * recruitment_job_candidates row, which renders on the referral side) and
 * `approved` (orphaned/legacy — never produced by the live flow).
 */
const BOARD_POOL_STATUSES = [
  JOB_POOL_MATCH_STATUS.PROCESSING,
  JOB_POOL_MATCH_STATUS.PENDING,
  JOB_POOL_MATCH_STATUS.CONNECTOR_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
  JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
  JOB_POOL_MATCH_STATUS.FAILED,
] as const;

/** Active upload_job statuses to surface (before their pool_match exists) */
const UPLOAD_JOB_INBOX_STATUSES = ["queued", "processing", "failed"];

export interface PoolMatchInboxItem {
  type: "pool_match";
  matchId: string;
  contactId: number;
  status: string;
  source: string;
  failureReason: string | null;
  candidateName: string;
  candidateEmail: string | null;
  candidateTitle: string | null;
  candidateCompany: string | null;
  matchScore: string;
  cosineSimilarity: string | null;
  llmScore: string | null;
  matchedSignals: unknown;
  concerns: unknown;
  gapAnalysis: ClientGapAnalysisPayload | null;
  consentDeclineReason: string | null;
  consentDeclineNotes: string | null;
  connectorDeclineReason: string | null;
  connectorDeclinedAt: Date | null;
  consentRespondedAt: Date | null;
  matchedAt: Date;
  isClaimedByOther: boolean;
  linkedUploadJob: {
    uploadJobId: string;
    fileName: string;
    retryCount: number;
    failureReason: string | null;
  } | null;
  resumeFileName: string | null;
}

export interface UploadJobInboxItem {
  type: "upload_job";
  uploadJobId: string;
  fileName: string;
  status: string;
  failureReason: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type JobBoardInboxItem = PoolMatchInboxItem | UploadJobInboxItem;

@Injectable()
export class JobPoolMatchesActiveQueryService {
  private readonly logger = new Logger(JobPoolMatchesActiveQueryService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  private resolvePayouts(bountyAmount: string | null | undefined) {
    const grossAmount = Number(bountyAmount ?? 0);
    return {
      connectorPayout: this.feeConfig.splitAmount(
        grossAmount,
        this.feeConfig.getConnectorPercent()
      ),
      sharerPayout: this.feeConfig.getSharerPayoutAmount(grossAmount),
    };
  }

  /**
   * Inbox jobs list — job details + a candidate count per job. Candidate detail
   * (the board itself) is loaded lazily per job via `getJobBoardCandidates`.
   */
  async getJobPoolMatches(userId: string, query: GetJobPoolMatchesQueryDto) {
    const { newLimit: limit } = parseClampPagination(
      query.limit,
      undefined,
      10,
      50
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const offset = (page - 1) * limit;

    const matches = schema.recruitmentJobPoolMatches;
    const uploadJobsTable = schema.recruitmentUploadJobs;
    const jobs = schema.recruitmentJobsSchema;
    const pricing = schema.recruitmentJobPricesSchema;
    const { contacts } = schema;

    const searchTerm = query.search?.trim();
    const searchCondition = searchTerm
      ? or(
          ilike(contacts.firstName, `%${searchTerm}%`),
          ilike(contacts.lastName, `%${searchTerm}%`),
          ilike(contacts.email, `%${searchTerm}%`),
          ilike(contacts.title, `%${searchTerm}%`),
          ilike(contacts.company, `%${searchTerm}%`),
          ilike(jobs.title, `%${searchTerm}%`),
          ilike(jobs.companyName, `%${searchTerm}%`),
          ilike(jobs.description, `%${searchTerm}%`),
          ilike(jobs.location, `%${searchTerm}%`),
          sql`${jobs.requiredSkills}::text ilike ${`%${searchTerm}%`}`,
          sql`${jobs.preferredSkills}::text ilike ${`%${searchTerm}%`}`
        )
      : undefined;

    const baseConditions = [
      eq(matches.connectorUserId, userId),
      inArray(matches.status, [...INBOX_STATUSES]),
      isNull(matches.deletedAt),
      eq(jobs.status, "active"),
      isNull(jobs.deletedAt),
      ...(searchCondition ? [searchCondition] : []),
    ];

    // Collect jobIds + per-job match counts from pool_matches (inbox statuses)
    const poolMatchJobRows = await this.db
      .select({
        jobId: matches.jobId,
        latestAt: sql<Date>`max(${matches.createdAt})`.as("latest_at"),
        candidateCount: count().as("candidate_count"),
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(contacts, eq(matches.contactId, contacts.id))
      .where(and(...baseConditions))
      .groupBy(matches.jobId);

    // Collect jobIds + counts from in-flight (unlinked) upload_jobs
    const uploadJobSearchCondition = searchTerm
      ? or(
          ilike(uploadJobsTable.fileName, `%${searchTerm}%`),
          ilike(jobs.title, `%${searchTerm}%`),
          ilike(jobs.companyName, `%${searchTerm}%`),
          ilike(jobs.description, `%${searchTerm}%`),
          ilike(jobs.location, `%${searchTerm}%`)
        )
      : undefined;

    const uploadJobBaseConditions = [
      eq(uploadJobsTable.connectorUserId, userId),
      inArray(uploadJobsTable.status, UPLOAD_JOB_INBOX_STATUSES),
      isNull(uploadJobsTable.deletedAt),
      // Hide upload_jobs once linked to a pool_match — the pool_match becomes
      // the canonical row for the candidate.
      isNull(uploadJobsTable.poolMatchId),
      eq(jobs.status, "active"),
      isNull(jobs.deletedAt),
      ...(uploadJobSearchCondition ? [uploadJobSearchCondition] : []),
    ];

    const uploadJobJobRows = await this.db
      .select({
        jobId: uploadJobsTable.jobId,
        latestAt: sql<Date>`max(${uploadJobsTable.createdAt})`.as("latest_at"),
        candidateCount: count().as("candidate_count"),
      })
      .from(uploadJobsTable)
      .innerJoin(jobs, eq(uploadJobsTable.jobId, jobs.id))
      .where(and(...uploadJobBaseConditions))
      .groupBy(uploadJobsTable.jobId);

    // Share-link applies create job_candidates + connectors, not pool/upload rows.
    // Include those jobs so Refer Candidates inbox is not pool/upload-only.
    const referredJobRows = await queryReferredInboxJobAggregates(this.db, {
      userId,
      jobStatus: "active",
      searchTerm,
    });

    // Merge latest-activity + candidate counts across pool, upload, and referred
    const jobLatestMap = new Map<string, Date>();
    const jobCountMap = new Map<string, number>();
    for (const row of poolMatchJobRows) {
      jobLatestMap.set(row.jobId, new Date(row.latestAt));
      jobCountMap.set(row.jobId, Number(row.candidateCount));
    }
    for (const row of uploadJobJobRows) {
      const existing = jobLatestMap.get(row.jobId);
      const incoming = new Date(row.latestAt);
      if (!existing || incoming > existing) {
        jobLatestMap.set(row.jobId, incoming);
      }
      jobCountMap.set(
        row.jobId,
        (jobCountMap.get(row.jobId) ?? 0) + Number(row.candidateCount)
      );
    }
    mergeReferredJobsIntoInboxMaps({
      jobLatestMap,
      jobCountMap,
      referredRows: referredJobRows,
      poolMatchJobIds: new Set(poolMatchJobRows.map((r) => r.jobId)),
    });

    const orderedJobIds = Array.from(jobLatestMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([jobId]) => jobId);

    const totalJobs = orderedJobIds.length;
    const totalPages = Math.ceil(totalJobs / limit);
    const jobIds = orderedJobIds.slice(offset, offset + limit);

    const pagination = {
      page,
      limit,
      totalJobs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    if (jobIds.length === 0) {
      return { jobs: [], pagination };
    }

    // Fetch job + pricing details for the paginated jobs
    const jobDetailRows = await this.db
      .select({
        jobId: jobs.id,
        jobTitle: jobs.title,
        jobCompany: jobs.companyName,
        jobLocation: jobs.location,
        bountyAmount: pricing.bountyAmount,
        jobDescription: jobs.description,
        jobRequiredSkills: jobs.requiredSkills,
        jobPreferredSkills: jobs.preferredSkills,
        jobSalaryRangeMin: pricing.salaryRangeMin,
        jobSalaryRangeMax: pricing.salaryRangeMax,
        jobSalaryCurrency: pricing.salaryCurrency,
        jobSalaryPeriod: pricing.salaryPeriod,
        jobSalaryRangeNotes: pricing.salaryRangeNotes,
        jobPostedAt: jobs.createdAt,
      })
      .from(jobs)
      .leftJoin(pricing, eq(pricing.jobId, jobs.id))
      .where(inArray(jobs.id, jobIds));

    const jobDetailById = new Map(jobDetailRows.map((r) => [r.jobId, r]));

    const engagementRows =
      jobIds.length > 0
        ? await this.db
            .select({
              jobId: jobs.id,
              myReferCount: buildMyReferCountSql(
                sql`${jobs.id}`,
                sql`${userId}`
              ).mapWith(Number),
              hasSharedLink: buildHasSharedLinkSql(
                sql`${jobs.id}`,
                sql`${userId}`
              ).mapWith(Boolean),
            })
            .from(jobs)
            .where(inArray(jobs.id, jobIds))
        : [];
    const engagementByJobId = new Map(
      engagementRows.map((row) => [
        row.jobId,
        {
          myReferCount: row.myReferCount,
          hasSharedLink: row.hasSharedLink,
        },
      ])
    );

    // Preserve the ordered job list; attach details + candidate count
    const jobsResult = jobIds.map((jid) => {
      const d = jobDetailById.get(jid);
      const engagement = engagementByJobId.get(jid);
      const payouts = this.resolvePayouts(d?.bountyAmount);
      return {
        jobId: jid,
        jobTitle: d?.jobTitle ?? "",
        jobCompany: d?.jobCompany ?? "",
        jobLocation: d?.jobLocation ?? null,
        bountyAmount: d?.bountyAmount ?? "0",
        connectorPayout: payouts.connectorPayout,
        sharerPayout: payouts.sharerPayout,
        jobDescription: d?.jobDescription ?? "",
        jobRequiredSkills: d?.jobRequiredSkills ?? null,
        jobPreferredSkills: d?.jobPreferredSkills ?? null,
        jobSalaryRangeMin: d?.jobSalaryRangeMin ?? "0",
        jobSalaryRangeMax: d?.jobSalaryRangeMax ?? "0",
        jobSalaryCurrency: d?.jobSalaryCurrency ?? null,
        jobSalaryPeriod: d?.jobSalaryPeriod ?? null,
        jobSalaryRangeNotes: d?.jobSalaryRangeNotes ?? null,
        jobPostedAt: d?.jobPostedAt ?? new Date(),
        candidateCount: jobCountMap.get(jid) ?? 0,
        myReferCount: engagement?.myReferCount ?? 0,
        hasSharedLink: engagement?.hasSharedLink ?? false,
      };
    });

    return { jobs: jobsResult, pagination };
  }

  /** Job header for the per-job connector board page. */
  async getJobHeader(
    jobId: string,
    userId?: string
  ): Promise<{
    jobTitle: string;
    jobCompany: string;
    jobLocation: string | null;
    bountyAmount: string;
    jobSalaryRangeMin: string;
    jobSalaryRangeMax: string;
    jobSalaryCurrency: string | null;
    jobSalaryPeriod: string | null;
    myReferCount?: number;
    hasSharedLink?: boolean;
    connectorPayout?: string;
    sharerPayout?: string;
  } | null> {
    const jobs = schema.recruitmentJobsSchema;
    const pricing = schema.recruitmentJobPricesSchema;
    const [row] = await this.db
      .select({
        jobTitle: jobs.title,
        jobCompany: jobs.companyName,
        jobLocation: jobs.location,
        bountyAmount: pricing.bountyAmount,
        jobSalaryRangeMin: pricing.salaryRangeMin,
        jobSalaryRangeMax: pricing.salaryRangeMax,
        jobSalaryCurrency: pricing.salaryCurrency,
        jobSalaryPeriod: pricing.salaryPeriod,
        ...(userId
          ? {
              myReferCount: buildMyReferCountSql(
                sql`${jobs.id}`,
                sql`${userId}`
              ).mapWith(Number),
              hasSharedLink: buildHasSharedLinkSql(
                sql`${jobs.id}`,
                sql`${userId}`
              ).mapWith(Boolean),
            }
          : {}),
      })
      .from(jobs)
      .leftJoin(pricing, eq(pricing.jobId, jobs.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) return null;

    const payouts = this.resolvePayouts(row.bountyAmount);

    return {
      jobTitle: row.jobTitle,
      jobCompany: row.jobCompany,
      jobLocation: row.jobLocation ?? null,
      bountyAmount: row.bountyAmount ?? "0",
      connectorPayout: payouts.connectorPayout,
      sharerPayout: payouts.sharerPayout,
      jobSalaryRangeMin: row.jobSalaryRangeMin ?? "0",
      jobSalaryRangeMax: row.jobSalaryRangeMax ?? "0",
      jobSalaryCurrency: row.jobSalaryCurrency ?? null,
      jobSalaryPeriod: row.jobSalaryPeriod ?? null,
      myReferCount: userId ? Number(row.myReferCount ?? 0) : undefined,
      hasSharedLink: userId ? Boolean(row.hasSharedLink) : undefined,
    };
  }

  /**
   * Per-job board — the pre-referral candidates for a single job as rich inbox
   * items: in-flight upload_jobs (queued/processing/failed, not yet linked to a
   * pool_match) plus pool_matches in board statuses (with gap analysis and the
   * linked upload_job for failed rows). The connector-pipeline service pairs
   * these with the referred `recruitment_job_candidates` to build the board.
   */
  async getJobBoardCandidates(
    userId: string,
    jobId: string,
    search?: string
  ): Promise<JobBoardInboxItem[]> {
    const matches = schema.recruitmentJobPoolMatches;
    const uploadJobsTable = schema.recruitmentUploadJobs;
    const { contacts } = schema;
    const searchTerm = search?.trim();

    const uploadSearchCondition = searchTerm
      ? ilike(uploadJobsTable.fileName, `%${searchTerm}%`)
      : undefined;

    const contactSearchCondition = searchTerm
      ? or(
          ilike(contacts.firstName, `%${searchTerm}%`),
          ilike(contacts.lastName, `%${searchTerm}%`),
          ilike(contacts.email, `%${searchTerm}%`),
          ilike(contacts.title, `%${searchTerm}%`),
          ilike(contacts.company, `%${searchTerm}%`)
        )
      : undefined;

    const uploadJobRows = await this.db
      .select({
        id: uploadJobsTable.id,
        fileName: uploadJobsTable.fileName,
        status: uploadJobsTable.status,
        failureReason: uploadJobsTable.failureReason,
        retryCount: uploadJobsTable.retryCount,
        createdAt: uploadJobsTable.createdAt,
        updatedAt: uploadJobsTable.updatedAt,
      })
      .from(uploadJobsTable)
      .where(
        and(
          eq(uploadJobsTable.connectorUserId, userId),
          eq(uploadJobsTable.jobId, jobId),
          inArray(uploadJobsTable.status, UPLOAD_JOB_INBOX_STATUSES),
          isNull(uploadJobsTable.deletedAt),
          isNull(uploadJobsTable.poolMatchId),
          ...(uploadSearchCondition ? [uploadSearchCondition] : [])
        )
      )
      .orderBy(desc(uploadJobsTable.createdAt));

    const matchRows = await this.db
      .select({
        matchId: matches.id,
        contactId: matches.contactId,
        status: matches.status,
        matchScore: matches.matchScore,
        cosineSimilarity: matches.cosineSimilarity,
        llmScore: matches.llmScore,
        matchedSignals: matches.matchedSignals,
        concerns: matches.concerns,
        gapAnalysis: matches.gapAnalysis,
        consentDeclineReason: matches.consentDeclineReason,
        consentDeclineNotes: matches.consentDeclineNotes,
        connectorDeclineReason: matches.connectorDeclineReason,
        connectorDeclinedAt: matches.connectorDeclinedAt,
        consentRespondedAt: matches.consentRespondedAt,
        source: matches.source,
        failureReason: matches.failureReason,
        matchedAt: matches.createdAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactTitle: contacts.title,
        contactCompany: contacts.company,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeMetadata: schema.contactResumes.metadata,
        resumeFileName: schema.mediaSchema.fileName,
        isClaimedByOther: sql<boolean>`(
          EXISTS (
            SELECT 1
            FROM prospectly.recruitment_job_pool_matches AS other
            INNER JOIN prospectly.contact_sensitive_data AS ocsd
              ON ocsd.contact_id = other.contact_id
            INNER JOIN prospectly.contact_sensitive_data AS mcsd
              ON mcsd.contact_id = ${matches.contactId}
            WHERE other.job_id = ${matches.jobId}
              AND ocsd.normalized_email_hash IS NOT NULL
              AND ocsd.normalized_email_hash = mcsd.normalized_email_hash
              AND other.connector_user_id != ${matches.connectorUserId}
              AND other.status IN (${sql.join(
                [...CLAIMED_STATUSES].map((s) => sql`${s}`),
                sql`, `
              )})
              AND other.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM prospectly.recruitment_job_candidates AS jc
            INNER JOIN prospectly.contact_sensitive_data AS mcsd
              ON mcsd.contact_id = ${matches.contactId}
            LEFT JOIN prospectly.contact_sensitive_data AS jcsd
              ON jcsd.contact_id = jc.contact_id
            WHERE jc.job_id = ${matches.jobId}
              AND jc.deleted_at IS NULL
              AND mcsd.normalized_email_hash IS NOT NULL
              AND (
                jc.contact_id = ${matches.contactId}
                OR jcsd.normalized_email_hash = mcsd.normalized_email_hash
              )
          )
        )`.as("is_claimed_by_other"),
      })
      .from(matches)
      .innerJoin(contacts, eq(matches.contactId, contacts.id))
      .leftJoin(
        schema.contactResumes,
        eq(schema.contactResumes.mediaId, matches.resumeMediaId)
      )
      .leftJoin(
        schema.mediaSchema,
        eq(matches.resumeMediaId, schema.mediaSchema.id)
      )
      .where(
        and(
          eq(matches.connectorUserId, userId),
          eq(matches.jobId, jobId),
          inArray(matches.status, [...BOARD_POOL_STATUSES]),
          isNull(matches.deletedAt),
          sql`NOT (
            ${matches.status} = ${JOB_POOL_MATCH_STATUS.PROCESSING}
            AND EXISTS (
              SELECT 1
              FROM prospectly.recruitment_job_candidates AS jc
              WHERE jc.job_id = ${matches.jobId}
                AND jc.contact_id = ${matches.contactId}
                AND jc.deleted_at IS NULL
            )
          )`,
          ...(contactSearchCondition ? [contactSearchCondition] : [])
        )
      )
      .orderBy(desc(matches.createdAt));

    // For failed pool_matches, attach the linked upload_job so the UI keeps its
    // Retry/Dismiss controls (those affordances live on the upload_job row).
    const failedMatchIds = matchRows
      .filter((r) => r.status === JOB_POOL_MATCH_STATUS.FAILED)
      .map((r) => r.matchId);

    const linkedUploadJobsByMatchId = new Map<
      string,
      {
        uploadJobId: string;
        fileName: string;
        retryCount: number;
        failureReason: string | null;
      }
    >();

    if (failedMatchIds.length > 0) {
      const linkedUploadRows = await this.db
        .select({
          id: uploadJobsTable.id,
          poolMatchId: uploadJobsTable.poolMatchId,
          fileName: uploadJobsTable.fileName,
          retryCount: uploadJobsTable.retryCount,
          failureReason: uploadJobsTable.failureReason,
          createdAt: uploadJobsTable.createdAt,
        })
        .from(uploadJobsTable)
        .where(
          and(
            inArray(uploadJobsTable.poolMatchId, failedMatchIds),
            isNull(uploadJobsTable.deletedAt)
          )
        )
        .orderBy(desc(uploadJobsTable.createdAt));

      for (const row of linkedUploadRows) {
        if (!row.poolMatchId) continue;
        if (linkedUploadJobsByMatchId.has(row.poolMatchId)) continue;
        linkedUploadJobsByMatchId.set(row.poolMatchId, {
          uploadJobId: row.id,
          fileName: row.fileName,
          retryCount: row.retryCount,
          failureReason: row.failureReason,
        });
      }
    }

    const items: JobBoardInboxItem[] = [];

    for (const row of uploadJobRows) {
      items.push({
        type: "upload_job",
        uploadJobId: row.id,
        fileName: row.fileName,
        status: row.status,
        failureReason: row.failureReason,
        retryCount: row.retryCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    for (const row of matchRows) {
      const candidateName = [row.contactFirstName, row.contactLastName]
        .filter(Boolean)
        .join(" ");

      const assembledGap =
        row.source === "connector_uploaded"
          ? assembleGapAnalysisPayload(
              parseGapAnalysisStored(row.gapAnalysis),
              row.matchScore ? parseFloat(row.matchScore) : null,
              resolveGapAnalysisAssemblyContext({
                candidateName: candidateName || "Unknown",
                resumeMetadata: row.resumeMetadata,
                resumeTotalYearsExp: row.resumeTotalYearsExp,
                contactCompany: row.contactCompany,
                processedAt: row.matchedAt?.toISOString(),
              })
            )
          : null;

      items.push({
        type: "pool_match",
        matchId: row.matchId,
        contactId: row.contactId,
        status: row.status,
        source: row.source,
        failureReason: row.failureReason,
        candidateName: candidateName || "Unknown",
        candidateEmail: row.contactEmail,
        candidateTitle: row.contactTitle,
        candidateCompany: row.contactCompany,
        matchScore: row.matchScore,
        cosineSimilarity: row.cosineSimilarity,
        llmScore: row.llmScore,
        matchedSignals: row.matchedSignals,
        concerns: row.concerns,
        gapAnalysis: assembledGap,
        consentDeclineReason: row.consentDeclineReason,
        consentDeclineNotes: row.consentDeclineNotes,
        connectorDeclineReason: row.connectorDeclineReason,
        connectorDeclinedAt: row.connectorDeclinedAt,
        consentRespondedAt: row.consentRespondedAt,
        matchedAt: row.matchedAt,
        isClaimedByOther: row.isClaimedByOther,
        linkedUploadJob:
          row.status === JOB_POOL_MATCH_STATUS.FAILED
            ? (linkedUploadJobsByMatchId.get(row.matchId) ?? null)
            : null,
        resumeFileName: row.resumeFileName ?? null,
      });
    }

    return items;
  }
}
