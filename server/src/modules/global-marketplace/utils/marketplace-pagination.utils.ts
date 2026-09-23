import { sql, SQL, and } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

export interface PaginationParams {
  page: string | undefined;
  limit: string | undefined;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export function calculatePagination(
  page?: string,
  limit?: string
): PaginationResult {
  const parsedPage = Number.parseInt(page ?? "1", 10);
  const parsedLimit = Number.parseInt(limit ?? "20", 10);
  const pageNum =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limitNumRaw =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const limitNum = Math.min(limitNumRaw, 50);
  const offset = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
}

export async function getTotalCount(
  db: PostgresJsDatabase<typeof schema>,
  conditions: SQL[]
): Promise<number> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.introductionRequests)
    .where(and(...conditions));

  return Number(countResult?.count ?? 0);
}
