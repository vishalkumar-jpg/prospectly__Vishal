import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, ilike, desc, inArray, sql } from "drizzle-orm";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PROCESSING_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { REINSTATE_STAGE_KEYS } from "modules/recruitment/candidate-workflow/candidate-workflow-reinstate.constants";
import {
  REVEALED_STAGES,
  REVIEW_REACHED_STAGES,
  canViewCandidateDetails,
  currentCompanyFromResumeMetadata,
  yearsExpFromDbColumn,
} from "./candidates-query.helpers";
import { CANDIDATES_MESSAGES } from "../candidates.constants";
import { GetJobCandidatesQueryDto } from "../candidates.dto";

function skillsFromResumeJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out;
}

@Injectable()
export class CandidatesListService {
  private readonly logger = new Logger(CandidatesListService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly moduleAccessService: ModuleAccessService
  ) {}

  async getCandidatesByJobId(
    requesterId: string,
    jobId: string,
    filters: GetJobCandidatesQueryDto
  ) {
    // Verify the requesting user is the job requester
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(CANDIDATES_MESSAGES.ERROR.JOB_NOT_FOUND);
    }

    // Build query
    const conditions = [
      eq(schema.recruitmentJobCandidates.jobId, jobId),
      isNull(schema.recruitmentJobCandidates.deletedAt),
    ];

    // Stage filter
    if (filters.stage) {
      const [stageRow] = await this.db
        .select({ id: schema.recruitmentStagesSchema.id })
        .from(schema.recruitmentStagesSchema)
        .where(eq(schema.recruitmentStagesSchema.stageKey, filters.stage))
        .limit(1);

      if (stageRow) {
        conditions.push(
          eq(schema.recruitmentJobCandidates.stageId, stageRow.id)
        );
      }
    }

    // Search filter (by anonymous label)
    if (filters.search) {
      conditions.push(
        ilike(
          schema.recruitmentJobCandidates.anonymousLabel,
          `%${filters.search}%`
        )
      );
    }

