import { Injectable, Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";

export interface ConnectorOriginRow {
  userId: string;
  jobId: string;
  shareId: string;
  sharerId: string | null;
}

export interface ConnectorOriginForMe {
  hasOrigin: boolean;
  jobId?: string;
  jobTitle?: string;
  jobStatus?: string;
}

// Tracks which job/share brought a brand-new connector into Prospectly.
// Origin rows are written atomically inside the signup transaction and
// are the single source of truth for marketplace-split eligibility.
@Injectable()
export class ConnectorOriginsService {
  private readonly logger = new Logger(ConnectorOriginsService.name);

  // Called from the signup service after a new user row is created, inside
  // the SAME transaction. If the (jobId, sharerCode) pair resolves to a
  // real share row, insert a recruitment_connector_origins entry. Silently
  // skip (and log a warning) on any mismatch — signup must never fail over
  // origin tracking.
  async createOriginIfNew(
    tx: PostgresJsDatabase<typeof schema>,
    userId: string,
    jobId: string | undefined,
    sharerCode: string | undefined
  ): Promise<void> {
    if (!jobId || !sharerCode) {
      return;
    }

    try {
      const [share] = await tx
        .select({
          id: schema.recruitmentJobShares.id,
          sharerId: schema.recruitmentJobShares.sharerId,
        })
        .from(schema.recruitmentJobShares)
        .where(
          and(
            eq(schema.recruitmentJobShares.sharerCode, sharerCode),
            eq(schema.recruitmentJobShares.jobId, jobId)
          )
        )
        .limit(1);

      if (!share) {
        this.logger.warn(
          `CONNECTOR_ORIGINS_SERVICE :: createOriginIfNew : No share found for jobId=${jobId}, sharerCode=${sharerCode} — skipping origin tracking`
        );
        return;
      }

      // Self-attribution guard: don't write an origin row if the sharer is
      // the same user signing up (shouldn't happen — they'd already have an
      // account — but defend against replay / hand-crafted URLs).
      if (share.sharerId === userId) {
        return;
      }

      await tx
        .insert(schema.recruitmentConnectorOrigins)
        .values({
          userId,
          jobId,
          shareId: share.id,
          createdAt: toUTC(),
          createdBy: userId,
        })
        .onConflictDoNothing();
    } catch (error) {
      this.logger.error(
        `CONNECTOR_ORIGINS_SERVICE :: createOriginIfNew : ERROR : ${error}`
      );
      // Never let origin tracking failure break signup.
    }
  }

  // Returns true iff the (jobId, sharerCode) pair resolves to a real share
  // row. Used by the auth flow to gate public-job-page signup — distinct
  // from createOriginIfNew, which is a best-effort writer that silently
  // skips on mismatch.
  async isValidJobShare(
    db: PostgresJsDatabase<typeof schema>,
    jobId: string,
    sharerCode: string
  ): Promise<boolean> {
    const [share] = await db
      .select({ id: schema.recruitmentJobShares.id })
      .from(schema.recruitmentJobShares)
      .where(
        and(
          eq(schema.recruitmentJobShares.jobId, jobId),
          eq(schema.recruitmentJobShares.sharerCode, sharerCode)
        )
      )
      .limit(1);
    return !!share;
  }

  // Returns the user's origin job (joined to recruitment_jobs) for the
  // post-welcome popup. Returns hasOrigin=false when no row exists.
  async getOriginForCurrentUser(
    db: PostgresJsDatabase<typeof schema>,
    userId: string
  ): Promise<ConnectorOriginForMe> {
    const [row] = await db
      .select({
        jobId: schema.recruitmentConnectorOrigins.jobId,
        jobTitle: schema.recruitmentJobsSchema.title,
        jobStatus: schema.recruitmentJobsSchema.status,
      })
      .from(schema.recruitmentConnectorOrigins)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(
          schema.recruitmentConnectorOrigins.jobId,
          schema.recruitmentJobsSchema.id
        )
      )
      .where(eq(schema.recruitmentConnectorOrigins.userId, userId))
      .limit(1);

    if (!row) {
      return { hasOrigin: false };
    }

    return {
      hasOrigin: true,
      jobId: row.jobId,
      jobTitle: row.jobTitle ?? undefined,
      jobStatus: row.jobStatus ?? undefined,
    };
  }

  // Returns the origin row for a user (with sharerId joined), or null.
  // Used by the payout split service to decide split eligibility.
  async getOriginForUser(
    db: PostgresJsDatabase<typeof schema>,
    userId: string
  ): Promise<ConnectorOriginRow | null> {
    const [row] = await db
      .select({
        userId: schema.recruitmentConnectorOrigins.userId,
        jobId: schema.recruitmentConnectorOrigins.jobId,
        shareId: schema.recruitmentConnectorOrigins.shareId,
        sharerId: schema.recruitmentJobShares.sharerId,
      })
      .from(schema.recruitmentConnectorOrigins)
      .innerJoin(
        schema.recruitmentJobShares,
        eq(
          schema.recruitmentConnectorOrigins.shareId,
          schema.recruitmentJobShares.id
        )
      )
      .where(eq(schema.recruitmentConnectorOrigins.userId, userId))
      .limit(1);

    return row ?? null;
  }
}
