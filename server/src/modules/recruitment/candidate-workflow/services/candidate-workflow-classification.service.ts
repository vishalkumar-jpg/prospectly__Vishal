import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, ne } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  RECRUITMENT_CONNECTOR_CLASSIFICATION,
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PAYOUT_TYPE,
} from "../../payout/recruitment-payout.constants";
import { CANDIDATE_WORKFLOW_MESSAGES } from "../candidate-workflow.constants";
import { UpdateClassificationDto } from "../candidate-workflow.dto";

// Lets the recruiter edit per-connector classification (internal/external,
// is_active_employee) on the Hired card BEFORE that connector's payout is
// released. Once a connector's payout row is no longer pending, that row's
// classification is locked in (we still allow editing siblings).
@Injectable()
export class CandidateWorkflowClassificationService {
  private readonly logger = new Logger(
    CandidateWorkflowClassificationService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async updateClassifications(
    userId: string,
    candidateId: string,
    dto: UpdateClassificationDto
  ) {
    const now = toUTC();

    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
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

    if (!candidate) {
      throw new NotFoundException(
        CANDIDATE_WORKFLOW_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    // Validate each classification: internal requires isActiveEmployee.
    for (const cls of dto.classifications) {
      if (
        cls.classificationType ===
          RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL &&
        cls.isActiveEmployee === undefined
      ) {
        throw new BadRequestException(
          CANDIDATE_WORKFLOW_MESSAGES.ERROR.INTERNAL_REQUIRES_ACTIVE_FLAG
        );
      }
    }

    // Reject edits that target a connector whose payout is no longer pending.
    const connectorIds = dto.classifications.map((c) => c.connectorUserId);
    const lockedRows = await this.db
      .select({
        recipientId: schema.recruitmentPayoutHistory.recipientId,
      })
      .from(schema.recruitmentPayoutHistory)
      .where(
        and(
          eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
          eq(
            schema.recruitmentPayoutHistory.payoutType,
            RECRUITMENT_PAYOUT_TYPE.CONNECTOR
          ),
          ne(
            schema.recruitmentPayoutHistory.status,
            RECRUITMENT_PAYOUT_STATUS.PENDING
          ),
          isNull(schema.recruitmentPayoutHistory.deletedAt)
        )
      );
    const lockedConnectorIds = new Set(lockedRows.map((r) => r.recipientId));
    const conflict = connectorIds.find((id) => lockedConnectorIds.has(id));
    if (conflict) {
      throw new BadRequestException(
        "Cannot edit classification for a connector whose payout has already been released"
      );
    }

    await this.db.transaction(async (tx) => {
      for (const cls of dto.classifications) {
        await tx
          .update(schema.recruitmentCandidateConnectors)
          .set({
            classificationType: cls.classificationType,
            isActiveEmployee:
              cls.classificationType ===
              RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
                ? (cls.isActiveEmployee ?? null)
                : null,
          })
          .where(
            and(
              eq(
                schema.recruitmentCandidateConnectors.candidateId,
                candidateId
              ),
              eq(
                schema.recruitmentCandidateConnectors.connectorUserId,
                cls.connectorUserId
              ),
              isNull(schema.recruitmentCandidateConnectors.deletedAt)
            )
          );
      }

      await tx
        .update(schema.recruitmentJobCandidates)
        .set({ updatedAt: now, updatedBy: userId })
        .where(eq(schema.recruitmentJobCandidates.id, candidateId));
    });

    return {
      candidateId,
      updatedCount: dto.classifications.length,
      message: CANDIDATE_WORKFLOW_MESSAGES.SUCCESS.CLASSIFICATIONS_UPDATED,
    };
  }
}
