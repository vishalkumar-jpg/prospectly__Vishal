import { sql, type SQL } from "drizzle-orm";
import { expandPunctuationQuery } from "modules/recruitment/resume-search/services";
import type { SearchQueryParse } from "../criteria/candidate-search-query-parse";
import { nameTokenPredicate } from "../criteria/candidate-search-name";
import {
  tokenPredicate,
  tokenPredicateOr,
} from "../criteria/candidate-search-token-predicate";

function titleTokenPredicate(tokens: readonly string[]): SQL | null {
  return tokenPredicate("current_title", tokens);
}

function companyTokenPredicate(tokens: readonly string[]): SQL | null {
  return tokenPredicate("company", tokens);
}

function nameAlternativesPredicate(
  alternatives: readonly (readonly string[])[],
  mixedQuery: boolean
): SQL | null {
  if (alternatives.length === 0) return null;

  const parts = alternatives
    .map((tokens) => {
      if (tokens.length === 0) return null;
      if (mixedQuery) return nameTokenPredicate(tokens);
      return tokenPredicateOr(
        ["candidate_name", "current_title", "company"],
        tokens
      );
    })
    .filter((part): part is SQL => part !== null);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return sql`(${sql.join(parts, sql` OR `)})`;
}

function queryTextTitleCompanyOr(queryText: string): SQL | null {
  const tokens = queryText.trim().split(/\s+/).filter(Boolean);
  return tokenPredicateOr(["current_title", "company"], tokens);
}

function ftsPredicate(queryText: string): SQL {
  return sql`search_vector @@ websearch_to_tsquery('english', ${expandPunctuationQuery(
    queryText
  )})`;
}

function requiredSkillsPredicate(skills: readonly string[]): SQL | null {
  if (skills.length === 0) return null;
  const parts = skills.map((skill) => {
    const term = skill.includes(" ") ? `"${skill.replace(/"/g, "")}"` : skill;
    return ftsPredicate(term);
  });
  return sql`(${sql.join(parts, sql` AND `)})`;
}

export function buildQueryTextPredicate(
  queryText: string,
  retrievedRowIds: readonly string[],
  titleCompanyOr: SQL | null
): SQL {
  const fts = ftsPredicate(queryText);
  const retrieved =
    retrievedRowIds.length > 0
      ? sql`row_id = ANY(ARRAY[${sql.join(
          retrievedRowIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[])`
      : null;

  const branches = [fts, retrieved, titleCompanyOr].filter(
    (branch): branch is SQL => branch !== null
  );

  return sql`(${sql.join(branches, sql` OR `)})`;
}

function skillAlternativesPredicate(
  alternatives: readonly (readonly string[])[],
  retrievedRowIds: readonly string[],
  titleCompanyOr: SQL | null
): SQL | null {
  if (alternatives.length === 0) return null;

  const parts = alternatives
    .map((tokens) => {
      const phrase = tokens.join(" ");
      if (!phrase) return null;
      return buildQueryTextPredicate(phrase, retrievedRowIds, titleCompanyOr);
    })
    .filter((part): part is SQL => part !== null);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return sql`(${sql.join(parts, sql` OR `)})`;
}

function identityOnlyPredicate(parse: SearchQueryParse): SQL | null {
  const hasNameAlts = parse.nameAlternatives.length > 0;
  const name = hasNameAlts
    ? nameAlternativesPredicate(parse.nameAlternatives, false)
    : nameTokenPredicate(parse.nameTokens);
  const title = titleTokenPredicate(parse.titleTokens);
  const company = companyTokenPredicate(parse.companyTokens);
  const populated = [name, title, company].filter(
    (predicate): predicate is SQL => predicate !== null
  );

  if (populated.length === 0) return null;
  if (
    populated.length === 1 &&
    name !== null &&
    parse.titleTokens.length === 0 &&
    parse.companyTokens.length === 0
  ) {
    return name;
  }

  return sql`(${sql.join(populated, sql` AND `)})`;
}

export function buildStructuredQueryPredicates(
  parse: SearchQueryParse,
  identityOnly: boolean
): SQL[] {
  if (identityOnly) {
    const identity = identityOnlyPredicate(parse);
    return identity ? [identity] : [];
  }

  const mixedQuery =
    parse.requiredSkills.length > 0 ||
    parse.skillAlternatives.length > 0 ||
    parse.remainder !== null;
  const name =
    parse.nameAlternatives.length > 0
      ? nameAlternativesPredicate(parse.nameAlternatives, mixedQuery)
      : nameTokenPredicate(parse.nameTokens);

  return [
    name,
    titleTokenPredicate(parse.titleTokens),
    companyTokenPredicate(parse.companyTokens),
  ].filter((predicate): predicate is SQL => predicate !== null);
}

export function buildSkillQueryPredicate(
  parse: SearchQueryParse,
  retrievedRowIds: readonly string[],
  queryText: string | null
): SQL | null {
  const required = requiredSkillsPredicate(parse.requiredSkills);
  const titleCompanyOr = queryText ? queryTextTitleCompanyOr(queryText) : null;

  let optional: SQL | null = null;
  if (parse.skillAlternatives.length > 0) {
    optional = skillAlternativesPredicate(
      parse.skillAlternatives,
      retrievedRowIds,
      titleCompanyOr
    );
  } else if (parse.requiredSkills.length === 0 && queryText) {
    optional = buildQueryTextPredicate(
      queryText,
      retrievedRowIds,
      titleCompanyOr
    );
  }

  const parts = [required, optional].filter(
    (part): part is SQL => part !== null
  );
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return sql`(${sql.join(parts, sql` AND `)})`;
}

export function buildQueryTextTitleCompanyOr(queryText: string): SQL | null {
  return queryTextTitleCompanyOr(queryText);
}
