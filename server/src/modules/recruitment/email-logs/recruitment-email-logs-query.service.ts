import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  RecruitmentEmailLogItem,
  RecruitmentEmailLogsResponse,
} from "./recruitment-email-logs.response";
import { RECRUITMENT_EMAIL_LOGS_MESSAGES } from "./recruitment-email-logs.constants";
import {
  applyLatestResendOnly,
  buildAudienceVisibilityFilter,
  canResendForPipelineContext,
} from "./recruitment-email-logs-audience.helper";
import { RecruitmentAccessService } from "../collaboration/services/recruitment-access.service";

type ResendContext = {
  stageKey: string | null;
  poolMatchStatusById: Map<string, string>;
};

@Injectable()
export class RecruitmentEmailLogsQueryService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly recruitmentAccessService: RecruitmentAccessService
  ) {}

  async getByCandidateId(
    userId: string,
    candidateId: string,
    audience: "connector" | "recruiter"
  ): Promise<RecruitmentEmailLogsResponse> {
    const candidate = await this.loadCandidateContext(candidateId);
    if (!candidate) {
      throw new NotFoundException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    await this.assertCandidateAccess(userId, candidate, audience);

    const poolMatchIds = await this.resolvePoolMatchIds(
      candidate,
      audience === "connector" ? userId : null
    );
    const rowScope = [
      eq(schema.recruitmentEmailLogsSchema.candidateId, candidateId),
    ];
    if (poolMatchIds.length > 0) {
      rowScope.push(
        inArray(schema.recruitmentEmailLogsSchema.poolMatchId, poolMatchIds)
      );
    }

    const rows = await this.db
      .select()
      .from(schema.recruitmentEmailLogsSchema)
      .where(
        and(
          or(...rowScope),
          buildAudienceVisibilityFilter(
            schema.recruitmentEmailLogsSchema,
            audience,
            userId
          ),
          isNull(schema.recruitmentEmailLogsSchema.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentEmailLogsSchema.sentAt));

    const resendContext = await this.loadResendContext(
      candidateId,
      rows.map((row) => row.poolMatchId).filter(Boolean) as string[]
    );

    return {
      logs: applyLatestResendOnly(
        rows.map((row) => this.toItem(row, audience, resendContext))
      ),
      hasHistoricalGap: rows.length === 0,
    };
  }

  async getByPoolMatchId(
    userId: string,
    matchId: string
  ): Promise<RecruitmentEmailLogsResponse> {
    const match = await this.db.query.recruitmentJobPoolMatches.findFirst({
      where: and(
        eq(schema.recruitmentJobPoolMatches.id, matchId),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      ),
    });

    if (!match) {
      throw new NotFoundException(
        RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    if (match.connectorUserId !== userId) {
      await this.recruitmentAccessService.resolveJobAccess(userId, match.jobId);
    }

    const rows = await this.db
      .select()
      .from(schema.recruitmentEmailLogsSchema)
      .where(
        and(
          eq(schema.recruitmentEmailLogsSchema.poolMatchId, matchId),
          buildAudienceVisibilityFilter(
            schema.recruitmentEmailLogsSchema,
            match.connectorUserId === userId ? "connector" : "recruiter",
            userId
          ),
          isNull(schema.recruitmentEmailLogsSchema.deletedAt)
        )
      )
      .orderBy(desc(schema.recruitmentEmailLogsSchema.sentAt));

    const resendContext: ResendContext = {
      stageKey: null,
      poolMatchStatusById: new Map([[matchId, match.status]]),
    };

    const audience =
      match.connectorUserId === userId ? "connector" : "recruiter";

    return {
      logs: applyLatestResendOnly(
        rows.map((row) => this.toItem(row, audience, resendContext))
      ),
      hasHistoricalGap: rows.length === 0,
      audience,
    };
  }

  private async loadResendContext(
    candidateId: string,
    poolMatchIds: string[]
  ): Promise<ResendContext> {
    const [stageRow] = await this.db
      .select({ stageKey: schema.recruitmentStagesSchema.stageKey })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentStagesSchema,
        eq(
          schema.recruitmentJobCandidates.stageId,
          schema.recruitmentStagesSchema.id
        )
      )
      .where(eq(schema.recruitmentJobCandidates.id, candidateId))
      .limit(1);

    const uniquePoolMatchIds = [...new Set(poolMatchIds)];
    const poolMatchStatusById = new Map<string, string>();
    if (uniquePoolMatchIds.length > 0) {
      const matches = await this.db
        .select({
          id: schema.recruitmentJobPoolMatches.id,
          status: schema.recruitmentJobPoolMatches.status,
        })
        .from(schema.recruitmentJobPoolMatches)
        .where(
          inArray(schema.recruitmentJobPoolMatches.id, uniquePoolMatchIds)
        );
      for (const match of matches) {
        poolMatchStatusById.set(match.id, match.status);
      }
    }

    return {
      stageKey: stageRow?.stageKey ?? null,
      poolMatchStatusById,
    };
  }

  private async loadCandidateContext(candidateId: string) {
    const [row] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        contactId: schema.recruitmentJobCandidates.contactId,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobCandidates)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentJobCandidates.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  private async assertCandidateAccess(
    userId: string,
    candidate: {
      id: string;
      jobId: string;
      contactId: number | null;
      requesterId: string;
    },
    audience: "connector" | "recruiter"
  ) {
    if (audience === "recruiter") {
      await this.recruitmentAccessService.resolveJobAccess(
        userId,
        candidate.jobId
      );
      return;
    }

    const [connectorLink] = await this.db
      .select({ id: schema.recruitmentCandidateConnectors.id })
      .from(schema.recruitmentCandidateConnectors)
      .where(
        and(
          eq(schema.recruitmentCandidateConnectors.candidateId, candidate.id),
          eq(schema.recruitmentCandidateConnectors.connectorUserId, userId),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      )
      .limit(1);

    if (connectorLink) return;

    if (candidate.contactId) {
      const [poolMatch] = await this.db
        .select({ id: schema.recruitmentJobPoolMatches.id })
        .from(schema.recruitmentJobPoolMatches)
        .where(
          and(
            eq(schema.recruitmentJobPoolMatches.jobId, candidate.jobId),
            eq(schema.recruitmentJobPoolMatches.contactId, candidate.contactId),
            eq(schema.recruitmentJobPoolMatches.connectorUserId, userId),
            isNull(schema.recruitmentJobPoolMatches.deletedAt)
          )
        )
        .limit(1);
      if (poolMatch) return;
    }

    throw new ForbiddenException(
      RECRUITMENT_EMAIL_LOGS_MESSAGES.ERROR.FORBIDDEN
    );
  }

  private async resolvePoolMatchIds(
    candidate: { jobId: string; contactId: number | null },
    connectorUserId: string | null
  ) {
    if (!candidate.contactId) return [];
    const matches = await this.db
      .select({ id: schema.recruitmentJobPoolMatches.id })
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.jobId, candidate.jobId),
          eq(schema.recruitmentJobPoolMatches.contactId, candidate.contactId),
          ...(connectorUserId
            ? [
                eq(
                  schema.recruitmentJobPoolMatches.connectorUserId,
                  connectorUserId
                ),
              ]
            : []),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      );
    return matches.map((m) => m.id);
  }

  private toItem(
    row: typeof schema.recruitmentEmailLogsSchema.$inferSelect,
    audience: "connector" | "recruiter",
    context: ResendContext
  ): RecruitmentEmailLogItem {
    const poolMatchStatus = row.poolMatchId
      ? (context.poolMatchStatusById.get(row.poolMatchId) ?? null)
      : null;

    return {
      id: row.id,
      emailType: row.emailType,
      recipientType: row.recipientType,
      subject: row.subject,
      status: row.status,
      sentAt: row.sentAt?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      detailType: row.detailType,
      detailReason: row.detailReason,
      canResend: canResendForPipelineContext(row.emailType, audience, {
        stageKey: context.stageKey,
        poolMatchStatus,
      }),
    };
  }
}
