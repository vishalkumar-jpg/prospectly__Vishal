import { sql, type SQL } from "drizzle-orm";
import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import type { SearchQueryParse } from "../criteria/candidate-search-query-parse";
import {
  buildSkillQueryPredicate,
  buildStructuredQueryPredicates,
} from "./candidate-search-query-filters";
import { buildCountryLocationPredicate } from "../criteria/candidate-search-country-location";

/**
 * How the free-text box is applied after structured query parsing.
 *
 * When `identityOnly` is true the resume FTS / semantic union is omitted so a
 * bare name, title or company does not pull lookalikes. Structured tokens are
 * always AND-ed separately in mixed queries.
 */
export interface QueryFilterContext {
  nameTokens: string[];
  titleTokens: string[];
  companyTokens: string[];
  nameAlternatives: string[][];
  skillAlternatives: string[][];
  requiredSkills: string[];
  semanticIntent: string | null;
  identityOnly: boolean;
  /** FTS and name-ILIKE text; remainder when mixed, else the raw query. */
  queryText: string | null;
}

function overlapText(column: string, values: string[]): SQL | null {
  if (values.length === 0) return null;
  return sql`${sql.raw(column)}::text[] && ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  )}]::text[]`;
}

function overlapInt(column: string, values: number[]): SQL | null {
  if (values.length === 0) return null;
  return sql`${sql.raw(column)} && ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  )}]::int[]`;
}

function anyOfText(column: string, values: string[]): SQL | null {
  if (values.length === 0) return null;
  return sql`lower(${sql.raw(column)}) = ANY(ARRAY[${sql.join(
    values.map((v) => sql`${v.toLowerCase()}`),
    sql`, `
  )}]::text[])`;
}

function textMatchesAny(values: string[]): SQL | null {
  if (values.length === 0) return null;

  const matches = values.map((value) => {
    const term = value.includes(" ") ? `"${value.replace(/"/g, "")}"` : value;
    return sql`search_vector @@ websearch_to_tsquery('english', ${term})`;
  });

  return sql`(${sql.join(matches, sql` OR `)})`;
}

export function buildStructuredFilters(
  criteria: NormalisedCriteria,
  retrievedRowIds: readonly string[] = [],
  queryContext?: QueryFilterContext
): SQL[] {
  const parse: SearchQueryParse = {
    nameTokens: queryContext?.nameTokens ?? [],
    titleTokens: queryContext?.titleTokens ?? [],
    companyTokens: queryContext?.companyTokens ?? [],
    nameAlternatives: queryContext?.nameAlternatives ?? [],
    skillAlternatives: queryContext?.skillAlternatives ?? [],
    requiredSkills: queryContext?.requiredSkills ?? [],
    semanticIntent: queryContext?.semanticIntent ?? null,
    remainder: null,
  };
  const identityOnly = queryContext?.identityOnly ?? false;
  const queryText =
    queryContext !== undefined ? queryContext.queryText : criteria.query;

  const predicates: Array<SQL | null> = [
    textMatchesAny(criteria.skills),
    ...buildStructuredQueryPredicates(parse, identityOnly),

    !identityOnly
      ? buildSkillQueryPredicate(parse, retrievedRowIds, queryText)
      : null,

    criteria.jobIds.length > 0
      ? sql`job_ids && ARRAY[${sql.join(
          criteria.jobIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[]`
      : null,

    overlapInt("stage_ids", criteria.stageIds),
    overlapInt("industry_ids", criteria.industryIds),
    overlapText("work_types", criteria.workModes),
    overlapText("employment_types", criteria.employmentTypes),
    buildCountryLocationPredicate(criteria.countries),

    anyOfText("current_title", criteria.titles),
    anyOfText("company", criteria.companies),
    anyOfText("education_level", criteria.educationLevels),
    anyOfText("source", criteria.sources),

    criteria.location ? sql`location ILIKE ${`%${criteria.location}%`}` : null,

    criteria.experienceMin !== null
      ? sql`total_years_exp >= ${criteria.experienceMin}`
      : null,
    criteria.experienceMax !== null
      ? sql`total_years_exp <= ${criteria.experienceMax}`
      : null,

    criteria.appliedFrom
      ? sql`applied_at >= ${criteria.appliedFrom}::timestamptz`
      : null,
    criteria.appliedTo
      ? sql`applied_at < (${criteria.appliedTo}::date + interval '1 day')`
      : null,
  ];

  return predicates.filter((predicate): predicate is SQL => predicate !== null);
}

export function combineFilters(predicates: SQL[]): SQL {
  if (predicates.length === 0) return sql``;
  return sql` WHERE ${sql.join(predicates, sql` AND `)}`;
}
