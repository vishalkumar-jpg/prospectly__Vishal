import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import type {
  JobLifecycleNotificationPrefs,
  JobLifecycleNotificationSelection,
} from "./job-lifecycle-notification-prefs.types";

export async function upsertJobLifecycleNotificationPrefs(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string,
  userId: string,
  patch: Partial<JobLifecycleNotificationPrefs>
): Promise<void> {
  const now = toUTC();
  const settings = schema.recruitmentJobSettingsSchema;

  const [existing] = await db
    .select({
      id: settings.id,
      notificationSnapshot: settings.notificationSnapshot,
    })
    .from(settings)
    .where(and(eq(settings.jobId, jobId), isNull(settings.deletedAt)))
    .limit(1);

  const current =
    (existing?.notificationSnapshot as JobLifecycleNotificationPrefs | null) ??
    {};

  const nextPrefs: JobLifecycleNotificationPrefs = {
    ...current,
    ...patch,
  };

  if (existing) {
    await db
      .update(settings)
      .set({
        notificationSnapshot: nextPrefs,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(settings.id, existing.id));
    return;
  }

  await db.insert(settings).values({
    jobId,
    notificationSnapshot: nextPrefs,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  });
}

export function buildLifecycleNotificationSelection(
  sendNotifications: boolean | undefined,
  candidateStageKeys: string[] | undefined
): JobLifecycleNotificationSelection {
  return {
    sendNotifications: sendNotifications === true,
    candidateStageKeys: candidateStageKeys ?? [],
  };
}
