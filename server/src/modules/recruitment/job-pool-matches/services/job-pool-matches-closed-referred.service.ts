import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { maskEmail } from "utils/maskingUtils";
import type { ClientGapAnalysisPayload } from "../../candidate-evaluation/gap-analysis.mapper";
import { REFERRED_INBOX_STAGES } from "./job-pool-matches-referred-inbox.helper";

export type ClosedReferredCandidateCard = {
  matchId: string;
  contactId: number | null;
  status: string;
  source: string;
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
};

export type ClosedReferredCandidateRow = {
  jobId: string;
  contactId: number | null;
  candidate: ClosedReferredCandidateCard;
};

/** Share-link referred candidates for closed jobs, shaped like pool inbox cards. */
@Injectable()
export class JobPoolMatchesClosedReferredService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async fetchClosedReferredCandidates(
    userId: string,
    jobIds: string[]
  ): Promise<ClosedReferredCandidateRow[]> {
    if (jobIds.length === 0) return [];

    const candidates = schema.recruitmentJobCandidates;
    const mapping = schema.recruitmentCandidateConnectors;
    const stages = schema.recruitmentStagesSchema;
    const { contacts, users } = schema;

    const stageRows = await this.db
      .select({ id: stages.id, stageKey: stages.stageKey })
      .from(stages)
      .where(inArray(stages.stageKey, [...REFERRED_INBOX_STAGES]));

    if (stageRows.length === 0) return [];

    const stageIdToKey = new Map(stageRows.map((s) => [s.id, s.stageKey]));
    const stageIds = stageRows.map((s) => s.id);

    const rows = await this.db
      .select({
        id: candidates.id,
        jobId: candidates.jobId,
        contactId: candidates.contactId,
        stageId: candidates.stageId,
        matchScore: candidates.matchScore,
        createdAt: candidates.createdAt,
        anonymousLabel: candidates.anonymousLabel,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactTitle: contacts.title,
        contactCompany: contacts.company,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
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
      .leftJoin(contacts, eq(candidates.contactId, contacts.id))
      .leftJoin(users, eq(candidates.candidateUserId, users.id))
      .where(
        and(
          isNull(candidates.deletedAt),
          inArray(candidates.jobId, jobIds),
          inArray(candidates.stageId, stageIds),
          sql`${candidates.shareId} is not null`
        )
      );

    return rows.map((row) => {
      const stageKey = row.stageId ? stageIdToKey.get(row.stageId) : null;
      const status =
        // eslint-disable-next-line no-nested-ternary
        stageKey === "processing"
          ? "processing"
          : stageKey === "rejected"
            ? "connector_declined"
            : "consent_accepted";

      const candidateName =
        `${row.userFirstName || ""} ${row.userLastName || ""}`.trim() ||
        `${row.contactFirstName || ""} ${row.contactLastName || ""}`.trim() ||
        row.anonymousLabel?.trim() ||
        "Unknown";

      return {
        jobId: row.jobId,
        contactId: row.contactId,
        candidate: {
          matchId: row.id,
          contactId: row.contactId,
          status,
          source: "direct_application",
          candidateName,
          candidateEmail: maskEmail(row.userEmail ?? row.contactEmail),
          candidateTitle: row.contactTitle,
          candidateCompany: row.contactCompany,
          matchScore: row.matchScore ?? "0",
          cosineSimilarity: null,
          llmScore: null,
          matchedSignals: [],
          concerns: [],
          gapAnalysis: null,
          consentDeclineReason: null,
          consentDeclineNotes: null,
          connectorDeclineReason: null,
          connectorDeclinedAt: null,
          consentRespondedAt: null,
          matchedAt: row.createdAt,
        },
      };
    });
  }
}
