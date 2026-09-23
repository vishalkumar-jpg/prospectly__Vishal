import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray, asc, desc } from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import { RECRUITMENT_PAYOUT_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import { GetMyApplicationsQueryDto } from "./my-applications.dto";
import { normalizeSalaryCurrency } from "../recruitment-salary-currency";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "../candidate-evaluation/gap-analysis.mapper";

@Injectable()
export class MyApplicationsService {
  private readonly logger = new Logger(MyApplicationsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getMyApplications(userId: string, query: GetMyApplicationsQueryDto) {
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const { newLimit: limit } = parseClampPagination(
      query.limit,
      undefined,
      50,
      50
    );
    const offset = (page - 1) * limit;

    const [applicantUser] = await this.db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        jobTitle: schema.users.jobTitle,
        company: schema.users.company,
        location: schema.users.location,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const applicantName =
      [applicantUser?.firstName, applicantUser?.lastName]
        .filter(Boolean)
        .join(" ") || "You";

    // Count total
    const countRows = await this.db
      .select({ id: schema.recruitmentJobCandidates.id })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.candidateUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      );
    const total = countRows.length;

    // Main query: candidates joined with jobs, pricing, and stages
    const pricing = schema.recruitmentJobPricesSchema;
    const payout = schema.recruitmentPayoutHistory;

    const rows = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        jobTitle: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        description: schema.recruitmentJobsSchema.description,
        location: schema.recruitmentJobsSchema.location,
        workType: schema.recruitmentJobsSchema.workType,
        employmentType: schema.recruitmentJobsSchema.employmentType,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        salaryRangeMin: pricing.salaryRangeMin,
        salaryRangeMax: pricing.salaryRangeMax,
        salaryCurrency: pricing.salaryCurrency,
        salaryPeriod: pricing.salaryPeriod,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        appliedAt: schema.recruitmentJobCandidates.createdAt,
        stageUpdatedAt: schema.recruitmentJobCandidates.stageUpdatedAt,
        // Skill matching fields
        matchScore: schema.recruitmentJobCandidates.matchScore,
        matchedSkills: schema.recruitmentJobCandidates.matchedSkills,
        missingSkills: schema.recruitmentJobCandidates.missingSkills,
        analysisAt: schema.recruitmentJobCandidates.analysisAt,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
        gapAnalysis: schema.recruitmentJobCandidates.gapAnalysis,
        evaluationRetryCount:
          schema.recruitmentJobCandidates.evaluationRetryCount,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeMetadata: schema.contactResumes.metadata,
        // Candidate bonus (this user's own success-fee payout for the application)
        bonusId: payout.id,
        bonusAmount: payout.recipientAmount,
        bonusCurrency: payout.currency,
        bonusStatus: payout.status,
        bonusProcessingStatus: payout.processingStatus,
      })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .leftJoin(
        pricing,
        eq(schema.recruitmentJobCandidates.jobId, pricing.jobId)
      )
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .leftJoin(
        schema.contactResumes,
        eq(
          schema.contactResumes.candidateId,
          schema.recruitmentJobCandidates.id
        )
      )
      // Candidate bonus is 1:1 with the application via the unique
      // (candidateId, jobId, recipientId) index, so this join cannot duplicate rows.
      .leftJoin(
        payout,
        and(
          eq(payout.candidateId, schema.recruitmentJobCandidates.id),
          eq(payout.recipientId, userId),
          eq(payout.payoutType, RECRUITMENT_PAYOUT_TYPE.CANDIDATE),
          isNull(payout.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.candidateUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentJobCandidates.createdAt))
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) {
      return {
        applications: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };
    }

    // Batch-fetch timeline history
    const candidateIds = rows.map((r) => r.id);
    const historyRows = await this.db
      .select({
        candidateId: schema.recruitmentCandidateStageHistory.candidateId,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        date: schema.recruitmentCandidateStageHistory.createdAt,
        note: schema.recruitmentCandidateStageHistory.note,
      })
      .from(schema.recruitmentCandidateStageHistory)
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentCandidateStageHistory.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .where(
        and(
          inArray(
            schema.recruitmentCandidateStageHistory.candidateId,
            candidateIds
          ),
          isNull(schema.recruitmentCandidateStageHistory.deletedAt)
        )
      )
      .orderBy(asc(schema.recruitmentCandidateStageHistory.createdAt));

    // Group history by candidateId
    const historyMap = new Map<
      string,
      Array<{ status: string; date: string; note: string }>
    >();
    for (const row of historyRows) {
      const list = historyMap.get(row.candidateId) ?? [];
      list.push({
        status: row.stageKey ?? "unknown",
        date: row.date.toISOString(),
        note: row.note ?? "",
      });
      historyMap.set(row.candidateId, list);
    }

    // Batch-fetch latest interview meeting per candidate
    const meetingRows = await this.db
      .select({
        candidateId: schema.recruitmentInterviewMeetings.candidateId,
        meetingDate: schema.recruitmentInterviewMeetings.meetingDate,
        meetingDuration: schema.recruitmentInterviewMeetings.meetingDuration,
        meetingPlatform: schema.recruitmentInterviewMeetings.meetingPlatform,
        meetingLink: schema.recruitmentInterviewMeetings.meetingLink,
      })
      .from(schema.recruitmentInterviewMeetings)
      .where(
        and(
          inArray(
            schema.recruitmentInterviewMeetings.candidateId,
            candidateIds
          ),
          isNull(schema.recruitmentInterviewMeetings.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentInterviewMeetings.createdAt));

    // Keep only the latest meeting per candidate
    const meetingMap = new Map<
      string,
      {
        meetingDate: string | null;
        meetingDuration: number;
        meetingPlatform: string | null;
        meetingLink: string | null;
      }
    >();
    for (const row of meetingRows) {
      if (!meetingMap.has(row.candidateId)) {
        meetingMap.set(row.candidateId, {
          meetingDate: row.meetingDate ? row.meetingDate.toISOString() : null,
          meetingDuration: row.meetingDuration ?? 30,
          meetingPlatform: row.meetingPlatform,
          meetingLink: row.meetingLink,
        });
      }
    }

    const applications = rows.map((row) => {
      const meeting = meetingMap.get(row.id);
      const salaryCurrency = normalizeSalaryCurrency(row.salaryCurrency);
      return {
        id: row.id,
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        companyName: row.companyName,
        description: row.description,
        location: row.location ?? "",
        workType: row.workType ?? "onsite",
        experienceLevel: row.experienceLevel ?? "",
        employmentType: row.employmentType,
        salaryRange: {
          min: parseFloat(row.salaryRangeMin) || 0,
          max: parseFloat(row.salaryRangeMax) || 0,
          currency: salaryCurrency,
        },
        salaryPeriod: row.salaryPeriod ?? "yearly",
        salaryCurrency,
        status: row.stageKey ?? "in_review",
        appliedAt: row.appliedAt.toISOString(),
        lastUpdatedAt: row.stageUpdatedAt
          ? row.stageUpdatedAt.toISOString()
          : row.appliedAt.toISOString(),
        timeline: historyMap.get(row.id) ?? [],
        interviewMeetingDate: meeting?.meetingDate ?? null,
        interviewMeetingDuration: meeting?.meetingDuration ?? null,
        interviewMeetingPlatform: meeting?.meetingPlatform ?? null,
        interviewMeetingLink: meeting?.meetingLink ?? null,
        // Skill matching information
        matchScore: row.matchScore
          ? parseFloat(row.matchScore).toString()
          : undefined,
        matchedSkills: row.matchedSkills as string[] | undefined,
        missingSkills: row.missingSkills as string[] | undefined,
        analysisStatus: row.analysisStatus ?? undefined,
        analysisAt: row.analysisAt?.toISOString() ?? undefined,
        gapAnalysis: assembleGapAnalysisPayload(
          parseGapAnalysisStored(row.gapAnalysis),
          row.matchScore ? parseFloat(row.matchScore) : null,
          resolveGapAnalysisAssemblyContext({
            candidateName: applicantName,
            resumeMetadata: row.resumeMetadata,
            resumeTotalYearsExp: row.resumeTotalYearsExp,
            userCompany: applicantUser?.company,
            processedAt: row.analysisAt?.toISOString(),
            userLocation: applicantUser?.location ?? undefined,
          })
        ),
        evaluationRetryCount: row.evaluationRetryCount ?? 0,
        // Candidate's own bonus for this application (null when none exists)
        bonus: row.bonusId
          ? {
              id: row.bonusId,
              amount: row.bonusAmount,
              currency: row.bonusCurrency,
              status: row.bonusStatus,
              processingStatus: row.bonusProcessingStatus,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
