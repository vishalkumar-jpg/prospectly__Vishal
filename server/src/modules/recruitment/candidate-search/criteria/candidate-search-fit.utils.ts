import type { FitSignalState } from "../candidate-search.response";

/** One row of the pipeline CTE (plan §5.4), reduced to what fit can actually check. */
export interface FitProfile {
  skills: string[];
  hasSearchableText: boolean;
  totalYearsExp: number | null;
  educationLevel: string | null;
  workTypes: string[];
  employmentTypes: string[];
  industryIds: number[];
  countryCodes: string[];
  location: string | null;
  contactCountry: string | null;
  stageIds: number[];
  company: string | null;
  title: string | null;
  source: string | null;
  appliedAt: string | null;
  termStates?: Record<string, FitSignalState>;
}

export const key = (value: string | number): string =>
  String(value).trim().toLowerCase();

export const orList = (values: readonly (string | number)[]): string =>
  values.length <= 2
    ? values.join(" or ")
    : `${values[0]} or ${values.length - 1} more`;

export const resolveTermState = (
  profile: FitProfile,
  term: string,
  haystack: readonly string[]
): FitSignalState => {
  const exact = profile.termStates?.[key(term)];
  if (exact) return exact;
  return textState(haystack, term, profile.hasSearchableText);
};

const contains = (haystack: readonly string[], needle: string): boolean => {
  const term = key(needle);
  return haystack.some((value) => key(value).includes(term));
};

export function textState(
  haystack: readonly string[],
  needle: string,
  checkable: boolean
): FitSignalState {
  if (contains(haystack, needle)) return "met";
  return checkable ? "missing" : "unknown";
}

export function overlapState(
  wanted: readonly (string | number)[],
  have: readonly (string | number)[] | null
): FitSignalState {
  if (have === null || have.length === 0) return "unknown";
  const present = new Set(have.map(key));
  return wanted.some((value) => present.has(key(value))) ? "met" : "missing";
}

export function rangeLabel(
  suffix: string,
  min: string | number | null,
  max: string | number | null
): string {
  if (min !== null && max !== null) return `${min}–${max} ${suffix}`;
  if (min !== null) return `${min}+ ${suffix}`;
  return `up to ${max} ${suffix}`;
}

export function rangeState<T extends number | string>(
  value: T | null,
  min: T | null,
  max: T | null
): FitSignalState {
  if (value === null) return "unknown";
  if (min !== null && value < min) return "missing";
  if (max !== null && value > max) return "missing";
  return "met";
}