    const rows = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
        stageId: schema.recruitmentJobCandidates.stageId,
        stageUpdatedAt: schema.recruitmentJobCandidates.stageUpdatedAt,
        createdAt: schema.recruitmentJobCandidates.createdAt,
        linkedinUrl: schema.recruitmentJobCandidates.linkedinUrl,
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
        sharerCode: schema.recruitmentJobCandidates.sharerCode,
        matchScore: schema.recruitmentJobCandidates.matchScore,
        notQualifiedReason: schema.recruitmentJobCandidates.notQualifiedReason,
        // Stage info
        stageKey: schema.recruitmentStagesSchema.stageKey,
        stageLabel: schema.recruitmentStagesSchema.label,
        stageOrder: schema.recruitmentStagesSchema.stageOrder,
        // User info (for reveal logic)
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userEmail: schema.users.email,
        userLinkedinUrl: schema.users.linkedinUrl,
        userCompany: schema.users.company,
        userJobTitle: schema.users.jobTitle,
      })
      .from(schema.recruitmentJobCandidates)
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .leftJoin(
        schema.users,
        eq(schema.recruitmentJobCandidates.candidateUserId, schema.users.id)
      )
      .where(and(...conditions))
      // Surface strongest applicants first in every stage column: highest AI
      // match score first, unscored candidates last, newest-applied breaking ties.
      .orderBy(
        sql`${schema.recruitmentJobCandidates.matchScore} DESC NULLS LAST`,
        desc(schema.recruitmentJobCandidates.createdAt)
      );

    const candidateIds = rows.map((r) => r.id);
    const resumeByCandidate = new Map<
      string,
      {
        jobTitle: string | null;
        skills: unknown;
        totalYearsExp: string | null;
        metadata: unknown;
      }
    >();

    if (candidateIds.length > 0) {
      const resumeRows = await this.db
        .select({
          candidateId: schema.contactResumes.candidateId,
          jobTitle: schema.contactResumes.jobTitle,
          skills: schema.contactResumes.skills,
          totalYearsExp: schema.contactResumes.totalYearsExp,
          metadata: schema.contactResumes.metadata,
          updatedAt: schema.contactResumes.updatedAt,
        })
        .from(schema.contactResumes)
        .where(
          and(
            inArray(schema.contactResumes.candidateId, candidateIds),
            isNull(schema.contactResumes.deletedAt)
          )
        )
        .orderBy(desc(schema.contactResumes.updatedAt));

      for (const rr of resumeRows) {
        if (rr.candidateId && !resumeByCandidate.has(rr.candidateId)) {
          resumeByCandidate.set(rr.candidateId, {
            jobTitle: rr.jobTitle,
            skills: rr.skills,
            totalYearsExp: rr.totalYearsExp,
            metadata: rr.metadata,
          });
        }
      }
    }

    // Aggregate payout-row state per candidate so the kanban card can decide
    // whether to show "Release Payout" / "Edit Classification" CTAs and the
    // "Awaiting candidate Stripe Connect setup" badge — without each card
    // calling /payout/:id/state on its own.
    const payoutFlagsByCandidate = new Map<
      string,
      {
        hasPendingConnectorPayouts: boolean;
        hasPendingCandidatePayout: boolean;
        candidatePayoutOnboardingPending: boolean;
        hasConnectorPayout: boolean;
        hasCandidatePayout: boolean;
        hasFailedConnectorPayout: boolean;
        hasFailedCandidatePayout: boolean;
        hasManualReviewConnectorPayout: boolean;
        hasManualReviewCandidatePayout: boolean;
      }
    >();

    if (candidateIds.length > 0) {
      const flagRows = await this.db
        .select({
          candidateId: schema.recruitmentPayoutHistory.candidateId,
          // "Pending" here means the recruiter still has an action to take —
          // mirrors the release service's actionable filter: lifecycle
          // status='pending' AND the row hasn't been handed off to the worker
          // yet (processingStatus null or 'pending'). Once released (queued /
          // processing / onboarding_pending / completed / cancelled) it is NOT
          // actionable, so the card shows a "Details" view instead of "Release".
          hasPendingConnectorPayouts: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CONNECTOR} AND ${schema.recruitmentPayoutHistory.status} = ${RECRUITMENT_PAYOUT_STATUS.PENDING} AND (${schema.recruitmentPayoutHistory.processingStatus} IS NULL OR ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.PENDING}))`,
          hasPendingCandidatePayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CANDIDATE} AND ${schema.recruitmentPayoutHistory.status} = ${RECRUITMENT_PAYOUT_STATUS.PENDING} AND (${schema.recruitmentPayoutHistory.processingStatus} IS NULL OR ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.PENDING}))`,
          candidatePayoutOnboardingPending: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CANDIDATE} AND ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING})`,
          // "Any row exists" (regardless of status) — keeps the Hired-stage
          // buttons visible after release so they become "view details".
          hasConnectorPayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CONNECTOR})`,
          hasCandidatePayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CANDIDATE})`,
          // Recoverable transfer failure (processingStatus='failed') — the card
          // shows a red "Payout Failed" badge + a "Retry Payout" affordance.
          hasFailedConnectorPayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CONNECTOR} AND ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.FAILED})`,
          hasFailedCandidatePayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CANDIDATE} AND ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.FAILED})`,
          // Non-recoverable failure (processingStatus='manual_review') — the card
          // shows a "Needs manual review" badge and NO retry affordance.
          hasManualReviewConnectorPayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CONNECTOR} AND ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW})`,
          hasManualReviewCandidatePayout: sql<boolean>`bool_or(${schema.recruitmentPayoutHistory.payoutType} = ${RECRUITMENT_PAYOUT_TYPE.CANDIDATE} AND ${schema.recruitmentPayoutHistory.processingStatus} = ${RECRUITMENT_PROCESSING_STATUS.MANUAL_REVIEW})`,
        })
        .from(schema.recruitmentPayoutHistory)
        .where(
          and(
            inArray(schema.recruitmentPayoutHistory.candidateId, candidateIds),
            isNull(schema.recruitmentPayoutHistory.deletedAt)
          )
        )
        .groupBy(schema.recruitmentPayoutHistory.candidateId);

      for (const fr of flagRows) {
        payoutFlagsByCandidate.set(fr.candidateId, {
          hasPendingConnectorPayouts: fr.hasPendingConnectorPayouts === true,
          hasPendingCandidatePayout: fr.hasPendingCandidatePayout === true,
          candidatePayoutOnboardingPending:
            fr.candidatePayoutOnboardingPending === true,
          hasConnectorPayout: fr.hasConnectorPayout === true,
          hasCandidatePayout: fr.hasCandidatePayout === true,
          hasFailedConnectorPayout: fr.hasFailedConnectorPayout === true,
          hasFailedCandidatePayout: fr.hasFailedCandidatePayout === true,
          hasManualReviewConnectorPayout:
            fr.hasManualReviewConnectorPayout === true,
          hasManualReviewCandidatePayout:
            fr.hasManualReviewCandidatePayout === true,
        });
      }
    }

    // When the viewer's organisation has early candidate-details access, identity
    // is revealed from `in_review` onward (same gate as the detail view); a
    // single per-request check applies to every row below.
    const earlyCandidateDetailsAccess =
      await this.moduleAccessService.isEarlyCandidateDetailsAccessEnabledForUser(
        requesterId
      );

    // Rejection overwrites the candidate's stage to `rejected`, so the
    // pre-rejection tier is only recoverable from stage history. Batch-resolve,
    // per rejected candidate on this page, which tier they reached before
    // rejection: the interview path (`revealedRejectedIds` — already revealed,
    // shown regardless of the flag) vs the `in_review` tier (`reviewedRejectedIds`
    // — shown only under early access). Rejected straight from `processing`
    // appears in neither. One extra query, only when rejected rows exist.
    const revealedRejectedIds = new Set<string>();
    const reviewedRejectedIds = new Set<string>();
    // Rejected cards only show Move Back when history includes a recruiter
    // happy-path stage (in_review…interview_completed). Screening-only rejects
    // (e.g. not_qualified) get no reinstate CTA — avoids an empty dialog.
    const reinstateEligibleIds = new Set<string>();
    const rejectedIds = rows
      .filter((r) => r.stageKey === "rejected")
      .map((r) => r.id);

    if (rejectedIds.length > 0) {
      const historyRows = await this.db
        .selectDistinct({
          candidateId: schema.recruitmentCandidateStageHistory.candidateId,
          stageKey: schema.recruitmentStagesSchema.stageKey,
        })
        .from(schema.recruitmentCandidateStageHistory)
        .innerJoin(
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
              rejectedIds
            ),
            isNull(schema.recruitmentCandidateStageHistory.deletedAt),
            inArray(schema.recruitmentStagesSchema.stageKey, [
              ...REVIEW_REACHED_STAGES,
            ])
          )
        );

      for (const h of historyRows) {
        if (!h.candidateId || !h.stageKey) continue;
        if (REVEALED_STAGES.has(h.stageKey)) {
          revealedRejectedIds.add(h.candidateId);
        } else {
          reviewedRejectedIds.add(h.candidateId);
        }
        if (REINSTATE_STAGE_KEYS.includes(h.stageKey)) {
          reinstateEligibleIds.add(h.candidateId);
        }
      }
    }

    const candidates = rows.map((row) => {
      const isRevealed =
        row.stageKey !== null && REVEALED_STAGES.has(row.stageKey);
      const canViewDetails = canViewCandidateDetails(
        row.stageKey,
        isRevealed,
        earlyCandidateDetailsAccess,
        reviewedRejectedIds.has(row.id),
        revealedRejectedIds.has(row.id)
      );

      const resume = resumeByCandidate.get(row.id);
      const resumeSkills = resume ? skillsFromResumeJson(resume.skills) : [];
      const resumeYears =
        resume != null ? yearsExpFromDbColumn(resume.totalYearsExp) : null;
      const resumeCompany = resume
        ? currentCompanyFromResumeMetadata(resume.metadata)
        : null;
      const resumeTitle =
        resume?.jobTitle && resume.jobTitle.trim()
          ? resume.jobTitle.trim()
          : null;

      const flags = payoutFlagsByCandidate.get(row.id) ?? {
        hasPendingConnectorPayouts: false,
        hasPendingCandidatePayout: false,
        candidatePayoutOnboardingPending: false,
        hasConnectorPayout: false,
        hasCandidatePayout: false,
        hasFailedConnectorPayout: false,
        hasFailedCandidatePayout: false,
        hasManualReviewConnectorPayout: false,
        hasManualReviewCandidatePayout: false,
      };

      const base = {
        id: row.id,
        anonymousLabel: row.anonymousLabel,
        stage: row.stageKey || "in_review",
        stageLabel: row.stageLabel || "In Review",
        stageOrder: row.stageOrder ?? 0,
        stageUpdatedAt: row.stageUpdatedAt,
        createdAt: row.createdAt,
        sharerCode: row.sharerCode,
        matchScore: row.matchScore != null ? parseFloat(row.matchScore) : null,
        notQualifiedReason: row.notQualifiedReason ?? null,
        currentTitle: resumeTitle || row.userJobTitle || null,
        currentCompany: resumeCompany || row.userCompany || null,
        totalYearsExp: resumeYears,
        skills: resumeSkills.slice(0, 20),
        hasPendingConnectorPayouts: flags.hasPendingConnectorPayouts,
        hasPendingCandidatePayout: flags.hasPendingCandidatePayout,
        candidatePayoutOnboardingPending:
          flags.candidatePayoutOnboardingPending,
        hasConnectorPayout: flags.hasConnectorPayout,
        hasCandidatePayout: flags.hasCandidatePayout,
        hasFailedConnectorPayout: flags.hasFailedConnectorPayout,
        hasFailedCandidatePayout: flags.hasFailedCandidatePayout,
        hasManualReviewConnectorPayout: flags.hasManualReviewConnectorPayout,
        hasManualReviewCandidatePayout: flags.hasManualReviewCandidatePayout,
        canReinstate:
          row.stageKey === "rejected" && reinstateEligibleIds.has(row.id),
      };

      if (canViewDetails) {
        return {
          ...base,
          revealedName:
            [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
            null,
          revealedEmail: row.userEmail || null,
          revealedLinkedIn: row.userLinkedinUrl || null,
        };
      }

      return {
        ...base,
        revealedName: null,
        revealedEmail: null,
        revealedLinkedIn: null,
      };
    });

    return { candidates };
  }
}
