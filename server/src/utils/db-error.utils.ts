/**
 * Drizzle wraps driver errors in a DrizzleQueryError whose own message is the
 * entire SQL statement plus every bound parameter — for a query carrying an
 * embedding that is hundreds of lines of floats with the real error nowhere in
 * it. The actual cause hangs off `error.cause`.
 *
 * Use this instead of interpolating the error directly when logging a failure
 * from `db.execute(sql\`...\`)`.
 */
export function describeDbError(error: unknown): string {
  const cause = (error as { cause?: unknown } | null)?.cause;

  if (cause instanceof Error) {
    const { code } = cause as Error & { code?: string };
    return code ? `${cause.message} [${code}]` : cause.message;
  }

  return error instanceof Error ? error.message : String(error);
}
