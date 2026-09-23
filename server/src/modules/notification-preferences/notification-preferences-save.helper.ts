import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "database/schema";
import { notificationCategories } from "database/schema/notification-categories.schema";
import { userNotificationPreferences } from "database/schema/user-notification-preferences.schema";
import { userConfigurations } from "database/schema/user-configurations";
import { toUTC } from "utils/dayjs";
import type { NotificationSendGateService } from "./notification-send-gate.service";
import {
  NOTIFICATION_PREFERENCES_MESSAGES,
  SUPPRESSION_REASONS,
  SUPPRESSION_SOURCES,
} from "./notification-preferences.constants";

type PrefsDb = PostgresJsDatabase<typeof schema>;

export async function applyRegisteredPreferences(
  db: PrefsDb,
  sendGate: NotificationSendGateService,
  userId: string,
  categories: { categoryId: string; enabled: boolean }[],
  unsubscribeAll?: boolean
) {
  if (unsubscribeAll === true) {
    await db
      .insert(userConfigurations)
      .values({ userId, isUserUnsubscribe: true })
      .onConflictDoUpdate({
        target: userConfigurations.userId,
        set: { isUserUnsubscribe: true, updatedAt: toUTC() },
      });
    return;
  }

  if (unsubscribeAll === false) {
    await db
      .insert(userConfigurations)
      .values({ userId, isUserUnsubscribe: false })
      .onConflictDoUpdate({
        target: userConfigurations.userId,
        set: { isUserUnsubscribe: false, updatedAt: toUTC() },
      });
  }

  for (const item of categories) {
    const [category] = await db
      .select()
      .from(notificationCategories)
      .where(eq(notificationCategories.id, item.categoryId))
      .limit(1);

    if (!category) {
      throw new NotFoundException(
        NOTIFICATION_PREFERENCES_MESSAGES.ERROR.CATEGORY_NOT_FOUND
      );
    }

    if (category.isMandatory && !item.enabled) {
      throw new BadRequestException(
        NOTIFICATION_PREFERENCES_MESSAGES.ERROR.MANDATORY_CATEGORY
      );
    }

    if (item.enabled) {
      await db
        .delete(userNotificationPreferences)
        .where(
          and(
            eq(userNotificationPreferences.userId, userId),
            eq(userNotificationPreferences.categoryId, item.categoryId)
          )
        );
      continue;
    }

    await db
      .insert(userNotificationPreferences)
      .values({
        userId,
        categoryId: item.categoryId,
        enabled: false,
      })
      .onConflictDoUpdate({
        target: [
          userNotificationPreferences.userId,
          userNotificationPreferences.categoryId,
        ],
        set: { enabled: false, updatedAt: toUTC() },
      });
  }
}

export async function applyNonRegisteredPreferences(
  sendGate: NotificationSendGateService,
  email: string,
  categories: { categoryId: string; enabled: boolean }[],
  unsubscribeAll?: boolean
) {
  const anyDisabled =
    unsubscribeAll === true || categories.some((c) => c.enabled === false);

  if (anyDisabled) {
    await sendGate.upsertSuppression(
      email,
      SUPPRESSION_REASONS.UNSUBSCRIBED,
      SUPPRESSION_SOURCES.LINK
    );
    return;
  }

  await sendGate.clearUnsubscribedSuppression(email);
}

export async function applyOneClickRegistered(
  db: PrefsDb,
  userId: string,
  categoryKey?: string
) {
  if (!categoryKey) {
    await db
      .insert(userConfigurations)
      .values({ userId, isUserUnsubscribe: true })
      .onConflictDoUpdate({
        target: userConfigurations.userId,
        set: { isUserUnsubscribe: true, updatedAt: toUTC() },
      });
    return;
  }

  const [category] = await db
    .select()
    .from(notificationCategories)
    .where(eq(notificationCategories.key, categoryKey))
    .limit(1);

  if (!category || category.isMandatory) return;

  await db
    .insert(userNotificationPreferences)
    .values({ userId, categoryId: category.id, enabled: false })
    .onConflictDoUpdate({
      target: [
        userNotificationPreferences.userId,
        userNotificationPreferences.categoryId,
      ],
      set: { enabled: false, updatedAt: toUTC() },
    });
}
