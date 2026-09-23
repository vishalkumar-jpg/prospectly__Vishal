import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { emailSuppressions } from "database/schema/email-suppressions.schema";
import { notificationCategories } from "database/schema/notification-categories.schema";
import { userNotificationPreferences } from "database/schema/user-notification-preferences.schema";
import type { NotificationCategoryKey } from "./notification-preferences.constants";

export type SendGateResult = {
  allowed: boolean;
  reason?: "suppressed" | "global_unsubscribe" | "category_disabled";
};

@Injectable()
export class NotificationSendGateService {
  private readonly logger = new Logger(NotificationSendGateService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async isEmailSuppressed(email: string): Promise<boolean> {
    const normalized = this.normalizeEmail(email);
    const [row] = await this.db
      .select({ email: emailSuppressions.email })
      .from(emailSuppressions)
      .where(eq(emailSuppressions.email, normalized))
      .limit(1);
    return Boolean(row);
  }

  async canSendEmail(
    recipientEmail: string,
    categoryKey?: NotificationCategoryKey | null
  ): Promise<SendGateResult> {
    if (await this.isEmailSuppressed(recipientEmail)) {
      return { allowed: false, reason: "suppressed" };
    }

    if (!categoryKey) {
      return { allowed: true };
    }

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, this.normalizeEmail(recipientEmail)),
      with: { userConfiguration: true },
    });

    if (!user) {
      return { allowed: true };
    }

    const [category] = await this.db
      .select()
      .from(notificationCategories)
      .where(eq(notificationCategories.key, categoryKey))
      .limit(1);

    if (!category) {
      this.logger.warn(`Unknown notification category key: ${categoryKey}`);
      return { allowed: true };
    }

    if (category.isMandatory) {
      return { allowed: true };
    }

    const config = user.userConfiguration as
      | { isUserUnsubscribe?: boolean }
      | null
      | undefined;
    if (config?.isUserUnsubscribe) {
      return { allowed: false, reason: "global_unsubscribe" };
    }

    const [pref] = await this.db
      .select({ enabled: userNotificationPreferences.enabled })
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, user.id),
          eq(userNotificationPreferences.categoryId, category.id)
        )
      )
      .limit(1);

    if (pref && pref.enabled === false) {
      return { allowed: false, reason: "category_disabled" };
    }

    return { allowed: true };
  }

  async filterAllowedRecipients(
    emails: string[],
    categoryKey?: NotificationCategoryKey | null
  ): Promise<string[]> {
    const allowed: string[] = [];
    for (const email of emails) {
      const gate = await this.canSendEmail(email, categoryKey);
      if (gate.allowed) allowed.push(email);
    }
    return allowed;
  }

  async clearUnsubscribedSuppression(email: string): Promise<void> {
    const normalized = this.normalizeEmail(email);
    await this.db
      .delete(emailSuppressions)
      .where(
        and(
          eq(emailSuppressions.email, normalized),
          eq(emailSuppressions.reason, "unsubscribed")
        )
      );
  }

  async upsertSuppression(
    email: string,
    reason: string,
    source: string
  ): Promise<void> {
    const normalized = this.normalizeEmail(email);
    await this.db
      .insert(emailSuppressions)
      .values({ email: normalized, reason, source })
      .onConflictDoUpdate({
        target: emailSuppressions.email,
        set: {
          reason,
          source,
          createdAt: sql`now()`,
        },
      });
  }
}
