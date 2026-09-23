import { normalizeResumeSearchQuery } from "modules/recruitment/resume-search/services/resume-search-query.normalizer";
import {
  emptyIfIdentityFiller,
  EXPLICIT_NAME,
  parseNameTokensFromRaw,
} from "./candidate-search-name";
import {
  buildStructuredRemainder,
  flattenNameAlternatives,
  parseBooleanQuery,
} from "./candidate-search-query-boolean";

export interface SearchQueryParse {
  nameTokens: string[];
  titleTokens: string[];
  companyTokens: string[];
  /** Text to rank and FTS against. `null` = identity-only. */
  remainder: string | null;
  /** OR groups of name tokens, e.g. [["vivek"], ["sitaram"]]. */
  nameAlternatives: string[][];
  /** OR groups of skill phrases, e.g. [["python"], ["java"]]. */
  skillAlternatives: string[][];
  /** Skills that must all match (AND). From AI intent or explicit AND skills. */
  requiredSkills: string[];
  /** Short phrase for embedding when AI separates intent from keywords. */
  semanticIntent: string | null;
}

const MAX_STRUCTURED_TOKENS = 4;

const STRUCTURED_TOKEN = /^[a-z0-9][a-z0-9.'&-]{0,49}$/i;

const EXPLICIT_COMPANY =
  /\b(?:at|from|@|company:|works\s+at)\s+([a-z0-9][a-z0-9.'&-]{0,49}(?:\s+[a-z0-9][a-z0-9.'&-]{0,49}){0,3})\s*$/i;

const EXPLICIT_TITLE =
  /\b(?:titled|title:|as\s+an?)\s+([a-z0-9][a-z0-9.'&-]{0,49}(?:\s+[a-z0-9][a-z0-9.'&-]{0,49}){0,3})\s*$/i;

function emptyParse(): SearchQueryParse {
  return {
    nameTokens: [],
    titleTokens: [],
    companyTokens: [],
    remainder: null,
    nameAlternatives: [],
    skillAlternatives: [],
    requiredSkills: [],
    semanticIntent: null,
  };
}

function parseStructuredTokens(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((token) => STRUCTURED_TOKEN.test(token))
    .slice(0, MAX_STRUCTURED_TOKENS);
}

function stripClause(query: string, match: RegExpExecArray): string {
  const before = query.slice(0, match.index).trim();
  const after = query.slice(match.index + match[0].length).trim();
  return [before, after].filter(Boolean).join(" ").trim();
}

function stripExplicitClauses(text: string): {
  text: string;
  nameTokens: string[];
  titleTokens: string[];
  companyTokens: string[];
} {
  let working = text;
  let nameTokens: string[] = [];
  let titleTokens: string[] = [];
  let companyTokens: string[] = [];

  while (true) {
    const company = EXPLICIT_COMPANY.exec(working);
    if (company) {
      companyTokens = parseStructuredTokens(company[1]);
      working = stripClause(working, company);
      continue;
    }

    const title = EXPLICIT_TITLE.exec(working);
    if (title) {
      titleTokens = parseStructuredTokens(title[1]);
      working = stripClause(working, title);
      continue;
    }

    const name = EXPLICIT_NAME.exec(working);
    if (name) {
      nameTokens = parseNameTokensFromRaw(name[1]);
      working = stripClause(working, name);
      continue;
    }

    break;
  }

  return { text: working.trim(), nameTokens, titleTokens, companyTokens };
}

function mergeExplicitWithBoolean(
  stripped: ReturnType<typeof stripExplicitClauses>
): SearchQueryParse {
  const boolean = parseBooleanQuery(stripped.text);
  const explicitNames =
    stripped.nameTokens.length > 0 ? [stripped.nameTokens] : [];
  const nameAlternatives = [...explicitNames, ...boolean.nameAlternatives];
  const skillRemainder =
    buildStructuredRemainder(
      boolean.requiredSkills,
      boolean.skillAlternatives
    ) ?? emptyIfIdentityFiller(stripped.text);

  return {
    nameTokens: flattenNameAlternatives(nameAlternatives),
    titleTokens: stripped.titleTokens,
    companyTokens: stripped.companyTokens,
    nameAlternatives,
    skillAlternatives: boolean.skillAlternatives,
    requiredSkills: boolean.requiredSkills,
    semanticIntent: null,
    remainder: skillRemainder,
  };
}

function fromBooleanOnly(text: string): SearchQueryParse {
  const boolean = parseBooleanQuery(text);
  const hasNames = boolean.nameAlternatives.length > 0;
  const hasSkills =
    boolean.skillAlternatives.length > 0 || boolean.requiredSkills.length > 0;

  if (!hasNames && !hasSkills) return emptyParse();

  return {
    nameTokens: flattenNameAlternatives(boolean.nameAlternatives),
    titleTokens: [],
    companyTokens: [],
    nameAlternatives: boolean.nameAlternatives,
    skillAlternatives: boolean.skillAlternatives,
    requiredSkills: boolean.requiredSkills,
    semanticIntent: null,
    remainder: hasSkills
      ? buildStructuredRemainder(
          boolean.requiredSkills,
          boolean.skillAlternatives
        )
      : null,
  };
}

export function isIdentityOnly(
  parse: SearchQueryParse,
  drawerSkillCount: number
): boolean {
  return (
    parse.remainder === null &&
    parse.requiredSkills.length === 0 &&
    parse.skillAlternatives.length === 0 &&
    drawerSkillCount === 0 &&
    (parse.nameTokens.length > 0 ||
      parse.titleTokens.length > 0 ||
      parse.companyTokens.length > 0)
  );
}

/** Tokens used in the identity-only OR across name, title and company. */
export function identityTokens(parse: SearchQueryParse): string[] {
  if (parse.nameTokens.length > 0) return [...parse.nameTokens];
  if (parse.titleTokens.length > 0) return [...parse.titleTokens];
  return [...parse.companyTokens];
}

/**
 * Pulls name, title and company tokens out of the search box query.
 *
 * Pure: no DB, no I/O. Runs per request in ranking and filters so identity-only
 * searches never bill an embedding call.
 */
export function extractSearchQuery(rawQuery: string | null): SearchQueryParse {
  if (rawQuery === null || rawQuery.trim().length === 0) return emptyParse();

  const normalized = normalizeResumeSearchQuery(rawQuery);
  if (!normalized) return emptyParse();

  const stripped = stripExplicitClauses(normalized);
  const hadExplicit =
    stripped.nameTokens.length > 0 ||
    stripped.titleTokens.length > 0 ||
    stripped.companyTokens.length > 0;

  if (hadExplicit) return mergeExplicitWithBoolean(stripped);

  return fromBooleanOnly(normalized);
}

export function titleSignalLabel(tokens: readonly string[]): string {
  const display = tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
  return `Title: ${display}`;
}

export function companySignalLabel(tokens: readonly string[]): string {
  const display = tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
  return `Company: ${display}`;
}
