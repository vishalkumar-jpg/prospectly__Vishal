import type { FitResult } from "../candidate-search.response";
import type { NormalisedCriteria } from "./candidate-search-criteria";
import { extractQueryTerms } from "./candidate-search-criteria.normalizer";
import { buildFitSignals } from "./candidate-search-fit-signals";
import { type FitProfile } from "./candidate-search-fit.utils";
import { ensureWhySkillSignals } from "./candidate-search-why-signals";

export type { FitProfile } from "./candidate-search-fit.utils";

export interface ScoreFitOptions {
  /** Name-only searches: do not inject résumé skill chips into Why. */
  skipWhySkillSignals?: boolean;
}

export function scoreFit(
  profile: FitProfile,
  criteria: NormalisedCriteria,
  queryTerms?: readonly string[],
  options?: ScoreFitOptions
): FitResult {
  const signals = buildFitSignals(profile, criteria, queryTerms);

  const queryTermsUsed = queryTerms ?? extractQueryTerms(criteria.query);
  const whySignals = options?.skipWhySkillSignals
    ? signals
    : ensureWhySkillSignals(signals, profile, [
        ...criteria.skills,
        ...criteria.bonus,
        ...queryTermsUsed,
      ]);

  const scored = whySignals.filter((signal) => signal.weight > 0);
  const applied = scored.reduce((sum, signal) => sum + signal.weight, 0);
  const met = scored
    .filter((signal) => signal.state === "met")
    .reduce((sum, signal) => sum + signal.weight, 0);

  return {
    percent: applied === 0 ? 0 : Math.round((100 * met) / applied),
    signals: whySignals,
    criteriaCount: scored.length,
    metCount: scored.filter((signal) => signal.state === "met").length,
  };
}
