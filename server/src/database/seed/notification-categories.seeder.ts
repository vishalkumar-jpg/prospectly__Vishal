import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { notificationCategories } from "database/schema/notification-categories.schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { NOTIFICATION_CATEGORY_SEED } from "modules/notification-preferences/notification-preferences.constants";

@Injectable()
export class NotificationCategoriesSeeder {
  private readonly logger = new Logger(NotificationCategoriesSeeder.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    for (const row of NOTIFICATION_CATEGORY_SEED) {
      const [existing] = await this.db
        .select({ id: notificationCategories.id })
        .from(notificationCategories)
        .where(eq(notificationCategories.key, row.key))
        .limit(1);

      if (existing) {
        await this.db
          .update(notificationCategories)
          .set({
            name: row.name,
            description: row.description,
            groupKey: row.groupKey,
            isMandatory: row.isMandatory,
            sortOrder: row.sortOrder,
            updatedAt: toUTC(),
          })
          .where(eq(notificationCategories.key, row.key));
        continue;
      }

      await this.db.insert(notificationCategories).values(row);
    }

    this.logger.log("Notification categories seeded");
  }
}
