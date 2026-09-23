import { RESUME_SEARCH_MIN_QUERY_LENGTH } from "./resume-search.utils";

/**
 * The identity a recruiter can actually see on a card: the revealed name when
 * the server decided identity is visible, and the anonymous label otherwise.
 * Nothing else — an unrevealed candidate arrives with `revealedName` unset, so
 * their real name is not present here and can never be matched.
 */
export interface NameSearchCandidate {
  id: string;
  revealedName?: string;
  /** Absent on boards that don't anonymise, like the connector pipeline. */
  anonymousId?: string;
}

export interface CandidateNameSearch {
  /** Empty when the query named nobody on this board. */
  candidateIds: Set<string>;
  /**
   * The query with the matched name tokens removed, for the resume search to
   * run on. Empty when nothing searchable is left.
   */
  residual: string;
}

/** Mirrors the indexer's own name-token floor — below 3 characters a token is
 *  too collision-prone to identify anybody. */
const MIN_NAME_TOKEN_LENGTH = 3;

/**
 * Common English words that are also given names or surnames. A lone "will" in
 * "engineer who will lead a team" must not collapse the board onto a candidate
 * named Will, so these never match on their own.
 *
 * Calibrated by hand and deliberately short: every entry costs a real person
 * their one-word lookup. They stay findable by full name, which bypasses this
 * list entirely, so the cost is bounded — whereas a false positive replaces the
 * whole result set. Revisit alongside the search thresholds.
 */
const AMBIGUOUS_NAME_TOKENS = new Set([
  "art",
  "can",
  "chip",
  "cook",
  "dawn",
  "grace",
  "green",
  "hope",
  "joy",
  "lead",
  "long",
  "mark",
  "may",
  "page",
  "price",
  "rich",
  "rose",
  "short",
  "sunny",
  "ward",
  "will",
  "young",
]);

/** Every anonymous label carries it, so it identifies nobody on its own. */
const LABEL_NOISE_TOKENS = new Set(["candidate"]);

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalize(value);
  return normalized ? normalized.split(" ") : [];
}

/** Contiguous run, on tokens rather than raw characters — "candidate 123" must
 *  not be considered a hit for the label "Candidate #12". */
function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;

  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

interface Identity {
  /** Full display string as tokens — "jitendra bavaliya". */
  phrase: string[];
  /** Tokens allowed to identify the candidate on their own. */
  soloTokens: string[];
}

function identitiesOf(candidate: NameSearchCandidate): Identity[] {
  const identities: Identity[] = [];

  const namePhrase = tokenize(candidate.revealedName ?? "");
  if (namePhrase.length > 0) {
    identities.push({
      phrase: namePhrase,
      soloTokens: namePhrase.filter(
        (token) =>
          token.length >= MIN_NAME_TOKEN_LENGTH &&
          !AMBIGUOUS_NAME_TOKENS.has(token)
      ),
    });
  }

  // Absent on boards that don't anonymise, where the name above is the only
  // identity a candidate has.
  const labelPhrase = candidate.anonymousId
    ? tokenize(candidate.anonymousId)
    : [];
  if (labelPhrase.length > 0) {
    identities.push({
      phrase: labelPhrase,
      // "Candidate #RC-A3F91C" is identified by "a3f91c" alone, never by
      // "candidate" or the shared "rc" prefix (which the length floor drops).
      soloTokens: labelPhrase.filter(
        (token) =>
          token.length >= MIN_NAME_TOKEN_LENGTH &&
          !LABEL_NOISE_TOKENS.has(token)
      ),
    });
  }

  return identities;
}

interface Hit {
  score: number;
  tokens: string[];
}

function scoreCandidate(
  candidate: NameSearchCandidate,
  queryTokens: string[],
  queryTokenSet: Set<string>
): Hit | null {
  let best: Hit | null = null;

  for (const identity of identitiesOf(candidate)) {
    // A multi-token phrase is unambiguous by construction, so it outranks any
    // single token and is not subject to the ambiguous-word list.
    if (
      identity.phrase.length > 1 &&
      containsSequence(queryTokens, identity.phrase)
    ) {
      const hit = { score: identity.phrase.length, tokens: identity.phrase };
      if (!best || hit.score > best.score) best = hit;
      continue;
    }

    const matched = identity.soloTokens.filter((token) =>
      queryTokenSet.has(token)
    );
    if (matched.length > 0 && (!best || matched.length > best.score)) {
      best = { score: matched.length, tokens: matched };
    }
  }

  return best;
}

/**
 * Finds the candidates a query names, and returns what is left of the query for
 * the resume search to run on.
 *
 * Name lookup lives here rather than on the search endpoint because the board
 * already holds the only correct answer: the server emits `revealedName` only
 * once it has decided this recruiter may see it. Matching against what was
 * already handed over cannot leak an identity, and cannot drift out of step
 * with the reveal rule the way a second implementation in SQL would.
 *
 * Stripping the matched tokens out of the residual matters as much as the match
 * itself — left in, a surname reads to the query planner as a hard skill
 * requirement no resume can satisfy, and the whole search returns nothing.
 */
export function matchCandidatesByName(
  query: string,
  candidates: NameSearchCandidate[]
): CandidateNameSearch {
  const empty: CandidateNameSearch = {
    candidateIds: new Set<string>(),
    residual: query.trim(),
  };

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || candidates.length === 0) return empty;

  const queryTokenSet = new Set(queryTokens);

  const hits = new Map<string, Hit>();
  let topScore = 0;

  for (const candidate of candidates) {
    const hit = scoreCandidate(candidate, queryTokens, queryTokenSet);
    if (!hit) continue;
    hits.set(candidate.id, hit);
    if (hit.score > topScore) topScore = hit.score;
  }

  if (topScore === 0) return empty;

  // Only the strongest match survives: "jitendra bavaliya" resolves to Bavaliya
  // alone, while "jitendra" on its own still returns every Jitendra.
  const candidateIds = new Set<string>();
  const matchedTokens = new Set<string>();

  for (const [id, hit] of hits) {
    if (hit.score < topScore) continue;
    candidateIds.add(id);
    for (const token of hit.tokens) matchedTokens.add(token);
  }

  return { candidateIds, residual: stripTokens(query, matchedTokens) };
}

/**
 * Removes the name from the query while preserving the rest verbatim — the
 * server normalizes anyway, and filler like "with" is dropped there by its own
 * stopword handling, so nothing more needs doing here.
 */
function stripTokens(query: string, matched: Set<string>): string {
  const residual = query
    .split(/\s+/)
    .filter((word) => {
      const tokens = tokenize(word);
      // Punctuation-only fragments carry no tokens — keep them out either way.
      if (tokens.length === 0) return false;
      return !tokens.every((token) => matched.has(token));
    })
    .join(" ")
    .trim();

  return residual.length >= RESUME_SEARCH_MIN_QUERY_LENGTH ? residual : "";
}
