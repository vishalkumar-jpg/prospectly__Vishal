import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, asc, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { MediaService } from "modules/media/media.service";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { redactSensitiveText } from "utils/redaction.util";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";
import { getCapturedFlatDepositAmount } from "modules/recruitment/interview-cost/flat-deposit.utils";
import { fetchCandidateAssessmentResponses } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.query";
import {
  REVEALED_STAGES,
  HIDDEN_DETAIL_STAGES,
  EARLY_ACCESS_STAGES,
  yearsExpFromDbColumn,
  canViewCandidateDetails,
} from "./candidates-query.helpers";
import { buildRecruiterPipelineSteps } from "./candidates-pipeline-steps.helper";
import { isConnectorVisibleToRecruiter } from "../../candidate-connectors/candidate-connectors.constants";
import { CANDIDATES_MESSAGES } from "../candidates.constants";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "../../candidate-evaluation/gap-analysis.mapper";

@Injectable()
export class CandidatesDetailService {
  private readonly logger = new Logger(CandidatesDetailService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly mediaService: MediaService,
    private readonly moduleAccessService: ModuleAccessService
  ) {}

  async getCandidateDetail(requesterId: string, candidateId: string) {
    const candidateUser = alias(schema.users, "candidate_user");
    const connectorUser = alias(schema.users, "connector_user");
    const rejectorUser = alias(schema.users, "rejector_user");

    const [row] = await this.db
      .select({
        // Candidate record
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
        stageUpdatedAt: schema.recruitmentJobCandidates.stageUpdatedAt,
        createdAt: schema.recruitmentJobCandidates.createdAt,
        // Stage info
        stageKey: schema.recruitmentStagesSchema.stageKey,
        stageLabel: schema.recruitmentStagesSchema.label,
        stageOrder: schema.recruitmentStagesSchema.stageOrder,
        // Job ownership check
        jobRequesterId: schema.recruitmentJobsSchema.requesterId,
        jobTitle: schema.recruitmentJobsSchema.title,
        jobCompanyName: schema.recruitmentJobsSchema.companyName,
        // Candidate user info
        userFirstName: candidateUser.firstName,
        userLastName: candidateUser.lastName,
        userEmail: candidateUser.email,
        userLinkedinUrl: candidateUser.linkedinUrl,
        userJobTitle: candidateUser.jobTitle,
        userCompany: candidateUser.company,
        userLocation: candidateUser.location,
        // Contact skills
        contactSkills: schema.contacts.skills,
        // Resume
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
        // Connector user info
        connectorFirstName: connectorUser.firstName,
        connectorLastName: connectorUser.lastName,
        connectorProfilePhoto: connectorUser.profilePhotoUrl,
        // Workflow
        interviewScheduledAt:
          schema.recruitmentCandidateWorkflow.interviewScheduledAt,
        interviewMeetingLink:
          schema.recruitmentCandidateWorkflow.interviewMeetingLink,
        interviewNotes: schema.recruitmentCandidateWorkflow.interviewNotes,
        rejectedAt: schema.recruitmentCandidateWorkflow.rejectedAt,
        rejectionCategory:
          schema.recruitmentCandidateWorkflow.rejectionCategory,
        rejectionNote: schema.recruitmentCandidateWorkflow.rejectionNote,
        rejectorFirstName: rejectorUser.firstName,
        rejectorLastName: rejectorUser.lastName,
        rejectorEmail: rejectorUser.email,
        rejectorProfilePhoto: rejectorUser.profilePhotoUrl,
        // Contact resume profile
        resumeJobTitle: schema.contactResumes.jobTitle,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeAiSummary: schema.contactResumes.aiSummary,
        resumeMetadata: schema.contactResumes.metadata,
        // Skill matching fields
        matchScore: schema.recruitmentJobCandidates.matchScore,
        matchedSkills: schema.recruitmentJobCandidates.matchedSkills,
        missingSkills: schema.recruitmentJobCandidates.missingSkills,
        analysisAt: schema.recruitmentJobCandidates.analysisAt,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
        analysisNote: schema.recruitmentJobCandidates.analysisNote,
        gapAnalysis: schema.recruitmentJobCandidates.gapAnalysis,
        // Hire info (success-fee flow)
        hireDate: schema.recruitmentJobCandidates.hireDate,
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
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .leftJoin(
        candidateUser,
        eq(schema.recruitmentJobCandidates.candidateUserId, candidateUser.id)
      )
      .leftJoin(
        schema.contacts,
        eq(schema.recruitmentJobCandidates.contactId, schema.contacts.id)
      )
      .leftJoin(
        schema.mediaSchema,
        eq(schema.recruitmentJobCandidates.resumeMediaId, schema.mediaSchema.id)
      )
      // Primary connector attribution now lives in recruitment_candidate_connectors.
      // We join the mapping table filtering to 'primary' (single payout) or
      // 'claimer' (split payout) — both represent "the person who acted on this
      // candidate" — then join users through that row.
      .leftJoin(
        schema.recruitmentCandidateConnectors,
        and(
          eq(
            schema.recruitmentCandidateConnectors.candidateId,
            schema.recruitmentJobCandidates.id
          ),
          inArray(schema.recruitmentCandidateConnectors.role, [
            "primary",
            "claimer",
          ]),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      )
      .leftJoin(
        connectorUser,
        eq(
          schema.recruitmentCandidateConnectors.connectorUserId,
          connectorUser.id
        )
      )
      .leftJoin(
        schema.contactResumes,
        eq(
          schema.contactResumes.candidateId,
          schema.recruitmentJobCandidates.id
        )
      )
      .leftJoin(
        schema.recruitmentCandidateWorkflow,
        eq(
          schema.recruitmentJobCandidates.id,
          schema.recruitmentCandidateWorkflow.candidateId
        )
      )
      .leftJoin(
        rejectorUser,
        eq(schema.recruitmentCandidateWorkflow.updatedBy, rejectorUser.id)
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        CANDIDATES_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    // Fetch stage history for pipeline tracker
    const stageHistoryRows = await this.db
      .select({
        stageKey: schema.recruitmentStagesSchema.stageKey,
        label: schema.recruitmentStagesSchema.label,
        stageOrder: schema.recruitmentStagesSchema.stageOrder,
        note: schema.recruitmentCandidateStageHistory.note,
        createdAt: schema.recruitmentCandidateStageHistory.createdAt,
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
          eq(schema.recruitmentCandidateStageHistory.candidateId, candidateId),
          isNull(schema.recruitmentCandidateStageHistory.deletedAt)
        )
      )
      .orderBy(asc(schema.recruitmentCandidateStageHistory.createdAt));

    // Fetch latest transaction + pricing for fee breakdown
    const pricingTable = schema.recruitmentJobPricesSchema;

    const [transactionRow] = await this.db
      .select({
        bountyAmount: pricingTable.bountyAmount,
        providerFee: pricingTable.providerFee,
        processingFee: pricingTable.processingFee,
        totalAmount: schema.recruitmentInterviewTransactions.totalAmount,
        status: schema.recruitmentInterviewTransactions.status,
        authorizedAt: schema.recruitmentInterviewTransactions.authorizedAt,
        capturedAt: schema.recruitmentInterviewTransactions.capturedAt,
        cancelledAt: schema.recruitmentInterviewTransactions.cancelledAt,
        chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
        receiptUrl: schema.recruitmentInterviewTransactions.receiptUrl,
      })
      .from(schema.recruitmentInterviewTransactions)
      .leftJoin(
        pricingTable,
        eq(schema.recruitmentInterviewTransactions.jobId, pricingTable.jobId)
      )
      .where(
        and(
          eq(schema.recruitmentInterviewTransactions.candidateId, candidateId),
          eq(
            schema.recruitmentInterviewTransactions.transactionType,
            RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST
          ),
          isNull(schema.recruitmentInterviewTransactions.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentInterviewTransactions.createdAt))
      .limit(1);

    // Build pipeline steps
    const completedStageKeys = new Set(
      stageHistoryRows
        .filter((h) => h.stageKey)
        .map((h) => h.stageKey as string)
    );

    const currentStageKey = row.stageKey || "in_review";

    // Recruiter pipeline steps (incl. the leading Not Qualified step + the
    // In-Review-skipped-on-bypass rule) are built by the shared helper.
    const pipelineSteps = buildRecruiterPipelineSteps({
      stageHistoryRows,
      currentStageKey,
      candidateCreatedAt: row.createdAt,
    });

    // Flat referral reconciliation (computed server-side; the client only
    // renders it). For the first candidate of a job to be charged, part of the
    // fee was already captured as a deposit at shortlist, so the hire charge is
    // only the remainder. `fullReferralAmount` is the full fee incl. Stripe +
    // application fees; `flatDepositApplied` is the portion already paid (0 for
    // candidates charged the full fee).
    const hasTransaction = transactionRow != null;
    const txnFullReferral = transactionRow
      ? Number(transactionRow.bountyAmount ?? 0) +
        Number(transactionRow.providerFee ?? 0) +
        Number(transactionRow.processingFee ?? 0)
      : 0;
    let txnCharged = 0;
    if (transactionRow) {
      txnCharged =
        transactionRow.chargeAmount != null
          ? Number(transactionRow.chargeAmount)
          : Number(transactionRow.totalAmount ?? 0);
    }
    // Post-hire fee top-ups captured for this candidate (0 when none). When the
    // Flat Referral Fee is raised after hire, the difference is collected as a
    // separate flat_topup, so the full fee = deposit + hire + top-ups. The fee can
    // be raised MORE THAN ONCE before release, so sum every captured row — taking
    // only the first would under-report the fee and skew the deposit
    // reconciliation below.
    let txnTopUp = 0;
    if (hasTransaction) {
      const topupRows = await this.db
        .select({
          chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
          totalAmount: schema.recruitmentInterviewTransactions.totalAmount,
        })
        .from(schema.recruitmentInterviewTransactions)
        .where(
          and(
            eq(
              schema.recruitmentInterviewTransactions.candidateId,
              candidateId
            ),
            eq(
              schema.recruitmentInterviewTransactions.transactionType,
              RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_TOPUP
            ),
            eq(
              schema.recruitmentInterviewTransactions.status,
              RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
            ),
            isNull(schema.recruitmentInterviewTransactions.deletedAt)
          )
        );
      txnTopUp =
        Math.round(
          topupRows.reduce(
            (sum, r) => sum + Number(r.chargeAmount ?? r.totalAmount ?? 0),
            0
          ) * 100
        ) / 100;
    }
    // Deposit actually paid at shortlist for this candidate. Derived from the
    // reconciliation (full − hire − top-up) and capped at the real captured
    // deposit, so it stays correct for later candidates (no credit) and while a
    // raised fee's top-up is still pending (not yet charged).
    const capturedDeposit = hasTransaction
      ? await getCapturedFlatDepositAmount(this.db, row.jobId)
      : 0;
    const txnFlatDepositApplied = hasTransaction
      ? Math.min(
          capturedDeposit,
          Math.max(
            0,
            Math.round((txnFullReferral - txnCharged - txnTopUp) * 100) / 100
          )
        )
      : 0;

    const transaction = transactionRow
      ? {
          bountyAmount: transactionRow.bountyAmount,
          providerFee: transactionRow.providerFee,
          processingFee: transactionRow.processingFee,
          totalAmount: transactionRow.totalAmount,
          fullReferralAmount: txnFullReferral.toFixed(2),
          flatDepositApplied: txnFlatDepositApplied.toFixed(2),
          flatTopUpApplied: txnTopUp.toFixed(2),
          status: transactionRow.status,
          authorizedAt: transactionRow.authorizedAt?.toISOString() || null,
          capturedAt: transactionRow.capturedAt?.toISOString() || null,
          cancelledAt: transactionRow.cancelledAt?.toISOString() || null,
          chargeAmount: transactionRow.chargeAmount,
          receiptUrl: transactionRow.receiptUrl,
        }
      : null;

    const isRevealed =
      row.stageKey !== null && REVEALED_STAGES.has(row.stageKey);

    // Identity is revealed on the interview path (`isRevealed`) or early — from
    // `in_review` onward — when the recruiter's organisation has early
    // candidate-details access on. The same gate governs the resume and the
    // un-redacted AI summary.
    const earlyCandidateDetailsAccess =
      await this.moduleAccessService.isEarlyCandidateDetailsAccessEnabledForUser(
        requesterId
      );
    // For a rejected candidate the pre-rejection tier (from stage history)
    // decides visibility: reaching the interview path reveals regardless of the
    // flag (already revealed); reaching the `in_review` tier reveals only under
    // early access. Rejected straight from `processing` matches neither → hidden.
    const reachedRevealedStage = [...REVEALED_STAGES].some((k) =>
      completedStageKeys.has(k)
    );
    const reachedReviewStage = (EARLY_ACCESS_STAGES as readonly string[]).some(
      (k) => completedStageKeys.has(k)
    );
    const canViewDetails = canViewCandidateDetails(
      row.stageKey,
      isRevealed,
      earlyCandidateDetailsAccess,
      reachedReviewStage,
      reachedRevealedStage
    );

    const candidateDisplayName = canViewDetails
      ? [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
        row.anonymousLabel ||
        "Candidate"
      : row.anonymousLabel || "Candidate";

    const gapAnalysisPayload = assembleGapAnalysisPayload(
      parseGapAnalysisStored(row.gapAnalysis),
      row.matchScore ? parseFloat(row.matchScore) : null,
      resolveGapAnalysisAssemblyContext({
        candidateName: candidateDisplayName,
        resumeMetadata: row.resumeMetadata,
        resumeTotalYearsExp: row.resumeTotalYearsExp,
        userCompany: row.userCompany,
        processedAt: row.analysisAt?.toISOString(),
        userLocation: row.userLocation ?? undefined,
      })
    );

    const skills = Array.isArray(row.contactSkills)
      ? (row.contactSkills as string[])
      : [];

    // Connector identity is withheld from the recruiter during the early
    // evaluation stages and revealed from the interview phase onward (see
    // isConnectorVisibleToRecruiter). Skip the query entirely while hidden
    // rather than fetching rows we would only discard. The Move-to-Hired
    // classification dialog sources its connectors from the payout-state
    // endpoint instead.
    const connectorsVisible = isConnectorVisibleToRecruiter(row.stageKey);

    const connectorRows = !connectorsVisible
      ? []
      : await this.db
          .select({
            connectorUserId:
              schema.recruitmentCandidateConnectors.connectorUserId,
            role: schema.recruitmentCandidateConnectors.role,
            sharePercent: schema.recruitmentCandidateConnectors.sharePercent,
            classificationType:
              schema.recruitmentCandidateConnectors.classificationType,
            isActiveEmployee:
              schema.recruitmentCandidateConnectors.isActiveEmployee,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            email: schema.users.email,
            profilePhoto: schema.users.profilePhotoUrl,
            jobTitle: schema.users.jobTitle,
            company: schema.users.company,
            linkedinUrl: schema.users.linkedinUrl,
          })
          .from(schema.recruitmentCandidateConnectors)
          .leftJoin(
            schema.users,
            eq(
              schema.recruitmentCandidateConnectors.connectorUserId,
              schema.users.id
            )
          )
          .where(
            and(
              eq(
                schema.recruitmentCandidateConnectors.candidateId,
                candidateId
              ),
              isNull(schema.recruitmentCandidateConnectors.deletedAt)
            )
          );

    const connectors = connectorRows.map((c) => ({
      connectorUserId: c.connectorUserId,
      role: c.role,
      sharePercent: c.sharePercent,
      classificationType: c.classificationType,
      isActiveEmployee: c.isActiveEmployee,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Connector",
      email: c.email ?? null,
      avatar: c.profilePhoto
        ? this.mediaService.getFullS3Url(c.profilePhoto)
        : null,
      jobTitle: c.jobTitle ?? null,
      company: c.company ?? null,
      linkedinUrl: c.linkedinUrl ?? null,
    }));

    // Candidate's assessment answers (screening Q&A), ordered by the recruiter's
    // question order. Empty when the job had no assessment.
    const assessmentResponses = await fetchCandidateAssessmentResponses(
      this.db,
      candidateId
    );

    const rejection =
      row.stageKey === "rejected" && row.rejectedAt
        ? {
            category: row.rejectionCategory ?? null,
            note: row.rejectionNote ?? null,
            rejectedAt: row.rejectedAt.toISOString(),
            rejectedBy:
              row.rejectorFirstName || row.rejectorLastName || row.rejectorEmail
                ? {
                    name:
                      [row.rejectorFirstName, row.rejectorLastName]
                        .filter(Boolean)
                        .join(" ") || "Recruiter",
                    email: row.rejectorEmail ?? null,
                    avatar: row.rejectorProfilePhoto
                      ? this.mediaService.getFullS3Url(row.rejectorProfilePhoto)
                      : null,
                  }
                : null,
          }
        : null;

    const base = {
      id: row.id,
      anonymousLabel: row.anonymousLabel,
      stage: row.stageKey || "in_review",
      stageLabel: row.stageLabel || "In Review",
      stageOrder: row.stageOrder ?? 0,
      stageUpdatedAt: row.stageUpdatedAt,
      createdAt: row.createdAt,
      hireDate: row.hireDate ? row.hireDate.toISOString() : null,
      connectors,
      skills,
      currentTitle: row.userJobTitle || null,
      currentCompany: row.userCompany || null,
      // Same hired-only gate as `connectors` — the "Referred by …" chip must not
      // surface the connector before the hire is committed.
      referrer:
        connectorsVisible && row.connectorFirstName
          ? {
              name: [row.connectorFirstName, row.connectorLastName]
                .filter(Boolean)
                .join(" "),
              avatar: row.connectorProfilePhoto
                ? this.mediaService.getFullS3Url(row.connectorProfilePhoto)
                : null,
            }
          : null,
      pipelineSteps,
      transaction,
      // Whether the caller may see the candidate's full details early. Drives
      // client-side identity masking (server is the single source of truth).
      detailsRevealed: canViewDetails,
      // Resume profile data (always visible to recruiter)
      resumeJobTitle: row.resumeJobTitle || null,
      totalYearsExp: yearsExpFromDbColumn(row.resumeTotalYearsExp),
      // Redact the AI summary only while details are still hidden; early
      // candidate-details access un-redacts it from `in_review` onward.
      aiSummary:
        row.stageKey &&
        HIDDEN_DETAIL_STAGES.includes(row.stageKey as AnyType) &&
        !canViewDetails
          ? redactSensitiveText(row.resumeAiSummary || "")
          : row.resumeAiSummary || null,
      resumeMetadata: (row.resumeMetadata as Record<string, unknown>) || null,
      // Original resume — visible after the interview reveal, or from `in_review`
      // onward when the organisation has early candidate-details access enabled.
      resumeFileName: canViewDetails ? row.resumeFileName || null : null,
      hasResume: canViewDetails && !!row.resumeFilePath,
      // Skill matching / evaluation
      matchScore: row.matchScore ? parseFloat(row.matchScore) : null,
      matchedSkills: (row.matchedSkills as string[]) || null,
      missingSkills: (row.missingSkills as string[]) || null,
      analysisAt: row.analysisAt?.toISOString() ?? null,
      analysisStatus: row.analysisStatus || null,
      analysisNote: row.analysisNote || null,
      gapAnalysis: gapAnalysisPayload,
      // Candidate's screening answers (recruiter-facing; includes answer key).
      assessmentResponses,
      rejection,
    };

    if (canViewDetails) {
      return {
        ...base,
        revealedName:
          [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
          null,
        revealedEmail: row.userEmail || null,
        revealedLinkedIn: row.userLinkedinUrl || null,
        interview: row.interviewScheduledAt
          ? {
              scheduledAt: row.interviewScheduledAt,
              meetingLink: row.interviewMeetingLink || null,
              notes: row.interviewNotes || null,
            }
          : null,
      };
    }

    return {
      ...base,
      revealedName: null,
      revealedEmail: null,
      revealedLinkedIn: null,
      interview: null,
    };
  }
}
