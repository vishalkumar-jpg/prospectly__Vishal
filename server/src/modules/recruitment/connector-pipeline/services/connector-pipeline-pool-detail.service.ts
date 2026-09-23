import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { yearsExpFromDbColumn } from "modules/recruitment/candidates/services/candidates-query.helpers";
import {
  assembleGapAnalysisPayload,
  parseGapAnalysisStored,
  resolveGapAnalysisAssemblyContext,
} from "modules/recruitment/candidate-evaluation/gap-analysis.mapper";
import { JOB_POOL_MATCH_MESSAGES } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import {
  buildConsentDeclinedPipelineSteps,
  buildConnectorPipelineSteps,
  buildConnectorStageTimestamps,
  CONNECTOR_STAGE_LABELS,
  mapPoolMatchStatusToConnectorStage,
  shouldHideConnectorPipeline,
} from "./connector-pipeline-steps.helper";

const POOL_STATUS_LABELS: Record<string, string> = {
  processing: "AI Analysis",
  pending: "Qualified",
  approved: "Qualified",
  consent_pending: "Consent Pending",
  consent_accepted: "Consent Accepted",
  consent_declined: "Consent Declined",
  consent_superseded: "Another connector accepted",
  connector_declined: "Not Referred",
  failed: "Failed",
};

@Injectable()
export class ConnectorPipelinePoolDetailService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getPoolMatchDetail(connectorUserId: string, matchId: string) {
    const matches = schema.recruitmentJobPoolMatches;

    const [row] = await this.db
      .select({
        matchId: matches.id,
        status: matches.status,
        matchScore: matches.matchScore,
        matchedSignals: matches.matchedSignals,
        concerns: matches.concerns,
        gapAnalysis: matches.gapAnalysis,
        matchedAt: matches.createdAt,
        consentSentAt: matches.consentSentAt,
        consentRespondedAt: matches.consentRespondedAt,
        source: matches.source,
        contactFirstName: schema.contacts.firstName,
        contactLastName: schema.contacts.lastName,
        contactEmail: schema.contacts.email,
        contactTitle: schema.contacts.title,
        contactCompany: schema.contacts.company,
        contactSkills: schema.contacts.skills,
        contactLinkedin: schema.contacts.linkedin,
        resumeJobTitle: schema.contactResumes.jobTitle,
        resumeTotalYearsExp: schema.contactResumes.totalYearsExp,
        resumeAiSummary: schema.contactResumes.aiSummary,
        resumeMetadata: schema.contactResumes.metadata,
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
      })
      .from(matches)
      .innerJoin(schema.contacts, eq(matches.contactId, schema.contacts.id))
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
          eq(matches.id, matchId),
          eq(matches.connectorUserId, connectorUserId),
          isNull(matches.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    const candidateName =
      [row.contactFirstName, row.contactLastName].filter(Boolean).join(" ") ||
      "Candidate";

    const gapAnalysisPayload = assembleGapAnalysisPayload(
      parseGapAnalysisStored(row.gapAnalysis),
      row.matchScore ? parseFloat(row.matchScore) : null,
      resolveGapAnalysisAssemblyContext({
        candidateName,
        resumeMetadata: row.resumeMetadata,
        resumeTotalYearsExp: row.resumeTotalYearsExp,
        contactCompany: row.contactCompany,
        processedAt: row.matchedAt?.toISOString(),
      })
    );

    let skills = Array.isArray(row.contactSkills)
      ? (row.contactSkills as string[])
      : [];

    if (skills.length === 0 && gapAnalysisPayload?.dimensions?.length) {
      const fromGap = new Set<string>();
      for (const dim of gapAnalysisPayload.dimensions) {
        for (const chip of [...dim.matched, ...dim.gaps]) {
          const label = chip.label?.trim();
          if (label) fromGap.add(label);
        }
      }
      skills = [...fromGap];
    }

    const matchedSkills = Array.isArray(row.matchedSignals)
      ? (row.matchedSignals as string[])
      : [];
    const missingSkills = Array.isArray(row.concerns)
      ? (row.concerns as string[])
      : [];

    const connectorStage = mapPoolMatchStatusToConnectorStage(row.status);
    const hidePipeline = shouldHideConnectorPipeline(connectorStage);
    const timestamps = buildConnectorStageTimestamps({
      matchedAt: row.matchedAt,
      consentSentAt: row.consentSentAt,
      consentRespondedAt: row.consentRespondedAt,
      currentStage: hidePipeline ? "qualified" : connectorStage,
    });
    const pipelineSteps =
      connectorStage === "consent_declined"
        ? buildConsentDeclinedPipelineSteps({
            matchedAt: row.matchedAt,
            consentSentAt: row.consentSentAt,
            consentRespondedAt: row.consentRespondedAt,
          })
        : hidePipeline
          ? []
          : buildConnectorPipelineSteps({
              currentStage: connectorStage,
              timestamps,
            });
    const stageLabel =
      row.status === "processing" || row.status === "failed"
        ? (POOL_STATUS_LABELS[row.status] ?? row.status.replace(/_/g, " "))
        : (CONNECTOR_STAGE_LABELS[connectorStage] ??
          POOL_STATUS_LABELS[row.status] ??
          row.status.replace(/_/g, " "));

    return {
      id: row.matchId,
      anonymousLabel: candidateName,
      stage: connectorStage,
      stageLabel,
      stageOrder: 0,
      stageUpdatedAt: row.matchedAt,
      createdAt: row.matchedAt,
      hireDate: null,
      connectors: [],
      skills,
      currentTitle: row.contactTitle || row.resumeJobTitle || null,
      currentCompany: row.contactCompany || null,
      detailsRevealed: true,
      revealedName: candidateName,
      revealedEmail: row.contactEmail || null,
      revealedLinkedIn: row.contactLinkedin || null,
      hasResume: !!row.resumeFilePath,
      resumeFileName: row.resumeFileName || null,
      referrer: null,
      interview: null,
      pipelineSteps,
      transaction: null,
      resumeJobTitle: row.resumeJobTitle || row.contactTitle || null,
      totalYearsExp: yearsExpFromDbColumn(row.resumeTotalYearsExp),
      aiSummary: row.resumeAiSummary || null,
      resumeMetadata: (row.resumeMetadata as Record<string, unknown>) || null,
      matchScore: row.matchScore ? parseFloat(row.matchScore) : null,
      matchedSkills: matchedSkills.length ? matchedSkills : null,
      missingSkills: missingSkills.length ? missingSkills : null,
      analysisAt: row.matchedAt?.toISOString() ?? null,
      analysisStatus: gapAnalysisPayload ? "completed" : null,
      analysisNote: null,
      gapAnalysis: gapAnalysisPayload,
    };
  }
}
