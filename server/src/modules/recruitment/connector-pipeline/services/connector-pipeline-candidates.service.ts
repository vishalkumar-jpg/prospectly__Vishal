import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { maskEmail } from "utils/maskingUtils";
import type { ConnectorPipelineCandidate } from "../connector-pipeline.types";
import {
  INCLUDED_CANDIDATE_STAGES,
  CONNECTOR_STAGE_MAP,
} from "../connector-pipeline.constants";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "../../candidate-evaluation/gap-analysis.mapper";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import { CANDIDATE_CONNECTOR_ROLE } from "../../candidate-connectors/candidate-connectors.constants";
import {
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_PROCESSING_STATUS,
} from "../../payout/recruitment-payout.constants";
import { CANDIDATE_EVALUATION_CONFIG } from "../../candidate-evaluation/candidate-evaluation.constants";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/** While resume re-analysis runs, show the referred row on AI Analysis only. */
function resolveConnectorBoardStage(
  stageKey: string | null | undefined,
  analysisStatus: string | null | undefined
): string {
  const mapped = stageKey
    ? CONNECTOR_STAGE_MAP[stageKey] || stageKey
    : "consent_accepted";
  if (
    analysisStatus === CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING &&
    mapped !== "ai_analysis"
  ) {
    return "ai_analysis";
  }
  return mapped;
}

