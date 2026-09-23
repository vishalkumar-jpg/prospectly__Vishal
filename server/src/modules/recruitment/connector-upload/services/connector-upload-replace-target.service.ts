import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { hashData, normalizeEmail } from "services/contactMatchingService";
import type { ResolvedReplaceTarget } from "../connector-upload-replace.types";
import { ConnectorReplaceResumeDto } from "../connector-upload-replace.dto";
import { CONNECTOR_UPLOAD_MESSAGES } from "../connector-upload.constants";

@Injectable()
export class ConnectorUploadReplaceTargetService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async resolveTarget(
    dto: ConnectorReplaceResumeDto,
    userId: string
  ): Promise<ResolvedReplaceTarget> {
    if (dto.matchId) {
      return this.resolveByMatchId(dto.matchId, userId);
    }
    return this.resolveByCandidateId(dto.candidateId as string, userId);
  }

  private async resolveByMatchId(
    matchId: string,
    userId: string
  ): Promise<ResolvedReplaceTarget> {
    const [row] = await this.db
      .select({
        matchId: schema.recruitmentJobPoolMatches.id,
        jobId: schema.recruitmentJobPoolMatches.jobId,
        contactId: schema.recruitmentJobPoolMatches.contactId,
        poolStatus: schema.recruitmentJobPoolMatches.status,
        poolSource: schema.recruitmentJobPoolMatches.source,
        resumeMediaId: schema.recruitmentJobPoolMatches.resumeMediaId,
        connectorUserId: schema.recruitmentJobPoolMatches.connectorUserId,
      })
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, matchId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!row || row.connectorUserId !== userId) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    const candidate = await this.findCandidateForMatch(
      row.jobId,
      row.contactId
    );
    return {
      matchId: row.matchId,
      jobId: row.jobId,
      contactId: row.contactId,
      poolStatus: row.poolStatus,
      poolSource: row.poolSource,
      resumeMediaId: row.resumeMediaId,
      candidateId: candidate?.id ?? null,
      recruiterStageKey: candidate?.stageKey ?? null,
      candidateAnalysisStatus: candidate?.analysisStatus ?? null,
      candidateEmailHash: await this.getContactEmailHash(row.contactId),
    };
  }

  private async resolveByCandidateId(
    candidateId: string,
    userId: string
  ): Promise<ResolvedReplaceTarget> {
    const [row] = await this.db
      .select({
        candidateId: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        contactId: schema.recruitmentJobCandidates.contactId,
        resumeMediaId: schema.recruitmentJobCandidates.resumeMediaId,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
        stageKey: schema.recruitmentStagesSchema.stageKey,
      })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentCandidateConnectors,
        eq(
          schema.recruitmentCandidateConnectors.candidateId,
          schema.recruitmentJobCandidates.id
        )
      )
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          eq(schema.recruitmentCandidateConnectors.connectorUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!row?.contactId) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    const [match] = await this.db
      .select({
        matchId: schema.recruitmentJobPoolMatches.id,
        poolStatus: schema.recruitmentJobPoolMatches.status,
        poolSource: schema.recruitmentJobPoolMatches.source,
        resumeMediaId: schema.recruitmentJobPoolMatches.resumeMediaId,
      })
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.jobId, row.jobId),
          eq(schema.recruitmentJobPoolMatches.contactId, row.contactId),
          eq(schema.recruitmentJobPoolMatches.connectorUserId, userId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    return {
      matchId: match.matchId,
      jobId: row.jobId,
      contactId: row.contactId,
      poolStatus: match.poolStatus,
      poolSource: match.poolSource,
      resumeMediaId: match.resumeMediaId ?? row.resumeMediaId,
      candidateId: row.candidateId,
      recruiterStageKey: row.stageKey,
      candidateAnalysisStatus: row.analysisStatus,
      candidateEmailHash: await this.getContactEmailHash(row.contactId),
    };
  }

  private async findCandidateForMatch(jobId: string, contactId: number) {
    const [row] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
      })
      .from(schema.recruitmentJobCandidates)
      .leftJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.jobId, jobId),
          eq(schema.recruitmentJobCandidates.contactId, contactId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  private async getContactEmailHash(contactId: number): Promise<string | null> {
    const sensitive = await this.db.query.contactSensitiveData.findFirst({
      where: eq(schema.contactSensitiveData.contactId, contactId),
    });
    if (sensitive?.normalizedEmailHash) {
      return sensitive.normalizedEmailHash;
    }
    if (!sensitive?.email) return null;
    return hashData(normalizeEmail(sensitive.email) ?? sensitive.email);
  }
}
