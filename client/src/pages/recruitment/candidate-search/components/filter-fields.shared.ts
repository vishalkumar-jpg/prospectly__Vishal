import type { CandidateSearchCriteria } from "@/lib/recruitment/candidate-search.criteria";
import type {
  CandidateSearchFacets,
  FacetValue,
} from "@/lib/api/recruitment-candidate-search";

/** 20 reads as "20+" — the top of the slider is unbounded, not a ceiling. */
export const EXPERIENCE_MAX = 20;
export const SCORE_MAX = 100;
export const EMPTY_FACET: FacetValue[] = [];

export type Mutate = (next: CandidateSearchCriteria) => void;
export type FieldId = (name: string) => string;

export interface FilterFieldsProps {
  draft: CandidateSearchCriteria;
  facets?: CandidateSearchFacets;
  facetsLoading?: boolean;
  patch: (mutate: Mutate) => void;
}

export interface FilterSectionProps extends FilterFieldsProps {
  field: FieldId;
}

export function toggleString(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

export function toggleNumber(list: number[], item: number): number[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}
