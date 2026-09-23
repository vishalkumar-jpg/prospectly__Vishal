/* eslint-disable no-console */
import "dotenv/config";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

/** Match `database/drizzle.provider.ts` so behavior matches the running app. */
function connectionStringWithSearchPath(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}search_path=prospectly`;
}

function rowsFromExecute<T extends Record<string, unknown>>(
  result: unknown
): T[] {
  if (Array.isArray(result)) return result as T[];
  const boxed = result as { rows?: T[] };
  return boxed.rows ?? [];
}

async function bootstrap() {
  console.log("Starting contact import backfill script...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sqlClient = postgres(
    connectionStringWithSearchPath(process.env.DATABASE_URL),
    {
      max: 1,
    }
  );
  const db = drizzle(sqlClient);

  try {
    await db.execute(sql`SELECT 1 AS ok`);
    console.log("✅ Database connection verified");

    const totalUsers = await db.execute(sql`
      SELECT COUNT(*)::text AS count
      FROM prospectly.users;
    `);
    console.log(
      "📊 Total users:",
      rowsFromExecute<{ count: string }>(totalUsers)[0]?.count
    );

    const usersWithImports = await db.execute(sql`
      SELECT COUNT(DISTINCT ci.user_id)::text AS count
      FROM prospectly.contact_imports ci;
    `);
    console.log(
      "📊 Users WITH contact imports:",
      rowsFromExecute<{ count: string }>(usersWithImports)[0]?.count
    );

    const usersWithoutImports = await db.execute(sql`
      SELECT COUNT(*)::text AS count
      FROM prospectly.users u
      WHERE NOT EXISTS (
        SELECT 1
        FROM prospectly.contact_imports ci
        WHERE ci.user_id = u.id
      );
    `);
    console.log(
      "📊 Users WITHOUT contact imports:",
      rowsFromExecute<{ count: string }>(usersWithoutImports)[0]?.count
    );

    const updateResult = await db.execute(sql`
      UPDATE prospectly.user_configurations uc
      SET
        has_imported_contacts = EXISTS (
          SELECT 1 FROM prospectly.contact_imports ci
          WHERE ci.user_id = uc.user_id
        ),
        last_reminder_sent_at = NULL
      WHERE EXISTS (
        SELECT 1 FROM prospectly.users u
        WHERE u.id = uc.user_id
      );
    `);

    const affected =
      Array.isArray(updateResult) && "count" in updateResult
        ? Number((updateResult as { count: number | string }).count)
        : null;
    console.log("✅ Updated rows:", affected ?? updateResult);

    console.log("🎉 Contact import backfill completed successfully");

    await sqlClient.end({ timeout: 5 });
    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill script failed:", error);

    await sqlClient.end({ timeout: 5 });
    process.exit(1);
  }
}

bootstrap();
