import { sql, type SQL } from "drizzle-orm";
import type { ResumeSearchConstraint } from "./resume-search-plan";

/**
 * Evaluates every hard requirement per candidate as a tri-state. "Unknown" is
 * kept distinct from "missing" throughout: an unindexed resume or an
 * unextracted years figure is an absence of evidence, and reporting it as a
 * failed requirement would blame the candidate for our own gap.
 *
 * Skills are checked against search_vector rather than the structured skills
 * array, because that array is an extraction summary and routinely omits
 * technologies the resume clearly mentions.
 */
export function buildConditionCtes(
  constraints: ResumeSearchConstraint[],
  minYears: number | null
): SQL {
  if (constraints.length === 0 && minYears === null) {
    return sql`
    gated AS (
      SELECT NULL::uuid AS row_id, NULL::jsonb AS conditions,
             0::int AS met_count, false AS all_met
      WHERE false
    ),`;
  }

  const skillConditions =
    constraints.length > 0
      ? sql`
      SELECT p.row_id, c.idx, c.label,
             CASE WHEN p.search_vector IS NULL  THEN 'unknown'
                  WHEN p.search_vector @@ c.tsq THEN 'met'
                  ELSE 'missing' END AS state
      FROM pipeline p
      CROSS JOIN constraints c`
      : sql`
      SELECT NULL::uuid AS row_id, 0 AS idx, ''::text AS label,
             ''::text AS state
      WHERE false`;

  // Sorts after every skill: `constraints` is WITH ORDINALITY, so those are
  // 1..N. `idx` is only the ORDER BY inside the jsonb_agg below, and the
  // top-level constraints echo in the service appends years last — a
  // hardcoded 0 here would put it first and contradict that order.
  const yearsCondition =
    minYears === null
      ? sql``
      : sql`
      UNION ALL
      SELECT p.row_id, ${constraints.length + 1}::int,
             ${`${minYears}+ years experience`},
             CASE WHEN p.total_years_exp IS NULL          THEN 'unknown'
                  WHEN p.total_years_exp >= ${minYears}   THEN 'met'
                  ELSE 'missing' END
      FROM pipeline p`;

  return sql`
    constraints AS (
      SELECT t.ord::int AS idx,
             t.c->>'label' AS label,
             websearch_to_tsquery('english', t.c->>'expr') AS tsq
      FROM jsonb_array_elements(${JSON.stringify(constraints)}::jsonb)
           WITH ORDINALITY AS t(c, ord)
    ),
    cond AS (
      ${skillConditions}
      ${yearsCondition}
    ),
    gated AS (
      SELECT row_id,
             jsonb_agg(
               jsonb_build_object('label', label, 'state', state) ORDER BY idx
             ) AS conditions,
             count(*) FILTER (WHERE state = 'met')::int AS met_count,
             bool_and(state = 'met') AS all_met
      FROM cond
      GROUP BY row_id
    ),`;
}

/**
 * When constrained, the requirement set decides who is returned and fusion
 * only orders them — so this drives off `gated`, not `fused`. Driving off
 * `fused` would silently drop a candidate who meets every requirement but
 * happens not to appear in either ranking branch.
 */
export function buildResultRowsCte(constrained: boolean): SQL {
  if (!constrained) {
    return sql`
    result_rows AS (
      SELECT f.row_id, f.vector_rank, f.keyword_rank,
             NULL::jsonb AS conditions, 0::int AS met_count,
             true AS all_met
      FROM fused f
    )`;
  }

  return sql`
    result_rows AS (
      SELECT g.row_id, f.vector_rank, f.keyword_rank,
             g.conditions, g.met_count, g.all_met
      FROM gated g
      LEFT JOIN fused f ON f.row_id = g.row_id
      WHERE g.met_count > 0
    )`;
}
