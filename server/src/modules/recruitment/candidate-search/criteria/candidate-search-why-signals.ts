import type { FitSignal } from "../candidate-search.response";

/** Only the résumé skill list — avoids a cycle with `candidate-search-fit`. */
interface SkillProfile {
  skills: string[];
}

const SUGGESTION_CAP = 3;

const key = (value: string): string => value.trim().toLowerCase();

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const k = key(value);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(value);
  }
  return out;
};

const overlaps = (left: string, right: string): boolean => {
  const a = key(left);
  const b = key(right);
  return a.includes(b) || b.includes(a);
};

const hasUsefulWhy = (signals: FitSignal[]): boolean =>
  signals.some(
    (signal) =>
      signal.state === "met" &&
      (signal.kind === "skill" ||
        signal.kind === "bonus" ||
        signal.kind === "query_term")
  );

/**
 * A Why chip that must never move Match %: the recruiter did not ask for it
 * as a criterion, it only explains why this person is on the page.
 */
const displaySkill = (label: string): FitSignal => ({
  label,
  kind: "skill",
  weight: 0,
  state: "met",
});

/**
 * Skills the résumé already lists that overlap the search — the honest
 * "suggested because" list when scored chips are all misses or absent.
 */
function matchingProfileSkills(
  profile: SkillProfile,
  asked: readonly string[]
): string[] {
  if (asked.length === 0)
    return unique(profile.skills).slice(0, SUGGESTION_CAP);

  const matched = profile.skills.filter((skill) =>
    asked.some((term) => overlaps(skill, term))
  );
  if (matched.length > 0) return unique(matched).slice(0, SUGGESTION_CAP);
  return unique(profile.skills).slice(0, SUGGESTION_CAP);
}

/**
 * Turns a scored-miss into a met when the résumé lists that skill. The SQL
 * filter matches `search_vector` (a superset of `skills`); without this the
 * Why column can strike through the exact term that put the row on the page.
 */
export function upgradeMatchedSkillSignals(
  signals: FitSignal[],
  profile: SkillProfile
): FitSignal[] {
  return signals.map((signal) => {
    if (
      signal.state !== "missing" ||
      (signal.kind !== "skill" &&
        signal.kind !== "bonus" &&
        signal.kind !== "query_term")
    ) {
      return signal;
    }
    const listed = profile.skills.some((skill) =>
      overlaps(skill, signal.label)
    );
    return listed ? { ...signal, state: "met" } : signal;
  });
}

/**
 * Guarantees at least one skill chip for a row that already survived the
 * filter. Weight-0 so Match % stays the weighted share of asked criteria.
 */
export function ensureWhySkillSignals(
  signals: FitSignal[],
  profile: SkillProfile,
  asked: readonly string[]
): FitSignal[] {
  const upgraded = upgradeMatchedSkillSignals(signals, profile);
  if (hasUsefulWhy(upgraded)) return upgraded;

  const suggestions = matchingProfileSkills(profile, asked);
  if (suggestions.length > 0) {
    return [...upgraded, ...suggestions.map(displaySkill)];
  }

  if (upgraded.length === 0) {
    return [
      {
        label: "Skills not listed",
        kind: "skill",
        weight: 0,
        state: "unknown",
      },
    ];
  }

  return upgraded;
}
