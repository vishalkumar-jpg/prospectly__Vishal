import { and, count, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import {
  recruitmentCandidateConnectors,
  recruitmentJobCandidates,
  recruitmentJobsSchema,
  recruitmentStagesSchema,
  users,
} from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "database/schema";
import { INCLUDED_CONNECTOR_REFERRED_STAGES } from "../job-pool-matches.constants";

type DbLike = PostgresJsDatabase<typeof schema>;

export const REFERRED_INBOX_STAGES = INCLUDED_CONNECTOR_REFERRED_STAGES;

export type ReferredInboxJobAggregate = {
  jobId: string;
  latestAt: Date;
  /** All referred candidates in inbox stages for this connector+job. */
  candidateCount: number;
  /** Share-link applies only (`shareId` set) — safe to add onto pool/upload counts. */
  directApplyCount: number;
};

/**
 * Jobs where this connector has referred `job_candidates` activity but may have
 * no pool_match / upload_job rows (share-link apply path).
 */
export async function queryReferredInboxJobAggregates(
  db: DbLike,
  params: {
    userId: string;
    jobStatus: "active" | "closed";
    searchTerm?: string;
  }
): Promise<ReferredInboxJobAggregate[]> {
  const candidates = recruitmentJobCandidates;
  const mapping = recruitmentCandidateConnectors;
  const jobs = recruitmentJobsSchema;
  const stages = recruitmentStagesSchema;

  const stageRows = await db
    .select({ id: stages.id })
    .from(stages)
    .where(inArray(stages.stageKey, [...REFERRED_INBOX_STAGES]));

  if (stageRows.length === 0) return [];

  const stageIds = stageRows.map((s) => s.id);
  const searchTerm = params.searchTerm?.trim();

  const searchCondition = searchTerm
    ? or(
        ilike(jobs.title, `%${searchTerm}%`),
        ilike(jobs.companyName, `%${searchTerm}%`),
        ilike(jobs.description, `%${searchTerm}%`),
        ilike(jobs.location, `%${searchTerm}%`),
        ilike(users.firstName, `%${searchTerm}%`),
        ilike(users.lastName, `%${searchTerm}%`),
        ilike(users.email, `%${searchTerm}%`),
        ilike(candidates.anonymousLabel, `%${searchTerm}%`)
      )
    : undefined;

  const rows = await db
    .select({
      jobId: candidates.jobId,
      latestAt: sql<Date>`max(${candidates.createdAt})`.as("latest_at"),
      candidateCount: count().as("candidate_count"),
      directApplyCount:
        sql<number>`count(*) filter (where ${candidates.shareId} is not null)`.as(
          "direct_apply_count"
        ),
    })
    .from(candidates)
    .innerJoin(
      mapping,
      and(
        eq(mapping.candidateId, candidates.id),
        eq(mapping.connectorUserId, params.userId),
        isNull(mapping.deletedAt)
      )
    )
    .innerJoin(jobs, eq(candidates.jobId, jobs.id))
    .leftJoin(users, eq(candidates.candidateUserId, users.id))
    .where(
      and(
        isNull(candidates.deletedAt),
        inArray(candidates.stageId, stageIds),
        eq(jobs.status, params.jobStatus),
        isNull(jobs.deletedAt),
        ...(searchCondition ? [searchCondition] : [])
      )
    )
    .groupBy(candidates.jobId);

  return rows.map((row) => ({
    jobId: row.jobId,
    latestAt: new Date(row.latestAt),
    candidateCount: Number(row.candidateCount),
    directApplyCount: Number(row.directApplyCount),
  }));
}

/**
 * Merge referred-job aggregates into inbox maps without double-counting
 * consent-path candidates that already appear via pool_matches.
 */
export function mergeReferredJobsIntoInboxMaps(params: {
  jobLatestMap: Map<string, Date>;
  jobCountMap: Map<string, number>;
  referredRows: ReferredInboxJobAggregate[];
  /** Jobs that already have pool_match contribution (not upload-only). */
  poolMatchJobIds: Set<string>;
}): void {
  const { jobLatestMap, jobCountMap, referredRows, poolMatchJobIds } = params;

  for (const row of referredRows) {
    const existingLatest = jobLatestMap.get(row.jobId);
    if (!existingLatest || row.latestAt > existingLatest) {
      jobLatestMap.set(row.jobId, row.latestAt);
    }

    if (!jobCountMap.has(row.jobId)) {
      jobCountMap.set(row.jobId, row.candidateCount);
      continue;
    }

    // Pool jobs: only add share-link applies (consent-path already in pool count).
    // Upload-only jobs: also add consent-path referred so badge is not understated.
    const consentPathCount = row.candidateCount - row.directApplyCount;
    const add =
      row.directApplyCount +
      (poolMatchJobIds.has(row.jobId) ? 0 : Math.max(0, consentPathCount));
    if (add > 0) {
      jobCountMap.set(row.jobId, (jobCountMap.get(row.jobId) ?? 0) + add);
    }
  }
}
