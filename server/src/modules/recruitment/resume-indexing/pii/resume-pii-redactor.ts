import {
  EMAIL_PATTERN,
  GOVERNMENT_ID_PATTERNS,
  HIGH_REMOVAL_RATIO,
  LABELLED_LINE_PATTERN,
  NAME_TOKEN_MIN_LENGTH,
  PHONE_CANDIDATE_PATTERN,
  PHONE_LABELLED_PATTERN,
  PHONE_MAX_DIGITS,
  PHONE_MIN_DIGITS,
  PHONE_SEPARATORS,
  PII_PLACEHOLDER,
  PROFILE_URL_PATTERN,
} from "./resume-pii.patterns";
import { normalizeResumeWhitespace } from "./resume-text-normalizer";

export interface PiiHints {
  names?: string[];
  /** Skills, employers and institutions — never redacted, even if a name matches. */
  protectedTerms?: string[];
}

export interface PiiRedactionCounts {
  ids: number;
  labelledLines: number;
  emails: number;
  urls: number;
  phones: number;
  names: number;
}

export interface PiiStripResult {
  text: string;
  redactions: PiiRedactionCounts;
  /** Share of characters removed. High values suggest over-redaction. */
  removalRatio: number;
  highRemoval: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countDigits(value: string): number {
  let count = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") count += 1;
  }
  return count;
}

/**
 * The false-positive guard. A raw digit run is only a phone number when it is
 * formatted like one, which is what keeps `2019 - 2022`, `v10.4.2`, `99.99%`,
 * `$1,200,000` and `450 ms` in the indexed text.
 */
function isLikelyPhoneNumber(match: string): boolean {
  const digits = countDigits(match);
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) return false;

  for (const char of match) {
    if (PHONE_SEPARATORS.has(char)) return true;
  }
  return false;
}

function replaceAll(
  text: string,
  pattern: RegExp,
  replacement: string
): { text: string; count: number } {
  let count = 0;
  const next = text.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { text: next, count };
}

function redactPhones(
  text: string,
  useLabelHeuristics: boolean
): { text: string; count: number } {
  const labelled = useLabelHeuristics
    ? replaceAll(text, PHONE_LABELLED_PATTERN, PII_PLACEHOLDER.PHONE)
    : { text, count: 0 };

  let { count } = labelled;
  const next = labelled.text.replace(PHONE_CANDIDATE_PATTERN, (match) => {
    if (!isLikelyPhoneNumber(match)) return match;
    count += 1;
    return PII_PLACEHOLDER.PHONE;
  });

  return { text: next, count };
}

/**
 * `\b` is ASCII-only, so `\bJosé\b` never fires: the trailing boundary sits
 * after a character JavaScript does not consider a word character, and then
 * demands a word character follow it. Unicode property lookarounds match the
 * same positions for ASCII names and additionally work for accented and CJK
 * ones, which a resume corpus is full of.
 */
const NAME_BOUNDARY_BEFORE = "(?<![\\p{L}\\p{N}_])";
const NAME_BOUNDARY_AFTER = "(?![\\p{L}\\p{N}_])";

/**
 * Only removes tokens the caller positively identified as the candidate's name,
 * and never one that also appears inside a skill, employer or institution — a
 * candidate named "Ruby", "Bill" or "Grace" must not gut their own resume.
 */
function redactNames(
  text: string,
  hints: PiiHints | undefined
): { text: string; count: number } {
  const names = hints?.names ?? [];
  if (names.length === 0) return { text, count: 0 };

  const protectedWords = new Set<string>();
  for (const term of hints?.protectedTerms ?? []) {
    for (const word of term.toLowerCase().split(/[^\p{L}0-9+#.]+/u)) {
      if (word) protectedWords.add(word);
    }
  }

  const candidates = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length < NAME_TOKEN_MIN_LENGTH) continue;
    candidates.add(trimmed);
    for (const token of trimmed.split(/\s+/)) {
      if (token.length >= NAME_TOKEN_MIN_LENGTH) candidates.add(token);
    }
  }

  // Longest first so "Jane Doe" is replaced before "Jane" and "Doe".
  const ordered = [...candidates]
    .filter((value) => !protectedWords.has(value.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  let count = 0;
  let next = text;
  for (const value of ordered) {
    const pattern = new RegExp(
      `${NAME_BOUNDARY_BEFORE}${escapeRegExp(value)}${NAME_BOUNDARY_AFTER}`,
      "giu"
    );
    const result = replaceAll(next, pattern, PII_PLACEHOLDER.NAME);
    next = result.text;
    count += result.count;
  }

  return { text: next, count };
}

export interface PiiStripOptions {
  /**
   * Turns off the two patterns that read a `Label: value` line as personal
   * data. They are tuned for free-form resume prose and are wrong for a
   * document that is *made* of labelled lines — `PHONE_LABELLED_PATTERN`
   * matches "contact" before a separator, so a structured
   * "Domain Expertise: Contact-Center Operations" would be replaced wholesale.
   * Everything else — ids, emails, profile URLs, digit-shaped phones and
   * names — still runs.
   */
  skipLabelHeuristics?: boolean;
}

export function stripResumePii(
  input: string,
  hints?: PiiHints,
  options?: PiiStripOptions
): PiiStripResult {
  const useLabelHeuristics = !options?.skipLabelHeuristics;
  const redactions: PiiRedactionCounts = {
    ids: 0,
    labelledLines: 0,
    emails: 0,
    urls: 0,
    phones: 0,
    names: 0,
  };

  if (!input?.trim()) {
    return { text: "", redactions, removalRatio: 0, highRemoval: false };
  }

  let text = normalizeResumeWhitespace(input);
  const originalLength = text.length;

  for (const pattern of GOVERNMENT_ID_PATTERNS) {
    const result = replaceAll(text, pattern, PII_PLACEHOLDER.ID);
    text = result.text;
    redactions.ids += result.count;
  }

  if (useLabelHeuristics) {
    const labelled = replaceAll(text, LABELLED_LINE_PATTERN, "");
    text = labelled.text;
    redactions.labelledLines = labelled.count;
  }

  // Email before URL: an address tail is shaped like a host.
  const emails = replaceAll(text, EMAIL_PATTERN, PII_PLACEHOLDER.EMAIL);
  text = emails.text;
  redactions.emails = emails.count;

  const urls = replaceAll(text, PROFILE_URL_PATTERN, PII_PLACEHOLDER.URL);
  text = urls.text;
  redactions.urls = urls.count;

  const phones = redactPhones(text, useLabelHeuristics);
  text = phones.text;
  redactions.phones = phones.count;

  const names = redactNames(text, hints);
  text = names.text;
  redactions.names = names.count;

  text = text.replace(/\n{3,}/g, "\n\n").trim();

  const removalRatio =
    originalLength > 0
      ? Math.max(0, (originalLength - text.length) / originalLength)
      : 0;

  return {
    text,
    redactions,
    removalRatio,
    highRemoval: removalRatio > HIGH_REMOVAL_RATIO,
  };
}

export function formatRedactionCounts(counts: PiiRedactionCounts): string {
  return `ids=${counts.ids} lines=${counts.labelledLines} emails=${counts.emails} urls=${counts.urls} phones=${counts.phones} names=${counts.names}`;
}
