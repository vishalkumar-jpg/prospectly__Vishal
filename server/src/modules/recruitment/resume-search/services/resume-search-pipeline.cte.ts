import { sql, type SQL } from "drizzle-orm";
import type { ResumeSearchScope } from "../resume-search.scope";

/**
 * The only tenancy boundary in this query. Every other CTE reads `FROM
 * pipeline`, so whatever this returns is the entire universe of the search —
 * including the coverage counts, which is why they come out scope-relative
 * without any extra work.
 *
 * Column contract, which every other CTE in the query depends on:
 * `(row_id, row_kind, embedding, search_vector, skills, metadata, total_years_exp)`.
 */
export function buildPipelineCte(scope: ResumeSearchScope): SQL {
  // Handled first: workspace scope has no single `jobId`, so every expression
  // below would be a type error on it. Its columns are a strict superset of the
  // contract above — `row_id` stays the freshest candidacy's uuid, and dedup
  // runs on an `identity` key that never leaves this function, so the ranking,
  // condition and matched-on CTEs compile and behave unchanged (ADR-005 §2).
  if (scope.kind === "workspace") return buildWorkspacePipelineCte(scope);

  // A connector sees a candidate only through the mapping table, which is the
  // same ownership rule the connector board itself uses — a join, not a
  // filter, because a candidate can have several connectors attached.
  const connectorJoin =
    scope.kind === "connector"
      ? sql`
      JOIN prospectly.recruitment_candidate_connectors cc
        ON cc.candidate_id = jc.id
       AND cc.connector_user_id = ${scope.connectorUserId}
       AND cc.deleted_at IS NULL`
      : sql``;

  const referred = sql`
      SELECT jc.id AS row_id,
             'candidate'::text AS row_kind,
             si.embedding,
             si.search_vector,
             cr.skills,
             cr.metadata,
             cr.total_years_exp
      FROM prospectly.recruitment_job_candidates jc
      ${connectorJoin}
      LEFT JOIN LATERAL (
        SELECT r.id, r.skills, r.metadata, r.total_years_exp
        FROM prospectly.contact_resumes r
        WHERE (
                r.candidate_id = jc.id
                OR (r.candidate_id IS NULL AND r.contact_id = jc.contact_id)
              )
          AND r.deleted_at IS NULL
        ORDER BY r.updated_at DESC
        LIMIT 1
      ) cr ON TRUE
      LEFT JOIN prospectly.contact_resume_search si
        ON si.contact_resume_id = cr.id
       AND si.deleted_at IS NULL
      WHERE jc.job_id = ${scope.jobId}
        AND jc.deleted_at IS NULL`;

  if (scope.kind === "job") return referred;

  /**
   * A pool match is a contact the connector put forward before anyone
   * consented, so there is no candidate row yet and the resume has to be
   * reached through the contact. Without this half, a search would silently
   * empty the four pre-referral columns, which is most of a connector's board.
   */
  const pool = sql`
      SELECT pm.id AS row_id,
             'pool_match'::text AS row_kind,
             si.embedding,
             si.search_vector,
             cr.skills,
             cr.metadata,
             cr.total_years_exp
      FROM prospectly.recruitment_job_pool_matches pm
      LEFT JOIN LATERAL (
        SELECT r.id, r.skills, r.metadata, r.total_years_exp
        FROM prospectly.contact_resumes r
        WHERE r.contact_id = pm.contact_id
          AND r.deleted_at IS NULL
        ORDER BY r.updated_at DESC
        LIMIT 1
      ) cr ON TRUE
      LEFT JOIN prospectly.contact_resume_search si
        ON si.contact_resume_id = cr.id
       AND si.deleted_at IS NULL
      WHERE pm.job_id = ${scope.jobId}
        AND pm.connector_user_id = ${scope.connectorUserId}
        AND pm.deleted_at IS NULL`;

  return sql`${referred} UNION ALL ${pool}`;
}

/**
 * Cross-job scope: every candidate on every posting the recruiter can access,
 * one row per person rather than one per candidacy.
 *
 * Three stages, and the order matters:
 *  1. `workspace_rows` applies the scope predicate and joins everything, one row
 *     per (person, in-scope posting). Structured filters are pushed down to here
 *     by the caller — filtering after ranking is the classic failure of this
 *     design and will miss the budget.
 *  2. `person_agg` collapses each person's postings into sets. The LATERAL that
 *     flattens `countries` multiplies rows, which is why `posting_count` counts
 *     DISTINCT job_id — `count(*)` here would be inflated by that join.
 *  3. `pipeline` picks the freshest candidacy per identity and joins the
 *     aggregates back on, publishing the extended contract.
 *
 * `jobIds` is never empty here: the resolver short-circuits an empty set before
 * reaching SQL, because `= ANY('{}')` matches nothing but reads like a bug.
 *
 * Unlike the other two branches this returns a full `WITH … SELECT`, not a bare
 * SELECT, and callers embed it inside `WITH pipeline AS MATERIALIZED ( … )`.
 * A CTE body is a SELECT statement and a SELECT may carry its own WITH, so the
 * nesting is valid — but it is unusual enough that anyone editing either side
 * should know it is deliberate rather than an accident.
 */
