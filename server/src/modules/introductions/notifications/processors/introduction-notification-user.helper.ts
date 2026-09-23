import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

export type ActiveUserRow = {
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

export async function loadActiveUserRow(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<ActiveUserRow | null> {
  const [user] = await db
    .select({
      email: schema.users.email,
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        isNull(schema.users.deletedAt),
        eq(schema.users.isActive, true)
      )
    )
    .limit(1);

  const email = user?.email?.trim();
  if (!email) return null;
  return { ...user, email };
}
