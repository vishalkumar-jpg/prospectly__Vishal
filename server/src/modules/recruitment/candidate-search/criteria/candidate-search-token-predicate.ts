import { sql, type SQL } from "drizzle-orm";

/** Escape a token for use inside a Postgres regex literal. */
export function escapeRegex(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary match on a scalar column. `\m`/`\M` are Postgres word
 * boundaries — `sana` matches "Sana Ahmed" but not "Hosanna".
 */
export function tokenPredicate(
  column: string,
  tokens: readonly string[]
): SQL | null {
  if (tokens.length === 0) return null;

  const parts = tokens.map(
    (token) => sql`${sql.raw(column)} ~* ${`\\m${escapeRegex(token)}\\M`}`
  );

  return sql`(${sql.join(parts, sql` AND `)})`;
}

/** OR of the same token list across multiple columns. */
export function tokenPredicateOr(
  columns: readonly string[],
  tokens: readonly string[]
): SQL | null {
  if (tokens.length === 0) return null;

  const parts = columns
    .map((column) => tokenPredicate(column, tokens))
    .filter((part): part is SQL => part !== null);

  if (parts.length === 0) return null;
  return sql`(${sql.join(parts, sql` OR `)})`;
}
