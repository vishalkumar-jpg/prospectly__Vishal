import { Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { CreditImportAllocationService } from "modules/credits/credit-import-allocation.service";

const COMPLETED = "completed" as const;

export type BackfillCreditImportAllocationResult = {
  candidateCount: number;
  processedWithoutError: number;
  errors: number;
};

@Injectable()
export class BackfillCreditImportAllocationRunnerService {
  private readonly logger = new Logger(
    BackfillCreditImportAllocationRunnerService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly creditImportAllocationService: CreditImportAllocationService
  ) {}

  /**
   * One `contactsImportId` per `(userId, lower(provider))` (newest `completedAt`),
   * then runs the same allocation path as the post-import queue.
   */
  async runBackfill(): Promise<BackfillCreditImportAllocationResult> {
    const result = await this.db.execute(
      sql<{ id: string }>`
        SELECT DISTINCT ON (ci.user_id, lower(ci.provider))
          ci.id
        FROM prospectly.contact_imports ci
        WHERE ci.status = ${COMPLETED}
          AND ci.completed_at IS NOT NULL
          AND ci.user_id IS NOT NULL
        ORDER BY ci.user_id, lower(ci.provider), ci.completed_at DESC NULLS LAST
      `
    );

    const rows = Array.isArray(result)
      ? result
      : (result as { rows: { id: string }[] }).rows || [];

    const candidateCount = rows.length;
    let processedWithoutError = 0;
    let errors = 0;

    for (const row of rows) {
      const contactsImportId = String(row.id);
      try {
        await this.creditImportAllocationService.processCompletedImport(
          contactsImportId
        );
        processedWithoutError += 1;
      } catch (err) {
        errors += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `BACKFILL_CREDIT_IMPORT_ALLOCATION_RUNNER :: process : ERROR : contactsImportId=${contactsImportId} : ${message}`,
          err instanceof Error ? err.stack : undefined
        );
      }
    }

    this.logger.log(
      `BACKFILL_CREDIT_IMPORT_ALLOCATION_RUNNER :: done : candidateCount=${String(candidateCount)} processedWithoutError=${String(processedWithoutError)} errors=${String(errors)}`
    );

    return { candidateCount, processedWithoutError, errors };
  }
}
