import { Injectable, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { ConnectorOriginsService } from "../../connector-origins/connector-origins.service";
import { CANDIDATE_CONNECTOR_ROLE } from "../../candidate-connectors/candidate-connectors.constants";

export interface SplitRecipient {
  userId: string;
  role: (typeof CANDIDATE_CONNECTOR_ROLE)[keyof typeof CANDIDATE_CONNECTOR_ROLE];
  percent: 100 | 50;
}

export interface SplitResolution {
  mode: "single" | "split";
  recipients: SplitRecipient[];
}

// Decides — at candidate creation time, inside the same tx as the candidate
// insert — whether this new candidate should produce a single-connector
// payout (100% to one person) or a two-way marketplace split (50/50 between
// the claimer and the original sharer).
//
// Eligibility for a split:
//   1. The claimer has a recruitment_connector_origins row.
//   2. origin.jobId == the job this candidate is being added to.
//   3. origin's sharerId resolves and is != claimerId (self-attribution
//      guard — a user cannot split with themselves).
//
// Everything else collapses to a single primary assignment.
@Injectable()
export class RecruitmentPayoutSplitService {
  private readonly logger = new Logger(RecruitmentPayoutSplitService.name);

  constructor(private readonly originsService: ConnectorOriginsService) {}

  async resolveConnectorsForNewCandidate(
    tx: PostgresJsDatabase<typeof schema>,
    params: { claimerId: string; jobId: string }
  ): Promise<SplitResolution> {
    const { claimerId, jobId } = params;

    const origin = await this.originsService.getOriginForUser(tx, claimerId);

    // No origin row → claimer is not a "new connector" tied to any job → single.
    if (!origin) {
      return this.singleResolution(claimerId);
    }

    // Origin job must match THIS job for split to apply.
    if (origin.jobId !== jobId) {
      return this.singleResolution(claimerId);
    }

    // Self-attribution guard: if the sharer is null or equals the claimer,
    // collapse to single to avoid paying the same user twice.
    if (!origin.sharerId || origin.sharerId === claimerId) {
      return this.singleResolution(claimerId);
    }

    return {
      mode: "split",
      recipients: [
        {
          userId: claimerId,
          role: CANDIDATE_CONNECTOR_ROLE.CLAIMER,
          percent: 50,
        },
        {
          userId: origin.sharerId,
          role: CANDIDATE_CONNECTOR_ROLE.SHARER,
          percent: 50,
        },
      ],
    };
  }

  private singleResolution(userId: string): SplitResolution {
    return {
      mode: "single",
      recipients: [
        {
          userId,
          role: CANDIDATE_CONNECTOR_ROLE.PRIMARY,
          percent: 100,
        },
      ],
    };
  }
}
