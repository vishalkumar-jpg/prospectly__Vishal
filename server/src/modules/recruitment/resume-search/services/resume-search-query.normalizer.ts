import {
  RESUME_SEARCH_MAX_PHRASES,
  RESUME_SEARCH_MAX_TOKENS,
  RESUME_SEARCH_MAX_TOKEN_LENGTH,
  RESUME_SEARCH_STOPWORDS,
} from "../resume-search.constants";

export interface KeywordQuery {
  tokens: string[];
  phrases: string[];
}

export function normalizeResumeSearchQuery(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Separators Postgres folds into one lexeme, so a document saying `CI/CD`
 * carries `ci/cd` and neither `ci` nor `cd`. A recruiter typing "ci cd" then
 * matches nobody.
 *
 * Hyphens are deliberately absent: the parser already emits the parts
 * (`react-native` → `react-nat`, `react`, `nativ`), so "react native" works
 * without help, and adding `-` here produces a phrase query that matches less.
 * `+` and `#` are absent too — `c++` reduces to the lexeme `c` regardless.
 */
const JOINABLE_SEPARATORS = ["/", "."] as const;

/**
 * Adds the joined spelling of each adjacent pair, so "ci cd" also probes
 * `ci/cd` and "node js" also probes `node.js`.
 *
 * Adjacent pairs only. Joining every combination would turn a six-word query
 * into thirty terms, and the pair is where the real cases live — nobody writes
 * a punctuated term with another word wedged inside it.
 *
 * This fixes the common spellings, not the whole class: `asp net core` still
 * will not reach `asp.net core`, because that needs a three-token join. The
 * complete fix is normalising at index time.
 */
export function withPunctuationVariants(tokens: string[]): string[] {
  if (tokens.length < 2) return tokens;

  const out = [...tokens];
  const seen = new Set(tokens);

  for (let i = 0; i < tokens.length - 1; i += 1) {
    for (const separator of JOINABLE_SEPARATORS) {
      const joined = `${tokens[i]}${separator}${tokens[i + 1]}`;
      if (seen.has(joined)) continue;
      seen.add(joined);
      out.push(joined);
      if (out.length >= RESUME_SEARCH_MAX_TOKENS) return out;
    }
  }

  return out;
}

/**
 * Tokenises in TypeScript. The repository OR-folds these terms in SQL and
 * hands the result to `websearch_to_tsquery`.
 *
 * `to_tsquery` is unusable here: it raises a syntax error on arbitrary text
 * such as "c++ / react", which would surface as a 500. `plainto_tsquery` and a
 * bare `websearch_to_tsquery` both AND every term, so a natural-language phrase
 * like "senior react dev who has led a platform migration" matches nothing.
 * The OR-fold keeps recall while `ts_rank_cd` still floats documents that match
 * more terms, and `websearch_to_tsquery` cannot be made to error.
 */
export function buildKeywordQuery(
  normalized: string,
  /**
   * Punctuation variants are a *retrieval* device — they widen what the index
   * can be probed with. They are meaningless as things to show a user or to
   * count in a score, where "we/are" is not a criterion anybody asked for.
   * Callers that score or display pass `false`.
   */
  options?: { expandPunctuation?: boolean }
): KeywordQuery {
  const phrases: string[] = [];

  const remainder = normalized.replace(/"([^"]{2,60})"/g, (_match, phrase) => {
    if (phrases.length < RESUME_SEARCH_MAX_PHRASES) {
      phrases.push(String(phrase).trim());
    }
    return " ";
  });

  const tokens: string[] = [];
  const seen = new Set<string>();

  // Keeps + # . so c++, c#, node.js and .net survive tokenisation.
  for (const rawToken of remainder.split(/[^a-z0-9+#.]+/)) {
    // Strips a leading '-' so a NOT operator cannot be smuggled in.
    const token = rawToken.replace(/^[.-]+|[.-]+$/g, "");

    if (token.length < 2 || token.length > RESUME_SEARCH_MAX_TOKEN_LENGTH) {
      continue;
    }
    if (token === "or" || token === "and") continue;
    if (RESUME_SEARCH_STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;

    seen.add(token);
    tokens.push(token);
    if (tokens.length >= RESUME_SEARCH_MAX_TOKENS) break;
  }

  // Terms only. The OR-folded expression is assembled in SQL by the
  // repository's `selective` CTE, which has to interleave the
  // document-frequency filter between the phrases and the tokens.
  return {
    tokens:
      options?.expandPunctuation === false
        ? tokens
        : withPunctuationVariants(tokens),
    phrases,
  };
}

/**
 * The same expansion for callers that hand a whole string to
 * `websearch_to_tsquery` rather than folding tokens in SQL — the cross-job
 * filter's free-text gate.
 *
 * `websearch_to_tsquery` reads a bare `or` as disjunction, so the original
 * query keeps its AND semantics and each variant is an alternative beside it:
 * "ci cd" becomes `'ci' & 'cd' | 'ci/cd' | 'ci.cd'`. It never raises on
 * arbitrary input, which is why the gate uses it rather than `to_tsquery`.
 */
export function expandPunctuationQuery(normalized: string): string {
  const words = normalized.split(" ").filter(Boolean);
  if (words.length < 2) return normalized;

  const variants = withPunctuationVariants(words).slice(words.length);
  return variants.length === 0
    ? normalized
    : `${normalized} or ${variants.join(" or ")}`;
}
