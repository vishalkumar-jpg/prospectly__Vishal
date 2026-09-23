import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, gt, isNull, sql } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { normalizeEducationLevel } from "modules/recruitment/resume-extraction/resume-education-level.normalizer";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { BACKFILL_EDUCATION_LEVEL_PAGE_SIZE } from "../backfill-education-level.constants";

export interface BackfillEducationLevelResult {
  scanned: number;
  updated: number;
}

/**
 * Fills `contact_resumes.education_level` for résumés parsed before the column
 * existed.
 *
 * Derives the value from `metadata.education[]`, which is already stored — no
 * re-extraction, so this costs a query rather than an AI call per résumé.
 *
 * Safe to run against a live database: it pages, holds no long transaction, and
 * writes a column nothing reads until the search filter uses it.
 */
@Injectable()
export class BackfillEducationLevelService {
  private readonly logger = new Logger(BackfillEducationLevelService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async run(force: boolean): Promise<BackfillEducationLevelResult> {
    // Keyset on the primary key, not OFFSET: the loop writes to the same rows it
    // is scanning, and an offset would skip rows as the filtered set shrinks.
    let cursor = "00000000-0000-0000-0000-000000000000";
    let scanned = 0;
    let updated = 0;

    for (;;) {
      const rows = await this.db
        .select({
          id: schema.contactResumes.id,
          metadata: schema.contactResumes.metadata,
        })
        .from(schema.contactResumes)
        .where(
          and(
            gt(schema.contactResumes.id, cursor),
            isNull(schema.contactResumes.deletedAt),
            force ? undefined : isNull(schema.contactResumes.educationLevel)
          )
        )
        .orderBy(schema.contactResumes.id)
        .limit(BACKFILL_EDUCATION_LEVEL_PAGE_SIZE);

      if (rows.length === 0) break;

      cursor = rows[rows.length - 1].id;
      scanned += rows.length;

      const assignments = rows
        .map((row) => ({
          id: row.id,
          level: normalizeEducationLevel(row.metadata),
        }))
        // Without force the query already selected only unset rows, so writing
        // null back would churn `updated_at` for nothing. With force it must be
        // written: a normaliser change can turn a classified résumé back into
        // "not stated", and skipping those would leave a stale level behind.
        .filter((row) => force || row.level !== null);

      if (assignments.length > 0) {
        const cases = sql.join(
          assignments.map(
            (row) => sql`WHEN ${row.id}::uuid THEN ${row.level}::varchar`
          ),
          sql` `
        );
        const ids = sql.join(
          assignments.map((row) => sql`${row.id}::uuid`),
          sql`, `
        );

        // ISO string, not the Date: inside a raw `sql` template drizzle
        // stringifies a Date with toString(), which yields a form Postgres
        // rejects outright.
        await this.db.execute(sql`
          UPDATE prospectly.contact_resumes
             SET education_level = CASE id ${cases} END,
                 updated_at = ${toUTC().toISOString()}::timestamptz
           WHERE id IN (${ids})
        `);
        updated += assignments.length;
      }

      this.logger.log(
        `BACKFILL_EDUCATION_LEVEL_SERVICE :: run : page : scanned=${scanned} updated=${updated}`
      );
    }

    this.logger.log(
      `BACKFILL_EDUCATION_LEVEL_SERVICE :: run : COMPLETE : scanned=${scanned} updated=${updated} force=${force}`
    );
    return { scanned, updated };
  }
}