function buildWorkspacePipelineCte(
  scope: Extract<ResumeSearchScope, { kind: "workspace" }>
): SQL {
  const jobIds = sql`ARRAY[${sql.join(
    scope.jobIds.map((id) => sql`${id}::uuid`),
    sql`, `
  )}]`;

  return sql`
    WITH workspace_rows AS (
      SELECT
        -- Identity, not row_id: a person on three postings is one result. The
        -- prefix keeps the two id spaces from ever colliding.
        coalesce('c:' || jc.contact_id::text, 'u:' || jc.candidate_user_id::text)
          AS identity,
        jc.id           AS candidacy_id,
        jc.job_id,
        jc.stage_id,
        jc.created_at   AS applied_at,
        jc.updated_at,
        jc.contact_id,
        jc.candidate_user_id,
        jc.resume_media_id,
        m.file_path     AS resume_file_path,
        rs.stage_key,
        j.work_type,
        j.employment_type,
        j.industry_id,
        j.countries,
        cr.job_title,
        cr.skills,
        cr.metadata,
        cr.total_years_exp,
        cr.education_level,
        ct.first_name,
        ct.last_name,
        ct.email,
        ct.title   AS contact_title,
        ct.company AS contact_company,
        ct.city,
        ct.state,
        ct.country AS contact_country,
        ct.source,
        si.embedding,
        si.search_vector
      FROM prospectly.recruitment_job_candidates jc
      JOIN prospectly.recruitment_jobs j
        ON j.id = jc.job_id
       AND j.deleted_at IS NULL
      LEFT JOIN prospectly.contacts ct
        ON ct.id = jc.contact_id
       AND ct.deleted_at IS NULL
      LEFT JOIN prospectly.media m
        ON m.id = jc.resume_media_id
       AND m.deleted_at IS NULL
       AND m.file_path IS NOT NULL
       AND m.file_path != ''
      LEFT JOIN prospectly.recruitment_stages rs
        ON rs.id = jc.stage_id
      LEFT JOIN LATERAL (
        SELECT r.id, r.job_title, r.skills, r.metadata,
               r.total_years_exp, r.education_level
        FROM prospectly.contact_resumes r
        WHERE (
                r.candidate_id = jc.id
                OR (r.candidate_id IS NULL AND r.contact_id = jc.contact_id)
              )
          AND r.deleted_at IS NULL
        ORDER BY r.updated_at DESC
        LIMIT 1
      ) cr ON TRUE
      LEFT JOIN prospectly.contact_resume_search si
        ON si.contact_resume_id = cr.id
       AND si.deleted_at IS NULL
      WHERE jc.job_id = ANY(${jobIds})
        AND jc.deleted_at IS NULL
        -- A row with neither id cannot be deduplicated and is a data defect.
        -- Excluded rather than crashed on; the service logs the count.
        AND (jc.contact_id IS NOT NULL OR jc.candidate_user_id IS NOT NULL)
    ),
    person_agg AS (
      SELECT
        w.identity,
        array_agg(DISTINCT w.job_id)                                   AS job_ids,
        array_agg(DISTINCT w.stage_id)
          FILTER (WHERE w.stage_id IS NOT NULL)                        AS stage_ids,
        array_agg(DISTINCT w.work_type)
          FILTER (WHERE w.work_type IS NOT NULL)                       AS work_types,
        array_agg(DISTINCT w.employment_type)
          FILTER (WHERE w.employment_type IS NOT NULL)                 AS employment_types,
        array_agg(DISTINCT w.industry_id)
          FILTER (WHERE w.industry_id IS NOT NULL)                     AS industry_ids,
        array_agg(DISTINCT cc.code)
          FILTER (WHERE cc.code IS NOT NULL)                           AS country_codes,
        min(w.applied_at)                                              AS applied_at,
        count(DISTINCT w.job_id)::int                                  AS posting_count
      FROM workspace_rows w
      LEFT JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(w.countries) = 'array'
             THEN w.countries ELSE '[]'::jsonb END
      ) AS cc(code) ON TRUE
      GROUP BY w.identity
    ),
    person_apps AS (
      SELECT
        w.identity,
        jsonb_agg(
          jsonb_build_object(
            'id', w.candidacy_id,
            'jobId', w.job_id,
            'stageId', w.stage_id
          )
          ORDER BY w.updated_at DESC, w.candidacy_id
        ) AS applications
      FROM workspace_rows w
      GROUP BY w.identity
    )
    SELECT DISTINCT ON (w.identity)
           w.candidacy_id      AS row_id,
           'candidate'::text   AS row_kind,
           w.embedding,
           w.search_vector,
           w.skills,
           w.metadata,
           w.total_years_exp,
           w.contact_id,
           w.candidate_user_id,
           w.stage_id,
           coalesce(w.job_title, w.contact_title)          AS current_title,
           coalesce(w.metadata->>'currentEmployer', w.contact_company) AS company,
           coalesce(nullif(w.metadata->>'location', ''),
                    nullif(concat_ws(', ', w.city, w.state), '')) AS location,
           w.contact_country,
           w.education_level,
           w.source,
           (w.resume_file_path IS NOT NULL AND coalesce(w.stage_key, '') != 'processing') AS has_resume,
           -- Identity comes from the CRM record, never the search index: PII is
           -- stripped before indexing, so the index has no name to give.
           nullif(btrim(concat_ws(' ', w.first_name, w.last_name)), '')
             AS candidate_name,
           w.email,
           a.job_ids,
           a.stage_ids,
           a.work_types,
           a.employment_types,
           a.industry_ids,
           a.country_codes,
           a.applied_at,
           a.posting_count,
           pa.applications
    FROM workspace_rows w
    JOIN person_agg a ON a.identity = w.identity
    JOIN person_apps pa ON pa.identity = w.identity
    ORDER BY w.identity, w.updated_at DESC`;
}
