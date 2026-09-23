import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, asc, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";

type Db = PostgresJsDatabase<typeof schema>;
type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | DbTransaction;

/** Jobs read per page in `rebuildAll`. Each one is a separate transaction. */
const REBUILD_JOB_PAGE_SIZE = 200;

export interface ResumeFacetRollupTarget {
  /** `contact_resumes.candidate_id` — binds the résumé to exactly one candidacy. */
  candidateId: string | null;
  /** `contact_resumes.contact_id` — the fallback link for consented contacts. */
  contactId: number | null;
}

/**
 * Maintains `recruitment_job_facet_counts` — the pre-aggregated candidate-side
 * facet frequencies `/facets` sums over the accessible job set (ADR-005 §4.3).
 *
 * The row set mirrors `workspace_rows` in §5.4 exactly: the same candidacy
 * scope, the same freshest-résumé LATERAL, the same identity key. A facet value
 * this table offers but the search cannot match — or matches but never offers —
 * is a bug, not a rounding difference.
 */
@Injectable()
export class ResumeFacetRollupService {
  private readonly logger = new Logger(ResumeFacetRollupService.name);

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: Db) {}

  /**
   * Recomputes every facet kind for one job from live data, replacing that
   * job's rows. Runs in a transaction so `/facets` never reads a half-written
   * job — pass `tx` to join a caller's transaction instead of nesting one.
   */
  async recomputeForJob(jobId: string, tx?: DbTransaction): Promise<void> {
    if (tx) {
      await this.replaceRows(jobId, tx);
      return;
    }

    await this.db.transaction(async (trx) => this.replaceRows(jobId, trx));
  }

  /**
   * The self-healing path for counter drift (§4.3). Pages over every live job
   * on the keyset, one transaction per job, and never lets one bad job abort
   * the sweep.
   */
  async rebuildAll(): Promise<void> {
    let cursor: string | null = null;
    let jobsDone = 0;
    let failures = 0;

    for (;;) {
      const conditions = [isNull(schema.recruitmentJobsSchema.deletedAt)];
      if (cursor) conditions.push(gt(schema.recruitmentJobsSchema.id, cursor));

      const jobs = await this.db
        .select({ id: schema.recruitmentJobsSchema.id })
        .from(schema.recruitmentJobsSchema)
        .where(and(...conditions))
        .orderBy(asc(schema.recruitmentJobsSchema.id))
        .limit(REBUILD_JOB_PAGE_SIZE);

      if (jobs.length === 0) break;

      for (const job of jobs) {
        try {
          await this.recomputeForJob(job.id);
          jobsDone += 1;
        } catch (error) {
          failures += 1;
          this.logger.error(
            `RESUME_FACET_ROLLUP_SERVICE :: rebuildAll : ERROR : jobId=${job.id} ${error}`
          );
        }
      }

      cursor = jobs[jobs.length - 1].id;
    }

    this.logger.log(
      `RESUME_FACET_ROLLUP_SERVICE :: rebuildAll : jobs=${jobsDone} failures=${failures}`
    );
  }

  /**
   * Post-indexing entry point. Deliberately swallows its own errors: stale
   * facet counts are a display defect the rebuild sweep repairs, whereas a
   * throw here would fail — and retry — a résumé index that already committed.
   */
  async recomputeForResume(target: ResumeFacetRollupTarget): Promise<void> {
    try {
      for (const jobId of await this.findAffectedJobIds(target)) {
        await this.recomputeForJob(jobId);
      }
    } catch (error) {
      this.logger.error(
        `RESUME_FACET_ROLLUP_SERVICE :: recomputeForResume : ERROR : candidateId=${target.candidateId} ${error}`
      );
    }
  }

  /**
   * Which postings this résumé feeds, inverted from the §5.4 LATERAL: a résumé
   * carrying `candidate_id` belongs to that candidacy alone, and only a résumé
   * with no candidacy reaches postings through the shared contact.
   */
  private async findAffectedJobIds(
    target: ResumeFacetRollupTarget
  ): Promise<string[]> {
    let link: SQL | undefined;
    if (target.candidateId) {
      link = eq(schema.recruitmentJobCandidates.id, target.candidateId);
    } else if (target.contactId != null) {
      link = eq(schema.recruitmentJobCandidates.contactId, target.contactId);
    }

    if (!link) return [];

    const rows = await this.db
      .selectDistinct({ jobId: schema.recruitmentJobCandidates.jobId })
      .from(schema.recruitmentJobCandidates)
      .where(and(link, isNull(schema.recruitmentJobCandidates.deletedAt)));

    return rows.map((row) => row.jobId);
  }

  private async replaceRows(jobId: string, executor: Executor): Promise<void> {
    // Two résumés on the same posting index concurrently, and delete-then-
    // insert under READ COMMITTED lets the second transaction's DELETE miss
    // rows the first has already inserted — a unique violation, on a path whose
    // errors are swallowed. The lock is released by commit either way.
    await executor.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`facet-rollup:${jobId}`}))`
    );

    // Hard delete: the rows are fully regenerable from live data, so keeping
    // soft-deleted generations would grow the table without ever being read.
    await executor.execute(
      sql`DELETE FROM ${schema.recruitmentJobFacetCounts} WHERE job_id = ${jobId}::uuid`
    );

    await executor.execute(this.insertFacetRowsSql(jobId));
  }

  private insertFacetRowsSql(jobId: string): SQL {
    const now = sql`${toUTC().toISOString()}::timestamptz`;

    return sql`
      WITH candidate_rows AS (
        SELECT
          coalesce('c:' || jc.contact_id::text, 'u:' || jc.candidate_user_id::text) AS identity,
          cr.job_title,
          cr.skills,
          cr.metadata,
          cr.education_level,
          ct.title AS contact_title,
          ct.company AS contact_company,
          ct.source AS contact_source
        FROM ${schema.recruitmentJobCandidates} jc
        JOIN ${schema.recruitmentJobsSchema} j
          ON j.id = jc.job_id AND j.deleted_at IS NULL
        LEFT JOIN ${schema.contacts} ct
          ON ct.id = jc.contact_id AND ct.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT r.job_title, r.skills, r.metadata, r.education_level
          FROM ${schema.contactResumes} r
          WHERE (
              r.candidate_id = jc.id
              OR (r.candidate_id IS NULL AND r.contact_id = jc.contact_id)
            )
            AND r.deleted_at IS NULL
          ORDER BY r.updated_at DESC
          LIMIT 1
        ) cr ON TRUE
        WHERE jc.job_id = ${jobId}::uuid
          AND jc.deleted_at IS NULL
          AND (jc.contact_id IS NOT NULL OR jc.candidate_user_id IS NOT NULL)
      ),
      facet_values AS (
        SELECT identity, 'title'::text AS facet_kind,
               coalesce(job_title, contact_title) AS raw
        FROM candidate_rows
        UNION ALL
        SELECT identity, 'company',
               coalesce(metadata ->> 'currentEmployer', contact_company)
        FROM candidate_rows
        UNION ALL
        SELECT identity, 'education', education_level FROM candidate_rows
        UNION ALL
        SELECT identity, 'source', contact_source FROM candidate_rows
        UNION ALL
        -- The four sources profile_text indexes, and therefore the four the
        -- search filter can match (D5). Deduping happens on identity below, so
        -- "React" in both skills and technologies counts the person once.
        SELECT r.identity, 'skill',
               CASE jsonb_typeof(s.elem)
                 WHEN 'string' THEN s.elem #>> '{}'
                 WHEN 'object' THEN s.elem ->> 'name'
               END
        FROM candidate_rows r
        CROSS JOIN LATERAL (
          VALUES (r.skills),
                 (r.metadata -> 'technologies'),
                 (r.metadata -> 'tools'),
                 (r.metadata -> 'domainExpertise')
        ) AS src(arr)
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(src.arr) = 'array' THEN src.arr ELSE '[]'::jsonb END
        ) AS s(elem)
      ),
      normalised AS (
        -- Truncate once, then lower, so the key and its display form can never
        -- be cut at different points of the same string.
        SELECT identity, facet_kind,
               left(btrim(raw), 120) AS display_value
        FROM facet_values
        WHERE raw IS NOT NULL AND btrim(raw) <> ''
      )
      INSERT INTO ${schema.recruitmentJobFacetCounts}
        (job_id, facet_kind, value, display_value, count, created_at, updated_at)
      SELECT ${jobId}::uuid,
             facet_kind,
             lower(display_value),
             min(display_value),
             count(DISTINCT identity)::int,
             ${now},
             ${now}
      FROM normalised
      GROUP BY facet_kind, lower(display_value)
    `;
  }
}
