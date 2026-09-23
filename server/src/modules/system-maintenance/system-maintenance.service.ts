import { Injectable } from "@nestjs/common";
// import { DRIZZLE_TOKEN } from "database/drizzle.provider";
// import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
// import * as schema from "database/schema";
// import { PgTable } from "drizzle-orm/pg-core";
// import { getTableName, Table, ne } from "drizzle-orm";
// import { SYSTEM_MAINTENANCE_MESSAGES } from "./system-maintenance.constants";

@Injectable()
export class SystemMaintenanceService {
  // private readonly logger = new Logger(SystemMaintenanceService.name);
  // constructor(
  //   @Inject(DRIZZLE_TOKEN)
  //   private readonly db: PostgresJsDatabase<typeof schema>
  // ) {}
  /**
   * Deletes all data from the database except for:
   * 1. Seeded tables (bountyStages, creditRules, emailTemplates, trustScoreRules, referralConfiguration)
   * 2. Subscription Plan tables (subscriptionPlan, subscriptionPlanPrice)
   */
  // async cleanDatabase() {
  //   this.logger.log(SYSTEM_MAINTENANCE_MESSAGES.CLEANUP_START);
  //   const start = Date.now();
  //   try {
  //     await this.db.transaction(async (tx) => {
  //       // Define tables that should NOT be touched at all
  //       const preservedTables = new Set<Table>([
  //         schema.bountyStages,
  //         schema.creditRulesSchema,
  //         schema.emailTemplateSchema,
  //         schema.trustScoreRules,
  //         schema.referralConfigurationSchema,
  //         schema.subscriptionPlan,
  //         schema.subscriptionPlanPrice,
  //       ]);
  //       // 1. Iterate over exported schema keys
  //       for (const key in schema) {
  //         const table = (schema as AnyType)[key];
  //         // Check if it is a PgTable and not in preserved list
  //         if (table instanceof PgTable && !preservedTables.has(table)) {
  //           // Check if table name is valid (sanity check)
  //           const tableName = getTableName(table);
  //           if (!tableName) continue;
  //           // Log specifically for users table as it's the root of much data
  //           if (tableName === "users") {
  //             this.logger.log(SYSTEM_MAINTENANCE_MESSAGES.DELETING_USERS);
  //             await tx
  //               .delete(table)
  //               .where(ne(schema.users.type, "super_admin"));
  //           } else {
  //             // DELETE ALL data from this table
  //             await tx.delete(table);
  //           }
  //         }
  //       }
  //     });
  //     const duration = Date.now() - start;
  //     this.logger.log(
  //       `${SYSTEM_MAINTENANCE_MESSAGES.CLEANUP_COMPLETED} ${duration}ms`
  //     );
  //     return {
  //       success: true,
  //       message: SYSTEM_MAINTENANCE_MESSAGES.CLEANUP_SUCCESS,
  //       duration: `${duration}ms`,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `${SYSTEM_MAINTENANCE_MESSAGES.CLEANUP_FAILED} ${error}`
  //     );
  //     throw error;
  //   }
  // }
}
