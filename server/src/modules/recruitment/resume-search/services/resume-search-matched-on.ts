import type {
  ResumeSearchMatchedTerm,
  ResumeSearchMatchKind,
} from "../resume-search.response";
import {
  RESUME_SEARCH_MAX_MATCHED_ON,
  RESUME_SEARCH_MAX_VOCABULARY_TERMS,
  RESUME_SEARCH_MAX_VOCABULARY_TERM_LENGTH,
  RESUME_SEARCH_RELATED_MIN_SIMILARITY,
} from "../resume-search.constants";

/**
 * Chips are drawn from an allowlist — skills, tools, technologies and domain
 * expertise — so they are safe to show for anonymised candidates by
 * construction, with no per-candidate reveal check needed.
 *
 * Deliberately excluded even for revealed candidates: jobHistory[].company,
 * education[].institution, projects[].name, currentEmployer, location and
 * ai_summary. Past employers are more than the kanban card exposes today.
 */
export interface DeriveMatchedOnInput {
  tokens: string[];
  vocabulary: unknown;
  isVectorHit: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toVocabulary(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") continue;
    const term = item.trim();
    if (!term || term.length > RESUME_SEARCH_MAX_VOCABULARY_TERM_LENGTH) {
      continue;
    }
    // Guards against a nested jsonb value surviving jsonb_array_elements_text.
    if (term.includes("{") || term.includes("[")) continue;

    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(term);
    if (out.length >= RESUME_SEARCH_MAX_VOCABULARY_TERMS) break;
  }

  return out;
}

function bigrams(value: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < value.length - 1; i += 1) {
    out.add(value.slice(i, i + 2));
  }
  return out;
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const left = bigrams(a);
  const right = bigrams(b);

  let overlap = 0;
  for (const gram of left) {
    if (right.has(gram)) overlap += 1;
  }

  return (2 * overlap) / (left.size + right.size);
}

function isKeywordHit(term: string, tokens: string[]): boolean {
  const lower = term.toLowerCase();

  return tokens.some((token) => {
    if (lower === token) return true;
    if (lower.includes(token)) {
      return new RegExp(`\\b${escapeRegExp(token)}`).test(lower);
    }
    return token.includes(lower) && lower.length >= 3;
  });
}

export function deriveMatchedOn(
  input: DeriveMatchedOnInput
): ResumeSearchMatchedTerm[] {
  const vocabulary = toVocabulary(input.vocabulary);
  if (vocabulary.length === 0) return [];

  const matched: ResumeSearchMatchedTerm[] = [];
  const used = new Set<string>();

  const push = (term: string, kind: ResumeSearchMatchKind): void => {
    const key = term.toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    matched.push({ term, kind });
  };

  for (const term of vocabulary) {
    if (matched.length >= RESUME_SEARCH_MAX_MATCHED_ON) break;
    if (isKeywordHit(term, input.tokens)) push(term, "keyword");
  }

  for (const term of vocabulary) {
    if (matched.length >= RESUME_SEARCH_MAX_MATCHED_ON) break;
    if (used.has(term.toLowerCase())) continue;

    const lower = term.toLowerCase();
    const close = input.tokens.some(
      (token) =>
        diceCoefficient(lower, token) >= RESUME_SEARCH_RELATED_MIN_SIMILARITY
    );
    if (close) push(term, "related");
  }

  // Pure-semantic hit: nothing matched literally, so surface the resume's own
  // top terms and let the client label them honestly.
  if (matched.length === 0 && input.isVectorHit) {
    for (const term of vocabulary.slice(0, 3)) push(term, "semantic");
  }

  return matched.slice(0, RESUME_SEARCH_MAX_MATCHED_ON);
}
