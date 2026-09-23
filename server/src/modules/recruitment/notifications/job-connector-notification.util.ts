import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

export type JobConnectorNotificationContext = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  requesterId: string;
};

export async function loadJobConnectorNotificationContext(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string
): Promise<JobConnectorNotificationContext | null> {
  const [row] = await db
    .select({
      jobId: schema.recruitmentJobsSchema.id,
      jobTitle: schema.recruitmentJobsSchema.title,
      companyName: schema.recruitmentJobsSchema.companyName,
      requesterId: schema.recruitmentJobsSchema.requesterId,
    })
    .from(schema.recruitmentJobsSchema)
    .where(
      and(
        eq(schema.recruitmentJobsSchema.id, jobId),
        isNull(schema.recruitmentJobsSchema.deletedAt)
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    companyName: row.companyName ?? "",
  };
}

/** All connectors linked to a job via referrals, shares, or pool matches. */
export async function resolveJobConnectorUserIds(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string
): Promise<string[]> {
  const ids = new Set<string>();

  const fromConnectors = await db
    .selectDistinct({
      userId: schema.recruitmentCandidateConnectors.connectorUserId,
    })
    .from(schema.recruitmentCandidateConnectors)
    .innerJoin(
      schema.recruitmentJobCandidates,
      eq(
        schema.recruitmentCandidateConnectors.candidateId,
        schema.recruitmentJobCandidates.id
      )
    )
    .where(
      and(
        eq(schema.recruitmentJobCandidates.jobId, jobId),
        isNull(schema.recruitmentJobCandidates.deletedAt),
        isNull(schema.recruitmentCandidateConnectors.deletedAt)
      )
    );

  for (const row of fromConnectors) ids.add(row.userId);

  const fromShares = await db
    .selectDistinct({ userId: schema.recruitmentJobShares.sharerId })
    .from(schema.recruitmentJobShares)
    .where(eq(schema.recruitmentJobShares.jobId, jobId));

  for (const row of fromShares) ids.add(row.userId);

  const fromPool = await db
    .selectDistinct({
      userId: schema.recruitmentJobPoolMatches.connectorUserId,
    })
    .from(schema.recruitmentJobPoolMatches)
    .where(
      and(
        eq(schema.recruitmentJobPoolMatches.jobId, jobId),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      )
    );

  for (const row of fromPool) ids.add(row.userId);

  return [...ids];
}
