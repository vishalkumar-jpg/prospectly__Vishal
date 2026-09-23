import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, isNotNull, eq } from "drizzle-orm";

import { AccountDeletionService } from "./account-deletion.service";

/** Fallback when BullMQ is disabled: processes rows whose scheduled time has passed. */
@Injectable()
export class AccountDeletionCronService {
  private readonly logger = new Logger(AccountDeletionCronService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly accountDeletionService: AccountDeletionService
  ) {}

  /** Runs every day at 9 AM IST. */
  @Cron("0 0 9 * * *", {
    timeZone: "Asia/Kolkata",
  })
  async processDueAccountDeletions(): Promise<void> {
    this.logger.log(
      "ACCOUNT_DELETION_CRON :: Starting scheduled daily account deletion job..."
    );

    const due = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .innerJoin(
        schema.userConfigurations,
        eq(schema.users.id, schema.userConfigurations.userId)
      )
      .where(
        and(
          isNotNull(schema.userConfigurations.accountDeletionRequestedAt),
          isNotNull(schema.userConfigurations.accountDeletionScheduledAt)
        )
      );

    if (due.length === 0) {
      this.logger.log(
        "ACCOUNT_DELETION_CRON :: No pending account deletions found. Job complete."
      );
      return;
    }

    this.logger.log(
      `ACCOUNT_DELETION_CRON :: Identified ${due.length} user(s) for permanent deletion.`
    );

    let processedCount = 0;
    for (const row of due) {
      try {
        this.logger.log(
          `ACCOUNT_DELETION_CRON :: [User: ${row.id}] Initiating permanent data purge...`
        );
        await this.accountDeletionService.purgeUserData(row.id);
        this.logger.log(
          `ACCOUNT_DELETION_CRON :: [User: ${row.id}] Data purge completed successfully.`
        );
        processedCount++;
      } catch (e) {
        this.logger.error(
          `ACCOUNT_DELETION_CRON :: [User: ${row.id}] Purge failed :: ${
            e instanceof Error ? e.message : e
          }`
        );
      }
    }

    this.logger.log(
      `ACCOUNT_DELETION_CRON :: Daily account deletion job finished. ${processedCount} of ${due.length} users successfully removed.`
    );
  }
}
