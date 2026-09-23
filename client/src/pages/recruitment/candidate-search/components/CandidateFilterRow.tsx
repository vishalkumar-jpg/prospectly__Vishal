import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuickFilterField } from "@/hooks/useCandidateSearchCriteria";
import type {
  CandidateSearchFacets,
  FacetValue,
} from "@/lib/api/recruitment-candidate-search";
import type { CandidateSearchCriteria } from "@/lib/recruitment/candidate-search.criteria";

import { FacetMultiSelect } from "./FacetMultiSelect";

const EMPTY_FACET: FacetValue[] = [];

const ANY = "any";

/**
 * Match score and years of experience are ranges, not sets: "70%+ and 50%+" is
 * just "50%+", so a multi-select there would offer combinations that collapse to
 * one answer. Both are single-select over the design's buckets, writing to the
 * same numeric criteria fields the drawer's sliders edit.
 */
const SCORE_OPTIONS = [
  { value: ANY, label: "Any score", min: null },
  { value: "90", label: "90% and above", min: 90 },
  { value: "70", label: "70% and above", min: 70 },
  { value: "50", label: "50% and above", min: 50 },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: ANY, label: "Any", min: null, max: null },
  { value: "3-5", label: "3 – 5 yrs", min: 3, max: 5 },
  { value: "6-8", label: "6 – 8 yrs", min: 6, max: 8 },
  { value: "9", label: "9+ yrs", min: 9, max: null },
] as const;

/**
 * The drawer's sliders can set bounds these buckets do not name. Rather than
 * snap a 4-year floor to "3 – 5" and quietly widen the search, an unmatched
 * range falls back to the placeholder — the drawer stays the precise control.
 */
function scoreValue(scoreMin: number | null): string {
  return SCORE_OPTIONS.find((o) => o.min === scoreMin)?.value ?? "";
}

function experienceValue(min: number | null, max: number | null): string {
  return (
    EXPERIENCE_OPTIONS.find((o) => o.min === min && o.max === max)?.value ?? ""
  );
}

export type ClearableFacetField =
  | "countries"
  | "titles"
  | "stageIds"
  | "employmentTypes"
  | "workModes";

export interface CandidateFilterRowProps {
  applied: CandidateSearchCriteria;
  facets?: CandidateSearchFacets;
  facetsLoading: boolean;
  /** Same handler the quick filters use, so the two can never disagree. */
  onToggle: (field: QuickFilterField, value: string | number) => void;
  /**
   * Empties one facet. An empty selection already means "every value", so the
   * "All …" row in each list clears rather than selecting every option — which
   * would mean the same thing while bloating the URL and the chips row.
   */
  onClearField: (field: ClearableFacetField) => void;
  /** Sets a range bound outright — a select picks, it does not toggle. */
  onRangeChange: (
    values: Partial<
      Pick<
        CandidateSearchCriteria,
        "scoreMin" | "scoreMax" | "experienceMin" | "experienceMax"
      >
    >
  ) => void;
  onClearAll: () => void;
  /** Nothing applied means nothing to clear — the link hides rather than lies. */
  hasFilters: boolean;
}

function RangeSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-9 text-sm font-normal transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The everyday filters, applied immediately (no draft step — one interaction is
 * the whole thing). The All-filters drawer keeps the long tail: skills,
 * companies, industries, education, source, dates and free-form ranges.
 */
export function CandidateFilterRow({
  applied,
  facets,
  facetsLoading,
  onToggle,
  onClearField,
  onRangeChange,
  onClearAll,
  hasFilters,
}: CandidateFilterRowProps) {
  const uid = useId();
  const field = (name: string) => `${uid}-${name}`;

  const multi = [
    {
      name: "country",
      label: "Country",
      placeholder: "All countries",
      options: facets?.countries,
      selected: applied.countries,
      toggle: (value: string) => onToggle("countries", value),
      clear: () => onClearField("countries"),
    },
    {
      name: "roles",
      label: "Roles",
      placeholder: "All roles",
      options: facets?.titles,
      selected: applied.titles,
      toggle: (value: string) => onToggle("titles", value),
      clear: () => onClearField("titles"),
    },
    {
      name: "stages",
      label: "Stages",
      placeholder: "All stages",
      options: facets?.stages,
      selected: applied.stageIds.map(String),
      toggle: (value: string) => onToggle("stageIds", Number(value)),
      clear: () => onClearField("stageIds"),
    },
  ];

  const trailing = [
    {
      name: "employment",
      label: "Employment Type",
      placeholder: "All types",
      options: facets?.employmentTypes,
      selected: applied.employmentTypes,
      toggle: (value: string) => onToggle("employmentTypes", value),
      clear: () => onClearField("employmentTypes"),
    },
    {
      name: "work-mode",
      label: "Work Mode",
      placeholder: "All modes",
      options: facets?.workModes,
      selected: applied.workModes,
      toggle: (value: string) => onToggle("workModes", value),
      clear: () => onClearField("workModes"),
    },
  ];

  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <RangeSelect
          id={field("score")}
          label="Match Score (AI)"
          placeholder="Custom range"
          value={scoreValue(applied.scoreMin)}
          options={SCORE_OPTIONS}
          onChange={(value) =>
            onRangeChange({
              scoreMin:
                SCORE_OPTIONS.find((o) => o.value === value)?.min ?? null,
            })
          }
        />

        {multi.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <Label htmlFor={field(group.name)} className="text-xs font-medium">
              {group.label}
            </Label>
            <FacetMultiSelect
              id={field(group.name)}
              label={group.label}
              placeholder={group.placeholder}
              options={group.options ?? EMPTY_FACET}
              selected={group.selected}
              onToggle={group.toggle}
              onClear={group.clear}
              loading={facetsLoading}
            />
          </div>
        ))}

        <RangeSelect
          id={field("experience")}
          label="Years of Experience"
          placeholder="Custom range"
          value={experienceValue(applied.experienceMin, applied.experienceMax)}
          options={EXPERIENCE_OPTIONS}
          onChange={(value) => {
            const option = EXPERIENCE_OPTIONS.find((o) => o.value === value);
            onRangeChange({
              experienceMin: option?.min ?? null,
              experienceMax: option?.max ?? null,
            });
          }}
        />

        {/* {trailing.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <Label htmlFor={field(group.name)} className="text-xs font-medium">
              {group.label}
            </Label>
            <FacetMultiSelect
              id={field(group.name)}
              label={group.label}
              placeholder={group.placeholder}
              options={group.options ?? EMPTY_FACET}
              selected={group.selected}
              onToggle={group.toggle}
              onClear={group.clear}
              loading={facetsLoading}
            />
          </div>
        ))} */}
      </div>

      {hasFilters ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onClearAll}
            className="h-auto p-0 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst text-brand-rose"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </section>
  );
}
