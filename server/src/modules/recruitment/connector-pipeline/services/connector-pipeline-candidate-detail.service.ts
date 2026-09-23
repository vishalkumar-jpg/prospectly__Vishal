import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { MediaService } from "modules/media/media.service";
import { CANDIDATES_MESSAGES } from "modules/recruitment/candidates/candidates.constants";
import { yearsExpFromDbColumn } from "modules/recruitment/candidates/services/candidates-query.helpers";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "modules/recruitment/candidate-evaluation/gap-analysis.mapper";
import {
  buildConnectorPipelineSteps,
  buildConnectorStageTimestamps,
  CONNECTOR_STAGE_LABELS,
  resolveConnectorPipelineCurrentStage,
  shouldHideConnectorPipeline,
} from "./connector-pipeline-steps.helper";

@Injectable()
export class ConnectorPipelineCandidateDetailService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly mediaService: MediaService
  ) {}

  async getCandidateDetail(connectorUserId: string, candidateId: string) {
    const [access] = await this.db
      .select({ id: schema.recruitmentCandidateConnectors.id })
      .from(schema.recruitmentCandidateConnectors)
      .where(
        and(
          eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
          eq(
            schema.recruitmentCandidateConnectors.connectorUserId,
            connectorUserId
          ),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      )
      .limit(1);

    if (!access) {
      throw new ForbiddenException(
        CANDIDATES_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    const connectorUser = alias(schema.users, "connector_user");
    const candidateUser = alias(schema.users, "candidate_user");

    const [row] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
        stageUpdatedAt: schema.recruitmentJobCandidates.stageUpdatedAt,
        createdAt: schema.recruitmentJobCandidates.createdAt,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        stageLabel: schema.recruitmentStagesSchema.label,
        stageOrder: schema.recruitmentStagesSchema.stageOrder,
        userFirstName: candidateUser.firstName,
        userLastName: candidateUser.lastName,
        userEmail: candidateUser.email,
        userLinkedinUrl: candidateUser.linkedinUrl,
        userJobTitle: candidateUser.jobTitle,
        userCompany: candidateUser.company,
        contactSkills: schema.contacts.skills,
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
        connectorFirstName: connectorUser.firstName,
        connectorLastName: connectorUser.lastName,
        connectorProfilePhoto: connectorUser.profilePhotoUrl,
        interviewScheduledAt:
          schema.recruitmentCandidateWorkflow.interviewScheduledAt,
        interviewMeetingLink:
          schema.recruitmentCandidateWorkflow.interviewMeetingLink,
        interviewNotes: schema.recruitmentCandidateWorkflow.interviewNotes,
        resumeJobTitle: schema.contactResumes.jobTitle,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeAiSummary: schema.contactResumes.aiSummary,
        resumeMetadata: schema.contactResumes.metadata,
        matchScore: schema.recruitmentJobCandidates.matchScore,
        matchedSkills: schema.recruitmentJobCandidates.matchedSkills,
        missingSkills: schema.recruitmentJobCandidates.missingSkills,
        analysisAt: schema.recruitmentJobCandidates.analysisAt,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
        analysisNote: schema.recruitmentJobCandidates.analysisNote,
        gapAnalysis: schema.recruitmentJobCandidates.gapAnalysis,
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
      .leftJoin(
        schema.recruitmentCandidateConnectors,
        and(
          eq(
            schema.recruitmentCandidateConnectors.candidateId,
            schema.recruitmentJobCandidates.id
          ),
          eq(
            schema.recruitmentCandidateConnectors.connectorUserId,
            connectorUserId
          ),
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

    const stageHistoryRows = await this.db
      .select({
        stageKey: schema.recruitmentStagesSchema.stageKey,
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

    const currentStageKey = row.stageKey || "in_review";
    const { currentStage: connectorStage, isRejected } =
      resolveConnectorPipelineCurrentStage(currentStageKey, stageHistoryRows);
    const timestamps = buildConnectorStageTimestamps({
      candidateCreatedAt: row.createdAt,
      stageHistoryRows,
      currentStage: connectorStage,
    });
    const responseStage = isRejected ? "rejected" : connectorStage;
    const hidePipeline = shouldHideConnectorPipeline(responseStage);
    const pipelineSteps = hidePipeline
      ? []
      : buildConnectorPipelineSteps({
          currentStage: connectorStage,
          timestamps,
        });

    const revealedName =
      [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
      row.anonymousLabel ||
      "Candidate";

    const gapAnalysisPayload = assembleGapAnalysisPayload(
      parseGapAnalysisStored(row.gapAnalysis),
      row.matchScore ? parseFloat(row.matchScore) : null,
      resolveGapAnalysisAssemblyContext({
        candidateName: revealedName,
        resumeMetadata: row.resumeMetadata,
        resumeTotalYearsExp: row.resumeTotalYearsExp,
        userCompany: row.userCompany,
        processedAt: row.analysisAt?.toISOString(),
      })
    );

    const skills = Array.isArray(row.contactSkills)
      ? (row.contactSkills as string[])
      : [];

    const resolvedSkills =
      skills.length > 0
        ? skills
        : gapAnalysisPayload?.dimensions?.length
          ? [
              ...new Set(
                gapAnalysisPayload.dimensions.flatMap((dim) =>
                  [...dim.matched, ...dim.gaps]
                    .map((chip) => chip.label?.trim())
                    .filter(Boolean)
                )
              ),
            ]
          : ((row.matchedSkills as string[]) ?? []);

    const hasResume = !!row.resumeFilePath;

    return {
      id: row.id,
      anonymousLabel: row.anonymousLabel,
      stage: responseStage,
      stageLabel:
        CONNECTOR_STAGE_LABELS[responseStage] ??
        row.stageLabel ??
        "Consent Accepted",
      stageOrder: row.stageOrder ?? 0,
      stageUpdatedAt: row.stageUpdatedAt,
      createdAt: row.createdAt,
      hireDate: null,
      connectors: [],
      skills: resolvedSkills,
      currentTitle: row.userJobTitle || null,
      currentCompany: row.userCompany || null,
      detailsRevealed: true,
      revealedName,
      revealedEmail: row.userEmail || null,
      revealedLinkedIn: row.userLinkedinUrl || null,
      hasResume,
      resumeFileName: row.resumeFileName || null,
      referrer: row.connectorFirstName
        ? {
            name: [row.connectorFirstName, row.connectorLastName]
              .filter(Boolean)
              .join(" "),
            avatar: row.connectorProfilePhoto
              ? this.mediaService.getFullS3Url(row.connectorProfilePhoto)
              : null,
          }
        : null,
      interview: row.interviewScheduledAt
        ? {
            scheduledAt: row.interviewScheduledAt,
            meetingLink: row.interviewMeetingLink || null,
            notes: row.interviewNotes || null,
          }
        : null,
      pipelineSteps,
      transaction: null,
      resumeJobTitle: row.resumeJobTitle || null,
      totalYearsExp: yearsExpFromDbColumn(row.resumeTotalYearsExp),
      aiSummary: row.resumeAiSummary || null,
      resumeMetadata: (row.resumeMetadata as Record<string, unknown>) || null,
      matchScore: row.matchScore ? parseFloat(row.matchScore) : null,
      matchedSkills: (row.matchedSkills as string[]) || null,
      missingSkills: (row.missingSkills as string[]) || null,
      analysisAt: row.analysisAt?.toISOString() ?? null,
      analysisStatus: row.analysisStatus || null,
      analysisNote: row.analysisNote || null,
      gapAnalysis: gapAnalysisPayload,
    };
  }
}
