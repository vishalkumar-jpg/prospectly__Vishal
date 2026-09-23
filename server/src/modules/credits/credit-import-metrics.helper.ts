import { Injectable, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { getSourceTypeVariantsForCreditRuleProvider } from "./credits.constants";

/**
 * Normalizes `contact_imports.provider` to the key used in `credit_rules.provider`.
 */
export function normalizeContactImportProviderKey(provider: string): string {
  return provider.trim().toLowerCase();
}

type ExecuteRows<T> = T[] | { rows: T[] };

function rowsFromExecute<T>(result: ExecuteRows<T>): T[] {
  return Array.isArray(result) ? result : result.rows || [];
}

@Injectable()
export class CreditImportMetricsHelper {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Distinct contacts linked to the user whose **first** `contact_import_snapshots` row
   * on that relationship matches one of the provider's source types (first-snapshot-wins
   * across providers on the same relationship).
   */
  private async countDistinctContactsFromFirstSnapshotMatch(
    dbOrTx: PostgresJsDatabase<typeof schema>,
    userId: string,
    sourceTypeVariants: string[]
  ): Promise<number> {
    if (sourceTypeVariants.length === 0) {
      return 0;
    }

    const inList = sql.join(
      sourceTypeVariants.map((s) => sql`${s}`),
      sql`, `
    );

    const result = await dbOrTx.execute(
      sql`
        WITH ranked AS (
          SELECT
            cr.contact_id AS contact_id,
            cis.source_type AS source_type,
            ROW_NUMBER() OVER (
              PARTITION BY cis.relationship_id
              ORDER BY cis.created_at ASC NULLS LAST, cis.id ASC
            ) AS rn
          FROM ${schema.contactRelationships} cr
          INNER JOIN ${schema.contactImportSnapshots} cis
            ON cis.relationship_id = cr.id
          INNER JOIN ${schema.contacts} c
            ON c.id = cr.contact_id
            AND c.deleted_at IS NULL
          WHERE cr.user_id = ${userId}
        )
        SELECT count(DISTINCT contact_id)::int AS cnt
        FROM ranked
        WHERE rn = 1 AND source_type IN (${inList})
      `
    );

    const rows = rowsFromExecute<Record<string, unknown>>(
      result as unknown as ExecuteRows<Record<string, unknown>>
    );
    const raw = rows[0]?.cnt;
    return Number(raw ?? 0);
  }

  /**
   * Credit threshold progress from **`contact_relationships` + `contact_import_snapshots` only**
   * (first snapshot per relationship). Providers without snapshot mappings return **0**.
   */
  async getCreditEligibleImportedContactCount(
    dbOrTx: PostgresJsDatabase<typeof schema>,
    userId: string,
    provider: string
  ): Promise<number> {
    const key = normalizeContactImportProviderKey(provider);
    const variants = getSourceTypeVariantsForCreditRuleProvider(key);

    if (!variants?.length) {
      return 0;
    }

    return this.countDistinctContactsFromFirstSnapshotMatch(
      dbOrTx,
      userId,
      variants
    );
  }

  /** Same as {@link getCreditEligibleImportedContactCount} using the root `db` (e.g. rules UI). */
  getCumulativeImportedForUserProvider(
    userId: string,
    provider: string
  ): Promise<number> {
    return this.getCreditEligibleImportedContactCount(
      this.db,
      userId,
      provider
    );
  }
}
