import type { NormalisedCriteria } from "./candidate-search-criteria";

/**
 * The removable chips shown above the results (plan §9.5). Pure: the chip row is a
 * projection of the applied criteria, never state of its own — which is why the row
 * and the drawer can never disagree.
 */
export interface CriteriaChip {
  /** Stable within a criteria set, so React keys survive a re-render. */
  id: string;
  facet: keyof NormalisedCriteria;
  label: string;
  /** The exact value to remove from `facet` when the chip is dismissed. */
  value: string | number;
}

/**
 * Facet display names, shared with the fit scorer's signal labels so the Why column
 * and the chip row name the same filter the same way.
 */
export const CRITERIA_FACET_LABELS: Partial<
  Record<keyof NormalisedCriteria, string>
> = {
  jobIds: "Posting",
  titles: "Title",
  skills: "Skill",
  companies: "Company",
  industryIds: "Industry",
  countries: "Country",
  location: "Location",
  employmentTypes: "Employment type",
  workModes: "Work mode",
  stageIds: "Stage",
  educationLevels: "Education",
  sources: "Source",
};

const label = (
  facet: keyof NormalisedCriteria,
  value: string | number
): string => `${CRITERIA_FACET_LABELS[facet] ?? facet}: ${value}`;

function valueChips(
  facet: keyof NormalisedCriteria,
  values: readonly (string | number)[]
): CriteriaChip[] {
  return values.map((value) => ({
    id: `${facet}:${value}`,
    facet,
    label: label(facet, value),
    value,
  }));
}

function scalarChip(
  facet: keyof NormalisedCriteria,
  value: string | number | null,
  text: string
): CriteriaChip[] {
  return value === null ? [] : [{ id: facet, facet, label: text, value }];
}

export function buildChips(criteria: NormalisedCriteria): CriteriaChip[] {
  return [
    // `query` has no chip on purpose: it is already visible in its own input, and a
    // second removal affordance for it makes the two disagree (plan §9.2).
    ...valueChips("jobIds", criteria.jobIds),
    ...valueChips("titles", criteria.titles),
    ...valueChips("skills", criteria.skills),
    ...valueChips("companies", criteria.companies),
    ...valueChips("industryIds", criteria.industryIds),
    ...valueChips("countries", criteria.countries),
    ...scalarChip(
      "location",
      criteria.location,
      label("location", criteria.location ?? "")
    ),
    ...valueChips("employmentTypes", criteria.employmentTypes),
    ...valueChips("workModes", criteria.workModes),
    ...valueChips("stageIds", criteria.stageIds),
    ...valueChips("educationLevels", criteria.educationLevels),
    ...valueChips("sources", criteria.sources),
    // One chip per bound rather than one per range: each bound is removable on its
    // own, and a single chip would have to name two fields it cannot both carry.
    ...scalarChip(
      "experienceMin",
      criteria.experienceMin,
      `${criteria.experienceMin}+ yrs`
    ),
    ...scalarChip(
      "experienceMax",
      criteria.experienceMax,
      `Up to ${criteria.experienceMax} yrs`
    ),
    ...scalarChip(
      "scoreMin",
      criteria.scoreMin,
      `Match ${criteria.scoreMin}%+`
    ),
    ...scalarChip(
      "scoreMax",
      criteria.scoreMax,
      `Match up to ${criteria.scoreMax}%`
    ),
    ...scalarChip(
      "appliedFrom",
      criteria.appliedFrom,
      `Applied from ${criteria.appliedFrom}`
    ),
    ...scalarChip(
      "appliedTo",
      criteria.appliedTo,
      `Applied until ${criteria.appliedTo}`
    ),
  ];
}
