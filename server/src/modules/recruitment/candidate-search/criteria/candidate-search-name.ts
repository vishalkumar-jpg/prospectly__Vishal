import { normalizeResumeSearchQuery } from "modules/recruitment/resume-search/services/resume-search-query.normalizer";
import { RESUME_SEARCH_STOPWORDS } from "modules/recruitment/resume-search/resume-search.constants";
import { tokenPredicate } from "./candidate-search-token-predicate";

/** Max name tokens in a single search (first + middle + last). */
const MAX_NAME_TOKENS = 3;

/** Looks like a person-name token, not a tech term or role word. */
const NAME_TOKEN = /^[a-z][a-z.'-]{1,29}$/i;

/**
 * Words the planner treats as soft intent — never a bare-name search.
 * Mirrors the planner prompt's EXCLUDE list plus common role titles.
 */
const NAME_DENYLIST = new Set([
  ...RESUME_SEARCH_STOPWORDS,
  "cloud",
  "database",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "devops",
  "dev",
  "devs",
  "ai",
  "ml",
  "machine",
  "learning",
  "microservices",
  "developer",
  "developers",
  "engineer",
  "engineers",
  "senior",
  "junior",
  "lead",
  "architect",
  "manager",
  "director",
  "accountant",
  "analyst",
  "consultant",
  "specialist",
  "react",
  "vue",
  "angular",
  "node",
  "java",
  "python",
  "laravel",
  "php",
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "docker",
  "sql",
  "net",
  "netsuite",
  "ifrs",
  "named",
  "called",
  "name",
  "with",
  "who",
  "has",
  "the",
  "and",
  "or",
  "for",
  "in",
  "at",
  "to",
  "of",
  "is",
  "are",
  "a",
  "an",
]);

export interface NameQueryParse {
  /** Empty = not a name search; use the existing query path. */
  nameTokens: string[];
  /**
   * Text to rank and FTS against. `null` = name-only (no planner/embed/resume
   * FTS on the query string).
   */
  remainder: string | null;
}

/**
 * Trailing name clause. `name X` is included so "candidate with name Elena
 * Rossi" is the same question as "named Elena Rossi" / "Elena Rossi".
 */
export const EXPLICIT_NAME =
  /\b(?:named|called|name\s+is|name:|name)\s+([a-z][a-z.'-]{0,29}(?:\s+[a-z][a-z.'-]{0,29}){0,2})\s*$/i;

/**
 * Words that only wrap a name clause ("candidate with", "find me a"). Left in
 * the remainder they keep the query off the identity-only path and bill an
 * embedding for filler.
 */
const IDENTITY_WRAPPER_WORDS = new Set([
  ...RESUME_SEARCH_STOPWORDS,
  "person",
  "people",
  "with",
  "who",
  "whose",
  "has",
  "the",
  "and",
  "or",
  "for",
  "in",
  "at",
  "to",
  "of",
  "is",
  "are",
  "a",
  "an",
  "named",
  "called",
  "name",
  "me",
  "my",
  "our",
  "search",
  "searching",
  "look",
]);

/** `null` when every leftover token is search-wrapper filler. */
export function emptyIfIdentityFiller(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  if (
    tokens.every((token) => IDENTITY_WRAPPER_WORDS.has(token.toLowerCase()))
  ) {
    return null;
  }

  return trimmed;
}

export function looksLikeNameToken(token: string): boolean {
  const lower = token.toLowerCase();
  if (!NAME_TOKEN.test(token)) return false;
  if (NAME_DENYLIST.has(lower)) return false;
  return true;
}

export function parseNameTokensFromRaw(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((token) => looksLikeNameToken(token))
    .slice(0, MAX_NAME_TOKENS);
}

function stripClause(query: string, match: RegExpExecArray): string {
  const before = query.slice(0, match.index).trim();
  const after = query.slice(match.index + match[0].length).trim();
  return [before, after].filter(Boolean).join(" ").trim();
}

/**
 * Pulls person-name tokens out of the search box query.
 *
 * Pure: no DB, no I/O. Runs per request in ranking and filters so name-only
 * searches never bill an embedding call.
 */
export function extractNameQuery(rawQuery: string | null): NameQueryParse {
  if (rawQuery === null || rawQuery.trim().length === 0) {
    return { nameTokens: [], remainder: null };
  }

  const normalized = normalizeResumeSearchQuery(rawQuery);
  if (!normalized) return { nameTokens: [], remainder: null };

  const explicit = EXPLICIT_NAME.exec(normalized);
  if (explicit) {
    const nameTokens = parseNameTokensFromRaw(explicit[1]);
    if (nameTokens.length === 0) return { nameTokens: [], remainder: null };

    return {
      nameTokens,
      remainder: emptyIfIdentityFiller(stripClause(normalized, explicit)),
    };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > MAX_NAME_TOKENS) {
    return { nameTokens: [], remainder: null };
  }

  if (!tokens.every((token) => looksLikeNameToken(token))) {
    return { nameTokens: [], remainder: null };
  }

  return { nameTokens: tokens, remainder: null };
}

/** Word-boundary match on `candidate_name`. */
export function nameTokenPredicate(tokens: readonly string[]) {
  return tokenPredicate("candidate_name", tokens);
}

/** Display label for the Why column. */
export function nameSignalLabel(tokens: readonly string[]): string {
  const display = tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
  return `Name: ${display}`;
}
