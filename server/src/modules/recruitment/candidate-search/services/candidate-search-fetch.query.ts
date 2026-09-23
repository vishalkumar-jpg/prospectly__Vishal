import { sql, type SQL } from "drizzle-orm";
import { buildPipelineCte } from "modules/recruitment/resume-search/services/resume-search-pipeline.cte";
import type { ResumeSearchScope } from "modules/recruitment/resume-search/resume-search.scope";
import { CANDIDATE_SEARCH_MAX_SCORED_ROWS } from "../candidate-search.constants";

/** Filtered pipeline rows plus scope coverage columns. */
export function buildFetchFilteredQuery(
  scope: ResumeSearchScope,
  where: SQL,
  limit = CANDIDATE_SEARCH_MAX_SCORED_ROWS + 1
): ReturnType<typeof sql> {
  return sql`
    WITH pipeline AS MATERIALIZED (
      ${buildPipelineCte(scope)}
    ),
    coverage AS (
      SELECT count(*)::int                                              AS total_count,
             count(*) FILTER (WHERE search_vector IS NOT NULL)::int     AS indexed_count,
             count(*) FILTER (WHERE total_years_exp IS NOT NULL)::int   AS years_count,
             count(*) FILTER (WHERE education_level IS NOT NULL)::int AS education_count
      FROM pipeline
    ),
    filtered AS (
      SELECT * FROM pipeline${where}
      ORDER BY row_id
      LIMIT ${limit}
    )
    SELECT f.row_id, f.contact_id, f.candidate_user_id,
           f.candidate_name, f.email,
           f.current_title, f.company, f.location, f.contact_country,
           f.total_years_exp, f.education_level, f.source,
           f.skills, f.metadata,
           (f.search_vector IS NOT NULL) AS has_searchable_text,
           f.job_ids, f.stage_ids, f.stage_id, f.applications,
           f.work_types, f.employment_types, f.industry_ids, f.country_codes,
           f.applied_at, f.posting_count, f.has_resume,
           c.total_count, c.indexed_count, c.years_count, c.education_count
    FROM coverage c
    LEFT JOIN filtered f ON TRUE
    ORDER BY f.row_id NULLS LAST
  `;
}

export function buildCountFilteredQuery(
  scope: ResumeSearchScope,
  where: SQL
): ReturnType<typeof sql> {
  return sql`
    WITH pipeline AS MATERIALIZED (
      ${buildPipelineCte(scope)}
    )
    SELECT count(*)::int AS total FROM pipeline${where}
  `;
}
