/**
 * Collapses the free-text degrees an AI extraction produces into the fixed ladder
 * the candidate-search education facet filters on (ADR-005 §8).
 *
 * Pure by design: no DB, no I/O, no clock. It runs on every extraction and again
 * over the whole corpus during backfill, so it has to be cheap and deterministic.
 *
 * Two rules that are easy to get wrong:
 * - The *highest* degree wins, not the first or the most recent. Someone with a
 *   BSc and an MBA is `master`.
 * - `other` is only reached when education was stated but nothing mapped. When no
 *   education was stated at all the answer is `null` — "not stated", which the
 *   search surfaces as `unknown` rather than a filter miss.
 */

export const EDUCATION_LEVELS = [
  "high_school",
  "associate",
  "bachelor",
  "master",
  "doctorate",
  "other",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Ascending seniority. `other` sits at the bottom so any real match outranks it. */
const LEVEL_RANK: Record<EducationLevel, number> = {
  other: 0,
  high_school: 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  doctorate: 5,
};

/**
 * Ordered most-senior-first, and matched in that order per degree string, so a
 * "Master of Science" never trips the bachelor patterns on its way past.
 *
 * Abbreviations that collide with ordinary English (`be`, `ma`, `ms`) are matched
 * only in their dotted or spelled-out forms. A résumé line reading "happy to be
 * considered" must not register as a Bachelor of Engineering.
 *
 * Lookarounds rather than `\b`: a trailing `\b` cannot match after the final `.`
 * of "M.A." or "B.E.", so those degrees would silently fall through to `other`.
 */
const DEGREE_PATTERNS: ReadonlyArray<readonly [RegExp, EducationLevel]> = [
  [
    /(?<![a-z0-9])(ph\.?\s?d|d\.?phil|doctorate|doctoral|doctor of|d\.?sc|ed\.?d)(?![a-z0-9])/,
    "doctorate",
  ],
  [
    /(?<![a-z0-9])(master|m\.?phil|mba|m\.?b\.?a|m\.?s\.?c|msc|m\.?tech|mtech|m\.?c\.?a|mca|m\.?com|mcom|ll\.?m|m\.?ed|m\.?s\.?w|m\.?a\.|m\.?s\.|m\.?e\.)(?![a-z0-9])/,
    "master",
  ],
  [
    /(?<![a-z0-9])(bachelor|b\.?s\.?c|bsc|b\.?tech|btech|b\.?c\.?a|bca|b\.?com|bcom|b\.?b\.?a|bba|ll\.?b|b\.?f\.?a|b\.?ed|b\.?s\.|b\.?a\.|b\.?e\.)(?![a-z0-9])/,
    "bachelor",
  ],
  // A polytechnic diploma is the closest thing most non-US résumés have to an
  // associate degree, so it maps here rather than falling through to `other`.
  // The ladder itself stays as decided (ADR-005 §8) — this is a mapping call.
  [
    /(?<![a-z0-9])(associate|a\.?a\.?s|a\.?s\.|a\.?a\.|diploma|polytechnic|foundation degree)(?![a-z0-9])/,
    "associate",
  ],
  [
    /(?<![a-z0-9])(high school|higher secondary|senior secondary|secondary school|h\.?s\.?c|s\.?s\.?c|matriculation|matric|intermediate|12th|10th|ged|a[- ]levels?)(?![a-z0-9])/,
    "high_school",
  ],
];

function readEducationEntries(metadata: unknown): unknown[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const { education } = metadata as Record<string, unknown>;
  return Array.isArray(education) ? education : [];
}

/** Degrees arrive as `{ degree, institution, year, field }`, but tolerate a bare string. */
function readDegreeText(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";

  const record = entry as Record<string, unknown>;
  const parts = [record.degree, record.field]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return parts.join(" ");
}

/** Highest ladder rung named by a single degree string, or null if none is. */
export function classifyDegree(degree: string): EducationLevel | null {
  const text = degree.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  for (const [pattern, level] of DEGREE_PATTERNS) {
    if (pattern.test(text)) return level;
  }
  return null;
}

/**
 * @returns the highest level stated, `"other"` when education was listed but none
 *          of it mapped, or `null` when no education was stated at all.
 */
export function normalizeEducationLevel(
  metadata: unknown
): EducationLevel | null {
  const entries = readEducationEntries(metadata);
  if (entries.length === 0) return null;

  let best: EducationLevel | null = null;
  let sawAnyDegreeText = false;

  for (const entry of entries) {
    const text = readDegreeText(entry);
    if (!text) continue;
    sawAnyDegreeText = true;

    const level = classifyDegree(text);
    if (level && (best === null || LEVEL_RANK[level] > LEVEL_RANK[best])) {
      best = level;
    }
  }

  if (best) return best;
  return sawAnyDegreeText ? "other" : null;
}
