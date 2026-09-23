import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, sql, desc, inArray, or, ilike } from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import { queryReferredInboxJobAggregates } from "./job-pool-matches-referred-inbox.helper";
import {
  JobPoolMatchesClosedReferredService,
  type ClosedReferredCandidateCard,
} from "./job-pool-matches-closed-referred.service";
import { GetJobPoolMatchesQueryDto } from "../job-pool-matches.dto";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import {
  buildHasSharedLinkSql,
  buildMyReferCountSql,
} from "../../connector-job-engagement.helpers";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "../../candidate-evaluation/gap-analysis.mapper";

@Injectable()
export class JobPoolMatchesClosedQueryService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly closedReferredService: JobPoolMatchesClosedReferredService,
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

  async getClosedJobPoolMatches(
    userId: string,
    query: GetJobPoolMatchesQueryDto
  ) {
    const { newLimit: limit } = parseClampPagination(
      query.limit,
      undefined,
      10,
      50
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const offset = (page - 1) * limit;

    const matches = schema.recruitmentJobPoolMatches;
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
      isNull(matches.deletedAt),
      eq(jobs.status, "closed"),
      isNull(jobs.deletedAt),
      ...(searchCondition ? [searchCondition] : []),
    ];

    const poolJobIdRows = await this.db
      .select({
        jobId: matches.jobId,
        closedAt: jobs.closedAt,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(contacts, eq(matches.contactId, contacts.id))
      .where(and(...baseConditions))
      .groupBy(matches.jobId, jobs.closedAt);

    const referredJobRows = await queryReferredInboxJobAggregates(this.db, {
      userId,
      jobStatus: "closed",
      searchTerm,
    });

    const closedAtByJobId = new Map<string, Date | null>();
    for (const row of poolJobIdRows) {
      closedAtByJobId.set(row.jobId, row.closedAt);
    }

    const referredOnlyJobIds = referredJobRows
      .filter((r) => r.directApplyCount > 0 && !closedAtByJobId.has(r.jobId))
      .map((r) => r.jobId);

    if (referredOnlyJobIds.length > 0) {
      const referredJobMeta = await this.db
        .select({
          jobId: jobs.id,
          closedAt: jobs.closedAt,
        })
        .from(jobs)
        .where(
          and(
            inArray(jobs.id, referredOnlyJobIds),
            eq(jobs.status, "closed"),
            isNull(jobs.deletedAt)
          )
        );
      for (const row of referredJobMeta) {
        closedAtByJobId.set(row.jobId, row.closedAt);
      }
    }

    const orderedJobIds = Array.from(closedAtByJobId.entries())
      .sort(
        (a, b) =>
          (b[1]?.getTime() ?? 0) - (a[1]?.getTime() ?? 0) ||
          a[0].localeCompare(b[0])
      )
      .map(([jobId]) => jobId);

    const totalJobs = orderedJobIds.length;
    const totalPages = Math.ceil(totalJobs / limit);

    if (totalJobs === 0) {
      return {
        jobs: [],
        pagination: {
          page,
          limit,
          totalJobs: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const jobIds = orderedJobIds.slice(offset, offset + limit);

    if (jobIds.length === 0) {
      return {
        jobs: [],
        pagination: {
          page,
          limit,
          totalJobs,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }

    const matchRows = await this.db
      .select({
        matchId: matches.id,
        jobId: matches.jobId,
        contactId: matches.contactId,
        status: matches.status,
        matchScore: matches.matchScore,
        cosineSimilarity: matches.cosineSimilarity,
        llmScore: matches.llmScore,
        matchedSignals: matches.matchedSignals,
        concerns: matches.concerns,
        gapAnalysis: matches.gapAnalysis,
        source: matches.source,
        consentDeclineReason: matches.consentDeclineReason,
        consentDeclineNotes: matches.consentDeclineNotes,
        connectorDeclineReason: matches.connectorDeclineReason,
        connectorDeclinedAt: matches.connectorDeclinedAt,
        consentRespondedAt: matches.consentRespondedAt,
        matchedAt: matches.createdAt,
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
        jobClosedAt: jobs.closedAt,
        jobClosedReason: jobs.closedReason,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactTitle: contacts.title,
        contactCompany: contacts.company,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeMetadata: schema.contactResumes.metadata,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(contacts, eq(matches.contactId, contacts.id))
      .leftJoin(
        schema.contactResumes,
        eq(schema.contactResumes.mediaId, matches.resumeMediaId)
      )
      .leftJoin(pricing, eq(matches.jobId, pricing.jobId))
      .where(
        and(
          eq(matches.connectorUserId, userId),
          isNull(matches.deletedAt),
          eq(jobs.status, "closed"),
          isNull(jobs.deletedAt),
          inArray(matches.jobId, jobIds)
        )
      )
      .orderBy(desc(sql`${matches.matchScore}::numeric`));

    const referredCandidates =
      await this.closedReferredService.fetchClosedReferredCandidates(
        userId,
        jobIds
      );

    const jobsMissingDetails = jobIds.filter(
      (jid) => !matchRows.some((r) => r.jobId === jid)
    );
    const referredOnlyJobDetails =
      jobsMissingDetails.length > 0
        ? await this.db
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
              jobClosedAt: jobs.closedAt,
              jobClosedReason: jobs.closedReason,
            })
            .from(jobs)
            .leftJoin(pricing, eq(pricing.jobId, jobs.id))
            .where(inArray(jobs.id, jobsMissingDetails))
        : [];

    type ClosedCandidate = ClosedReferredCandidateCard;

    const jobMap = new Map<
      string,
      {
        jobId: string;
        jobTitle: string;
        jobCompany: string;
        jobLocation: string | null;
        bountyAmount: string;
        jobDescription: string;
        jobRequiredSkills: unknown;
        jobPreferredSkills: unknown;
        jobSalaryRangeMin: string;
        jobSalaryRangeMax: string;
        jobSalaryCurrency: string | null;
        jobSalaryPeriod: string | null;
        jobSalaryRangeNotes: string | null;
        jobPostedAt: Date;
        closedAt: Date | null;
        closedReason: string | null;
        candidates: ClosedCandidate[];
      }
    >();

    for (const jid of jobIds) {
      jobMap.set(jid, {
        jobId: jid,
        jobTitle: "",
        jobCompany: "",
        jobLocation: null,
        bountyAmount: "0",
        jobDescription: "",
        jobRequiredSkills: null,
        jobPreferredSkills: null,
        jobSalaryRangeMin: "0",
        jobSalaryRangeMax: "0",
        jobSalaryCurrency: null,
        jobSalaryPeriod: null,
        jobSalaryRangeNotes: null,
        jobPostedAt: new Date(),
        closedAt: null,
        closedReason: null,
        candidates: [],
      });
    }

    for (const row of matchRows) {
      const entry = jobMap.get(row.jobId);
      if (!entry) continue;

      entry.jobTitle = row.jobTitle;
      entry.jobCompany = row.jobCompany;
      entry.jobLocation = row.jobLocation;
      entry.bountyAmount = row.bountyAmount;
      entry.jobDescription = row.jobDescription;
      entry.jobRequiredSkills = row.jobRequiredSkills;
      entry.jobPreferredSkills = row.jobPreferredSkills;
      entry.jobSalaryRangeMin = row.jobSalaryRangeMin;
      entry.jobSalaryRangeMax = row.jobSalaryRangeMax;
      entry.jobSalaryCurrency = row.jobSalaryCurrency;
      entry.jobSalaryPeriod = row.jobSalaryPeriod;
      entry.jobSalaryRangeNotes = row.jobSalaryRangeNotes ?? null;
      entry.jobPostedAt = row.jobPostedAt;
      entry.closedAt = row.jobClosedAt;
      entry.closedReason = row.jobClosedReason;

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

      entry.candidates.push({
        matchId: row.matchId,
        contactId: row.contactId,
        status: row.status,
        source: row.source,
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
      });
    }

    for (const row of referredOnlyJobDetails) {
      const entry = jobMap.get(row.jobId);
      if (!entry) continue;
      entry.jobTitle = row.jobTitle;
      entry.jobCompany = row.jobCompany;
      entry.jobLocation = row.jobLocation;
      entry.bountyAmount = row.bountyAmount ?? "0";
      entry.jobDescription = row.jobDescription;
      entry.jobRequiredSkills = row.jobRequiredSkills;
      entry.jobPreferredSkills = row.jobPreferredSkills;
      entry.jobSalaryRangeMin = row.jobSalaryRangeMin ?? "0";
      entry.jobSalaryRangeMax = row.jobSalaryRangeMax ?? "0";
      entry.jobSalaryCurrency = row.jobSalaryCurrency;
      entry.jobSalaryPeriod = row.jobSalaryPeriod;
      entry.jobSalaryRangeNotes = row.jobSalaryRangeNotes ?? null;
      entry.jobPostedAt = row.jobPostedAt;
      entry.closedAt = row.jobClosedAt;
      entry.closedReason = row.jobClosedReason;
    }

    for (const referred of referredCandidates) {
      const entry = jobMap.get(referred.jobId);
      if (!entry) continue;
      const alreadyListed =
        referred.contactId != null &&
        entry.candidates.some((c) => c.contactId === referred.contactId);
      if (alreadyListed) continue;
      entry.candidates.push(referred.candidate);
    }

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

    return {
      jobs: Array.from(jobMap.values()).map((job) => {
        const engagement = engagementByJobId.get(job.jobId);
        return {
          ...job,
          ...this.resolvePayouts(job.bountyAmount),
          myReferCount: engagement?.myReferCount ?? 0,
          hasSharedLink: engagement?.hasSharedLink ?? false,
        };
      }),
      pagination: {
        page,
        limit,
        totalJobs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
