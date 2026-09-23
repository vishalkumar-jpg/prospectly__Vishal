import { normalizeResumeSearchQuery } from "modules/recruitment/resume-search/services/resume-search-query.normalizer";
import type { SearchQueryParse } from "./candidate-search-query-parse";
import { isKnownSkillOrRoleToken } from "./candidate-search-query-boolean";
import { looksLikeNameToken } from "./candidate-search-name";

const NL_MARKERS = new Set([
  "someone",
  "somebody",
  "anyone",
  "anybody",
  "person",
  "people",
  "who",
  "whose",
  "experienced",
  "experience",
  "knows",
  "know",
  "knowing",
  "skilled",
  "skill",
  "skills",
  "looking",
  "seeking",
  "proficient",
  "familiar",
  "background",
  "years",
  "year",
  "expertise",
  "expert",
  "strong",
  "deep",
  "solid",
  "hands-on",
  "hands",
  "on",
]);

const SKIP_WORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "in",
  "with",
  "for",
  "at",
  "to",
  "of",
  "is",
  "are",
]);

function contentTokens(normalized: string): string[] {
  return normalized
    .split(/\s+/)
    .filter((token) => token && !SKIP_WORDS.has(token));
}

function hasNlMarkers(normalized: string): boolean {
  return normalized.split(/\s+/).some((token) => NL_MARKERS.has(token));
}

/** True when the heuristic parse is not trustworthy and Gemini should interpret intent. */
export function needsAiIntent(
  rawQuery: string | null,
  parse: SearchQueryParse
): boolean {
  if (rawQuery === null || rawQuery.trim().length === 0) return false;

  const normalized = normalizeResumeSearchQuery(rawQuery);
  if (!normalized) return false;
  if (hasNlMarkers(normalized)) return true;

  const tokens = contentTokens(normalized);
  if (tokens.length > 4) return true;
  if (tokens.some((token) => isKnownSkillOrRoleToken(token))) return false;

  const ambiguous = tokens.filter(
    (token) => looksLikeNameToken(token) && !isKnownSkillOrRoleToken(token)
  );
  if (ambiguous.length === 0) return false;

  if (ambiguous.length === 1 && tokens.length === 1) return false;

  const skillsPresent =
    parse.requiredSkills.length > 0 || parse.skillAlternatives.length > 0;
  if (skillsPresent && parse.nameAlternatives.length === 0) return false;

  return true;
}
