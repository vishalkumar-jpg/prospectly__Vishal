import type { FitSignal } from "../candidate-search.response";
import type { NormalisedCriteria } from "./candidate-search-criteria";
import { CRITERIA_FACET_LABELS } from "./candidate-search-chips";
import { extractQueryTerms } from "./candidate-search-criteria.normalizer";
import {
  type FitProfile,
  orList,
  overlapState,
  rangeLabel,
  rangeState,
  resolveTermState,
} from "./candidate-search-fit.utils";
import { countryFacetState } from "./candidate-search-country-location";
import {
  FIT_WEIGHT_BONUS,
  FIT_WEIGHT_FACET,
  FIT_WEIGHT_QUERY_TERM,
  FIT_WEIGHT_RANGE,
  FIT_WEIGHT_SKILL,
} from "../candidate-search.constants";

/** Builds weighted fit signals from profile + criteria (no percent arithmetic). */
export function buildFitSignals(
  profile: FitProfile,
  criteria: NormalisedCriteria,
  queryTerms?: readonly string[]
): FitSignal[] {
  const signals: FitSignal[] = [];

  for (const skill of criteria.skills) {
    signals.push({
      label: skill,
      kind: "skill",
      weight: FIT_WEIGHT_SKILL,
      state: resolveTermState(profile, skill, profile.skills),
    });
  }

  for (const skill of criteria.bonus) {
    signals.push({
      label: skill,
      kind: "bonus",
      weight: FIT_WEIGHT_BONUS,
      state: resolveTermState(profile, skill, profile.skills),
    });
  }

  const haystack = [
    ...profile.skills,
    profile.title ?? "",
    profile.company ?? "",
  ];

  for (const term of queryTerms ?? extractQueryTerms(criteria.query)) {
    signals.push({
      label: term,
      kind: "query_term",
      weight: FIT_WEIGHT_QUERY_TERM,
      state: resolveTermState(profile, term, haystack),
    });
  }

  const facets: ReadonlyArray<{
    facet: keyof NormalisedCriteria;
    wanted: readonly (string | number)[];
    have: readonly (string | number)[] | null;
  }> = [
    {
      facet: "titles",
      wanted: criteria.titles,
      have: profile.title === null ? null : [profile.title],
    },
    {
      facet: "companies",
      wanted: criteria.companies,
      have: profile.company === null ? null : [profile.company],
    },
    {
      facet: "educationLevels",
      wanted: criteria.educationLevels,
      have: profile.educationLevel === null ? null : [profile.educationLevel],
    },
    {
      facet: "sources",
      wanted: criteria.sources,
      have: profile.source === null ? null : [profile.source],
    },
    { facet: "workModes", wanted: criteria.workModes, have: profile.workTypes },
    {
      facet: "employmentTypes",
      wanted: criteria.employmentTypes,
      have: profile.employmentTypes,
    },
    {
      facet: "industryIds",
      wanted: criteria.industryIds,
      have: profile.industryIds,
    },
    { facet: "stageIds", wanted: criteria.stageIds, have: profile.stageIds },
  ];

  for (const { facet, wanted, have } of facets) {
    if (wanted.length === 0) continue;
    signals.push({
      label: `${CRITERIA_FACET_LABELS[facet] ?? facet}: ${orList(wanted)}`,
      kind: "facet",
      weight: FIT_WEIGHT_FACET,
      state: overlapState(wanted, have),
    });
  }

  if (criteria.countries.length > 0) {
    signals.push({
      label: `${CRITERIA_FACET_LABELS.countries}: ${orList(criteria.countries)}`,
      kind: "facet",
      weight: FIT_WEIGHT_FACET,
      state: countryFacetState(
        criteria.countries,
        profile.location,
        profile.contactCountry
      ),
    });
  }

  if (criteria.experienceMin !== null || criteria.experienceMax !== null) {
    signals.push({
      label: rangeLabel(
        "yrs experience",
        criteria.experienceMin,
        criteria.experienceMax
      ),
      kind: "range",
      weight: FIT_WEIGHT_RANGE,
      state: rangeState(
        profile.totalYearsExp,
        criteria.experienceMin,
        criteria.experienceMax
      ),
    });
  }

  if (criteria.appliedFrom !== null || criteria.appliedTo !== null) {
    signals.push({
      label: rangeLabel("applied", criteria.appliedFrom, criteria.appliedTo),
      kind: "range",
      weight: FIT_WEIGHT_RANGE,
      state: rangeState(
        profile.appliedAt === null ? null : profile.appliedAt.slice(0, 10),
        criteria.appliedFrom,
        criteria.appliedTo
      ),
    });
  }

  return signals;
}
