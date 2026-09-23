import { Injectable, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import {
  CANDIDATE_CONNECTOR_ROLE,
  CandidateConnectorRole,
} from "./candidate-connectors.constants";
import { RecruitmentFeeConfigService } from "../fee-config/recruitment-fee-config.service";

export interface CandidateConnectorRow {
  connectorUserId: string;
  role: CandidateConnectorRole;
  sharePercent: number;
}

// Thin helper around the recruitment_candidate_connectors mapping table.
// All writes accept a `tx` so they can be composed inside a larger
// transaction (e.g. the same tx that inserts the candidate row).
@Injectable()
export class CandidateConnectorsService {
  private readonly logger = new Logger(CandidateConnectorsService.name);

  constructor(private readonly feeConfig: RecruitmentFeeConfigService) {}

  // Single-connector case: direct apply, or consent apply where no split
  // eligibility was detected. 100% share to one connector.
  async addPrimary(
    tx: PostgresJsDatabase<typeof schema>,
    candidateId: string,
    connectorUserId: string
  ): Promise<void> {
    const now = toUTC();
    await tx
      .insert(schema.recruitmentCandidateConnectors)
      .values({
        candidateId,
        connectorUserId,
        role: CANDIDATE_CONNECTOR_ROLE.PRIMARY,
        sharePercent: "100.00",
        createdAt: now,
        createdBy: connectorUserId,
      })
      .onConflictDoNothing();
  }

  // Split case: claimer (uploaded/consent-applied the candidate) and sharer
  // (owner of the origin share link that brought the claimer to Prospectly).
  // Each gets the canonical split share (default 50% of the connector pool).
  async addSplit(
    tx: PostgresJsDatabase<typeof schema>,
    candidateId: string,
    claimerUserId: string,
    sharerUserId: string
  ): Promise<void> {
    const now = toUTC();
    const sharePercent = this.feeConfig
      .getSplitConnectorSharePercent()
      .toFixed(2);
    await tx
      .insert(schema.recruitmentCandidateConnectors)
      .values([
        {
          candidateId,
          connectorUserId: claimerUserId,
          role: CANDIDATE_CONNECTOR_ROLE.CLAIMER,
          sharePercent,
          createdAt: now,
          createdBy: claimerUserId,
        },
        {
          candidateId,
          connectorUserId: sharerUserId,
          role: CANDIDATE_CONNECTOR_ROLE.SHARER,
          sharePercent,
          createdAt: now,
          createdBy: claimerUserId,
        },
      ])
      .onConflictDoNothing();
  }

  // Returns all non-deleted connectors for a candidate, ordered so that
  // 'claimer' and 'primary' come before 'sharer' (useful for downstream
  // code that wants the "acting" connector first).
  async getConnectorsByCandidate(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<CandidateConnectorRow[]> {
    const rows = await db
      .select({
        connectorUserId: schema.recruitmentCandidateConnectors.connectorUserId,
        role: schema.recruitmentCandidateConnectors.role,
        sharePercent: schema.recruitmentCandidateConnectors.sharePercent,
      })
      .from(schema.recruitmentCandidateConnectors)
      .where(
        and(
          eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      );

    return rows.map((r) => ({
      connectorUserId: r.connectorUserId,
      role: r.role as CandidateConnectorRole,
      sharePercent: Number(r.sharePercent),
    }));
  }

  // Returns the "primary acting" connector: the claimer in split cases, or
  // the primary in single cases. Used by code paths that still need a
  // single "this candidate's connector" value (e.g. listings).
  async getPrimaryConnector(
    db: PostgresJsDatabase<typeof schema>,
    candidateId: string
  ): Promise<string | null> {
    const rows = await this.getConnectorsByCandidate(db, candidateId);
    if (rows.length === 0) return null;

    const actor = rows.find(
      (r) =>
        r.role === CANDIDATE_CONNECTOR_ROLE.PRIMARY ||
        r.role === CANDIDATE_CONNECTOR_ROLE.CLAIMER
    );
    return (actor ?? rows[0]).connectorUserId;
  }
}