@Injectable()
export class ConnectorPipelineCandidatesService {
  private readonly logger = new Logger(ConnectorPipelineCandidatesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async getCandidates(
    userId: string,
    search?: string,
    jobId?: string
  ): Promise<ConnectorPipelineCandidate[]> {
    const candidates = schema.recruitmentJobCandidates;
    const stages = schema.recruitmentStagesSchema;
    const { contacts } = schema;
    const jobs = schema.recruitmentJobsSchema;
    const { users } = schema;
    const matches = schema.recruitmentJobPoolMatches;

    // Get stage IDs for our included stages
    const stageRows = await this.db
      .select({
        id: stages.id,
        stageKey: stages.stageKey,
      })
      .from(stages)
      .where(inArray(stages.stageKey, [...INCLUDED_CANDIDATE_STAGES]));

    if (stageRows.length === 0) return [];

    const stageIdToKey = new Map(stageRows.map((s) => [s.id, s.stageKey]));
    const stageIds = stageRows.map((s) => s.id);

    // Connectors are now linked via the recruitment_candidate_connectors
    // mapping table — a user "owns" a candidate if they appear on that
    // candidate's mapping in any role (primary/claimer/sharer).
    const mapping = schema.recruitmentCandidateConnectors;

    const rows = await this.db
      .select({
        id: candidates.id,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        currentTitle: contacts.title,
        currentCompany: contacts.company,
        stageId: candidates.stageId,
        stageUpdatedAt: candidates.stageUpdatedAt,
        jobId: candidates.jobId,
        jobTitle: jobs.title,
        jobCompany: jobs.companyName,
        bountyAmount: schema.recruitmentJobPricesSchema.bountyAmount,
        candidateUserId: candidates.candidateUserId,
        candidateEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        contactId: candidates.contactId,
        shareId: candidates.shareId,
        anonymousLabel: candidates.anonymousLabel,
        notQualifiedReason: candidates.notQualifiedReason,
        connectorRole: mapping.role,
        connectorSharePercent: mapping.sharePercent,
        candidateMatchScore: candidates.matchScore,
        candidateGapAnalysis: candidates.gapAnalysis,
        candidateMatchedSkills: candidates.matchedSkills,
        candidateMissingSkills: candidates.missingSkills,
        candidateAnalysisAt: candidates.analysisAt,
        candidateAnalysisStatus: candidates.analysisStatus,
      })
      .from(candidates)
      .innerJoin(
        mapping,
        and(
          eq(mapping.candidateId, candidates.id),
          eq(mapping.connectorUserId, userId),
          isNull(mapping.deletedAt)
        )
      )
      // leftJoin: share-link apply can leave contactId null if contact create
      // failed; still show the referred candidate via the user profile.
      .leftJoin(contacts, eq(candidates.contactId, contacts.id))
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .leftJoin(
        schema.recruitmentJobPricesSchema,
        eq(candidates.jobId, schema.recruitmentJobPricesSchema.jobId)
      )
      .leftJoin(users, eq(candidates.candidateUserId, users.id))
      .where(
        and(
          isNull(candidates.deletedAt),
          inArray(candidates.stageId, stageIds),
          ...(jobId ? [eq(candidates.jobId, jobId)] : [])
        )
      );

    if (rows.length === 0) return [];

    const candidateIds = rows.map((r) => r.id);

    // Batch fetch match data (scores + consent info) in a single query
    const jobIds = [...new Set(rows.map((r) => r.jobId))];
    const contactIds = [
      ...new Set(rows.filter((r) => r.contactId).map((r) => r.contactId!)),
    ];

    const matchRows =
      jobIds.length > 0 && contactIds.length > 0
        ? await this.db
            .select({
              matchId: matches.id,
              jobId: matches.jobId,
              contactId: matches.contactId,
              matchScore: matches.matchScore,
              consentSentAt: matches.consentSentAt,
              consentRespondedAt: matches.consentRespondedAt,
              source: matches.source,
              gapAnalysis: matches.gapAnalysis,
              matchedSignals: matches.matchedSignals,
              concerns: matches.concerns,
              matchedAt: matches.createdAt,
              resumeFileName: schema.mediaSchema.fileName,
            })
            .from(matches)
            .leftJoin(
              schema.mediaSchema,
              eq(matches.resumeMediaId, schema.mediaSchema.id)
            )
            .where(
              and(
                eq(matches.connectorUserId, userId),
                inArray(matches.jobId, jobIds),
                inArray(matches.contactId, contactIds),
                isNull(matches.deletedAt)
              )
            )
        : [];

    const matchDataMap = new Map<
      string,
      {
        matchId: string;
        matchScore: number;
        consentSentAt: string | null;
        consentAcceptedAt: string | null;
        source: string;
        gapAnalysisRaw: unknown;
        matchedSignals: string[];
        concerns: string[];
        matchedAt: string;
        resumeFileName: string | null;
      }
    >();

    for (const m of matchRows) {
      matchDataMap.set(`${m.jobId}-${m.contactId}`, {
        matchId: m.matchId,
        matchScore: m.matchScore ? parseFloat(m.matchScore) : 0,
        consentSentAt: m.consentSentAt?.toISOString() ?? null,
        consentAcceptedAt: m.consentRespondedAt?.toISOString() ?? null,
        source: m.source,
        gapAnalysisRaw: m.gapAnalysis,
        matchedSignals: asStringArray(m.matchedSignals),
        concerns: asStringArray(m.concerns),
        matchedAt: m.matchedAt.toISOString(),
        resumeFileName: m.resumeFileName ?? null,
      });
    }

    // Batch fetch interview scheduled dates from candidate workflow
    const workflowRows = await this.db
      .select({
        candidateId: schema.recruitmentCandidateWorkflow.candidateId,
        interviewScheduledAt:
          schema.recruitmentCandidateWorkflow.interviewScheduledAt,
      })
      .from(schema.recruitmentCandidateWorkflow)
      .where(
        and(
          inArray(
            schema.recruitmentCandidateWorkflow.candidateId,
            candidateIds
          ),
          isNull(schema.recruitmentCandidateWorkflow.deletedAt)
        )
      );

    const interviewDateMap = new Map<string, string>();
    for (const w of workflowRows) {
      if (w.interviewScheduledAt) {
        interviewDateMap.set(
          w.candidateId,
          w.interviewScheduledAt.toISOString()
        );
      }
    }

    // Batch fetch stage history for rejection reasons and invite sent dates
    const stageHistory = await this.db
      .select({
        candidateId: schema.recruitmentCandidateStageHistory.candidateId,
        stageId: schema.recruitmentCandidateStageHistory.stageId,
        note: schema.recruitmentCandidateStageHistory.note,
        createdAt: schema.recruitmentCandidateStageHistory.createdAt,
      })
      .from(schema.recruitmentCandidateStageHistory)
      .where(
        and(
          inArray(
            schema.recruitmentCandidateStageHistory.candidateId,
            candidateIds
          ),
          isNull(schema.recruitmentCandidateStageHistory.deletedAt)
        )
      );

    // Find rejected, invite_sent, and interview_completed stage IDs for history extraction
    const rejectedStageId = stageRows.find(
      (s) => s.stageKey === "rejected"
    )?.id;
    const inviteSentStageId = stageRows.find(
      (s) => s.stageKey === "interview_invite_sent"
    )?.id;
    const interviewCompletedStageId = stageRows.find(
      (s) => s.stageKey === "interview_completed"
    )?.id;

    const rejectionReasonMap = new Map<string, string>();
    const inviteSentDateMap = new Map<string, string>();
    const interviewCompletedDateMap = new Map<string, string>();

    for (const h of stageHistory) {
      if (h.stageId === rejectedStageId && h.note) {
        rejectionReasonMap.set(h.candidateId, h.note);
      }
      if (h.stageId === inviteSentStageId && h.createdAt) {
        const existing = inviteSentDateMap.get(h.candidateId);
        const current = h.createdAt.toISOString();
        if (!existing || current > existing) {
          inviteSentDateMap.set(h.candidateId, current);
        }
      }
      if (h.stageId === interviewCompletedStageId && h.createdAt) {
        const existing = interviewCompletedDateMap.get(h.candidateId);
        const current = h.createdAt.toISOString();
        if (!existing || current > existing) {
          interviewCompletedDateMap.set(h.candidateId, current);
        }
      }
    }

    // Batch fetch THIS connector's payout rows (created at booking
    // confirmation; finalised at the Hired stage). Only the row matching
    // recipient_id = current user surfaces — connectors only see their own
    // payout, never sibling connector rows on the same candidate.
    const payoutRows = await this.db
      .select({
        candidateId: schema.recruitmentPayoutHistory.candidateId,
        status: schema.recruitmentPayoutHistory.status,
        processingStatus: schema.recruitmentPayoutHistory.processingStatus,
        cancellationReason: schema.recruitmentPayoutHistory.cancellationReason,
        cancellationNotes: schema.recruitmentPayoutHistory.cancellationNotes,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          inArray(schema.recruitmentPayoutHistory.candidateId, candidateIds),
          eq(schema.recruitmentPayoutHistory.recipientId, userId),
          eq(
            schema.recruitmentPayoutHistory.payoutType,
            RECRUITMENT_PAYOUT_TYPE.CONNECTOR
          ),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );

    const payoutByCandidateId = new Map<
      string,
      {
        status: string;
        cancellationReason: string | null;
        cancellationNotes: string | null;
      }
    >();
    for (const p of payoutRows) {
      // Surface the same display-status semantics the recruiter sees, so
      // queued / processing / onboarding_pending render correctly if we
      // extend the connector card later.
      const displayStatus =
        p.processingStatus === RECRUITMENT_PROCESSING_STATUS.ONBOARDING_PENDING
          ? "onboarding_pending"
          : p.processingStatus === RECRUITMENT_PROCESSING_STATUS.QUEUED
            ? "queued"
            : p.processingStatus === RECRUITMENT_PROCESSING_STATUS.PROCESSING
              ? "processing"
              : p.status;
      payoutByCandidateId.set(p.candidateId, {
        status: displayStatus,
        cancellationReason: p.cancellationReason,
        cancellationNotes: p.cancellationNotes,
      });
    }

    let results: ConnectorPipelineCandidate[] = rows.map((r) => {
      const stageKey = r.stageId ? stageIdToKey.get(r.stageId) : null;
      const connectorStage = resolveConnectorBoardStage(
        stageKey,
        r.candidateAnalysisStatus
      );
      const matchData = r.contactId
        ? matchDataMap.get(`${r.jobId}-${r.contactId}`)
        : undefined;

      const gross = r.bountyAmount ? parseFloat(r.bountyAmount) : 0;
      const sharePercent = parseFloat(r.connectorSharePercent ?? "0");
      const payout = gross
        ? parseFloat(
            this.feeConfig.getConnectorPayoutAmount(gross, sharePercent)
          )
        : 0;
      const isSplit =
        r.connectorRole === CANDIDATE_CONNECTOR_ROLE.SHARER ||
        r.connectorRole === CANDIDATE_CONNECTOR_ROLE.CLAIMER;

      const payoutRow = payoutByCandidateId.get(r.id) ?? null;
      const candidateName =
        `${r.userFirstName || ""} ${r.userLastName || ""}`.trim() ||
        `${r.contactFirstName || ""} ${r.contactLastName || ""}`.trim() ||
        r.anonymousLabel?.trim() ||
        "Unknown";

      const jobCandidateScore = r.candidateMatchScore
        ? parseFloat(r.candidateMatchScore)
        : null;
      const poolScore = matchData?.matchScore ?? null;
      const displayScore =
        jobCandidateScore != null && Number.isFinite(jobCandidateScore)
          ? jobCandidateScore
          : poolScore;

      const assembledGapAnalysis = assembleGapAnalysisPayload(
        parseGapAnalysisStored(
          r.candidateGapAnalysis ?? matchData?.gapAnalysisRaw
        ),
        displayScore,
        resolveGapAnalysisAssemblyContext({
          candidateName,
          contactCompany: r.currentCompany,
          processedAt:
            r.candidateAnalysisAt?.toISOString() ?? matchData?.matchedAt,
        })
      );

      const matchedSkills = asStringArray(
        r.candidateMatchedSkills ?? matchData?.matchedSignals
      );
      const concerns = asStringArray(
        r.candidateMissingSkills ?? matchData?.concerns
      );

      return {
        id: r.id,
        candidateName,
        candidateEmail: maskEmail(r.candidateEmail),
        currentTitle: r.currentTitle,
        currentCompany: r.currentCompany,
        stage: connectorStage,
        stageUpdatedAt:
          r.stageUpdatedAt?.toISOString() ?? toUTC().toISOString(),
        jobTitle: r.jobTitle,
        jobCompany: r.jobCompany,
        bountyAmount: payout,
        isSplit,
        // Direct-applied candidates have no pool match; `displayScore` already
        // prefers the candidate-row AI score and falls back to the pool score.
        matchScore: displayScore,
        consentSentAt: matchData?.consentSentAt ?? null,
        consentAcceptedAt: matchData?.consentAcceptedAt ?? null,
        consentDeclinedReason: null,
        rejectionReason: rejectionReasonMap.get(r.id) ?? null,
        notQualifiedReason: r.notQualifiedReason ?? null,
        interviewScheduledAt: interviewDateMap.get(r.id) ?? null,
        interviewCompletedAt: interviewCompletedDateMap.get(r.id) ?? null,
        inviteSentAt: inviteSentDateMap.get(r.id) ?? null,
        source: r.shareId ? "direct_application" : "consent",
        payoutStatus: payoutRow?.status ?? null,
        payoutCancellationReason: payoutRow?.cancellationReason ?? null,
        payoutCancellationNotes: payoutRow?.cancellationNotes ?? null,
        matchId: matchData?.matchId ?? null,
        contactId: r.contactId ?? null,
        poolSource: matchData?.source ?? null,
        resumeFileName: matchData?.resumeFileName ?? null,
        matchedAt: matchData?.matchedAt ?? null,
        matchedSignals: matchedSkills,
        concerns,
        gapAnalysis: assembledGapAnalysis,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.candidateName.toLowerCase().includes(s) ||
          r.jobTitle.toLowerCase().includes(s) ||
          (r.currentTitle && r.currentTitle.toLowerCase().includes(s)) ||
          (r.currentCompany && r.currentCompany.toLowerCase().includes(s))
      );
    }

    return results;
  }
}
