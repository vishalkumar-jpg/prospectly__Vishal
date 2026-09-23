import { sql, type SQL } from "drizzle-orm";

/** Total refer attempts for a connector on a job (pool matches + in-flight uploads). */
export function buildMyReferCountSql(jobIdRef: SQL, userIdRef: SQL) {
  return sql<number>`(
    (
      SELECT COUNT(DISTINCT pm.contact_id)::int
      FROM prospectly.recruitment_job_pool_matches pm
      WHERE pm.job_id = ${jobIdRef}
        AND pm.connector_user_id = ${userIdRef}
        AND pm.deleted_at IS NULL
        AND pm.contact_id IS NOT NULL
    )
    + (
      SELECT COUNT(*)::int
      FROM prospectly.recruitment_upload_jobs uj
      WHERE uj.job_id = ${jobIdRef}
        AND uj.connector_user_id = ${userIdRef}
        AND uj.deleted_at IS NULL
        AND uj.pool_match_id IS NULL
    )
  )`;
}

/** Whether the connector has generated a marketplace share link for this job. */
export function buildHasSharedLinkSql(jobIdRef: SQL, userIdRef: SQL) {
  return sql<boolean>`EXISTS (
    SELECT 1
    FROM prospectly.recruitment_job_shares s
    WHERE s.job_id = ${jobIdRef}
      AND s.sharer_id = ${userIdRef}
      AND s.platform <> 'consent'
  )`;
}
