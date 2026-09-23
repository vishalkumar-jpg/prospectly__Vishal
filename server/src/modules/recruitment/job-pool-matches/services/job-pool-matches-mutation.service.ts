import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  JOB_POOL_MATCH_STATUS,
  JOB_POOL_MATCH_MESSAGES,
} from "../job-pool-matches.constants";

@Injectable()
export class JobPoolMatchesMutationService {
  private readonly logger = new Logger(JobPoolMatchesMutationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async approveMatch(userId: string, matchId: string) {
    const matches = schema.recruitmentJobPoolMatches;

    const [match] = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.connectorUserId, userId),
          eq(matches.status, JOB_POOL_MATCH_STATUS.PENDING),
          isNull(matches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    // Check if the job is still active
    const [job] = await this.db
      .select({ status: schema.recruitmentJobsSchema.status })
      .from(schema.recruitmentJobsSchema)
      .where(eq(schema.recruitmentJobsSchema.id, match.jobId))
      .limit(1);

    if (!job || job.status === "closed") {
      throw new BadRequestException(JOB_POOL_MATCH_MESSAGES.ERROR.JOB_CLOSED);
    }

    const now = toUTC();

    const [updated] = await this.db
      .update(matches)
      .set({
        status: JOB_POOL_MATCH_STATUS.APPROVED,
        approvedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.connectorUserId, userId),
          eq(matches.status, JOB_POOL_MATCH_STATUS.PENDING),
          isNull(matches.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      throw new BadRequestException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    return updated;
  }

  async declineMatch(userId: string, matchId: string, reason?: string) {
    const matches = schema.recruitmentJobPoolMatches;

    const [match] = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.connectorUserId, userId),
          isNull(matches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      throw new NotFoundException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    if (match.status !== JOB_POOL_MATCH_STATUS.PENDING) {
      throw new BadRequestException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_PENDING
      );
    }

    // Check if the job is still active
    const [job] = await this.db
      .select({ status: schema.recruitmentJobsSchema.status })
      .from(schema.recruitmentJobsSchema)
      .where(eq(schema.recruitmentJobsSchema.id, match.jobId))
      .limit(1);

    if (!job || job.status === "closed") {
      throw new BadRequestException(JOB_POOL_MATCH_MESSAGES.ERROR.JOB_CLOSED);
    }

    // Network ownership check
    const [relationship] = await this.db
      .select({ id: schema.contactRelationships.id })
      .from(schema.contactRelationships)
      .where(
        and(
          eq(schema.contactRelationships.contactId, match.contactId),
          eq(schema.contactRelationships.userId, userId)
        )
      )
      .limit(1);

    if (!relationship) {
      throw new ForbiddenException(
        JOB_POOL_MATCH_MESSAGES.ERROR.CONTACT_NOT_IN_NETWORK
      );
    }

    const now = toUTC();

    const [updated] = await this.db
      .update(matches)
      .set({
        status: JOB_POOL_MATCH_STATUS.CONNECTOR_DECLINED,
        connectorDeclinedAt: now,
        connectorDeclineReason: reason ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.connectorUserId, userId),
          eq(matches.status, JOB_POOL_MATCH_STATUS.PENDING),
          isNull(matches.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      throw new BadRequestException(
        JOB_POOL_MATCH_MESSAGES.ERROR.MATCH_NOT_FOUND
      );
    }

    return updated;
  }
}
