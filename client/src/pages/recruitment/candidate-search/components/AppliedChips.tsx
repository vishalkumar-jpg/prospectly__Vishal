import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/dayjs";
import type { CandidateSearchChipField } from "@/hooks/useCandidateSearchCriteria";
import type { CandidateSearchCriteria } from "@/lib/recruitment/candidate-search.criteria";
import type {
  CandidateSearchFacets,
  FacetValue,
} from "@/lib/api/recruitment-candidate-search";

type StringArrayField = Extract<
  CandidateSearchChipField,
  | "jobIds"
  | "titles"
  | "skills"
  | "companies"
  | "countries"
  | "employmentTypes"
  | "workModes"
  | "educationLevels"
  | "sources"
>;

type NumberArrayField = Extract<
  CandidateSearchChipField,
  "industryIds" | "stageIds"
>;

interface ArrayChipSpec {
  field: StringArrayField | NumberArrayField;
  facet: keyof CandidateSearchFacets;
  /** Prefix shown on the chip and read out in the remove label. */
  noun: string;
}

/** Chip order is the drawer's group order, so the two read the same way. */
const ARRAY_CHIPS: ArrayChipSpec[] = [
  { field: "jobIds", facet: "postings", noun: "Posting" },
  { field: "titles", facet: "titles", noun: "Title" },
  { field: "skills", facet: "skills", noun: "Skill" },
  { field: "companies", facet: "companies", noun: "Company" },
  { field: "industryIds", facet: "industries", noun: "Industry" },
  { field: "countries", facet: "countries", noun: "Country" },
  { field: "employmentTypes", facet: "employmentTypes", noun: "Type" },
  { field: "workModes", facet: "workModes", noun: "Work mode" },
  { field: "stageIds", facet: "stages", noun: "Stage" },
  { field: "educationLevels", facet: "educationLevels", noun: "Education" },
  { field: "sources", facet: "sources", noun: "Source" },
];

interface Chip {
  key: string;
  label: string;
  field: CandidateSearchChipField;
  value?: string | number;
}

function facetLabel(options: FacetValue[] | undefined, value: string): string {
  return options?.find((option) => option.value === value)?.label ?? value;
}

/** Calendar day (`YYYY-MM-DD`), not a UTC instant — do not run through utcDayjs. */
function formatAppliedDay(value: string): string {
  const parsed = dayjs(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

function buildChips(
  criteria: CandidateSearchCriteria,
  facets?: CandidateSearchFacets
): Chip[] {
  const chips: Chip[] = [];

  for (const spec of ARRAY_CHIPS) {
    const values: (string | number)[] = criteria[spec.field];
    for (const value of values) {
      chips.push({
        key: `${spec.field}:${value}`,
        label: `${spec.noun}: ${facetLabel(facets?.[spec.facet], String(value))}`,
        field: spec.field,
        value,
      });
    }
  }

  if (criteria.location) {
    chips.push({
      key: "location",
      label: `Location: ${criteria.location}`,
      field: "location",
    });
  }
  if (criteria.experienceMin !== null) {
    chips.push({
      key: "experienceMin",
      label: `Min experience: ${criteria.experienceMin} yrs`,
      field: "experienceMin",
    });
  }
  if (criteria.experienceMax !== null) {
    chips.push({
      key: "experienceMax",
      label: `Max experience: ${criteria.experienceMax} yrs`,
      field: "experienceMax",
    });
  }
  if (criteria.scoreMin !== null) {
    chips.push({
      key: "scoreMin",
      label: `Min match: ${criteria.scoreMin}%`,
      field: "scoreMin",
    });
  }
  if (criteria.scoreMax !== null) {
    chips.push({
      key: "scoreMax",
      label: `Max match: ${criteria.scoreMax}%`,
      field: "scoreMax",
    });
  }
  if (criteria.appliedFrom) {
    chips.push({
      key: "appliedFrom",
      label: `Applied from ${formatAppliedDay(criteria.appliedFrom)}`,
      field: "appliedFrom",
    });
  }
  if (criteria.appliedTo) {
    chips.push({
      key: "appliedTo",
      label: `Applied until ${formatAppliedDay(criteria.appliedTo)}`,
      field: "appliedTo",
    });
  }

  // The free-text query gets no chip — it is visible in its own input.
  return chips;
}

export interface AppliedChipsProps {
  /** Applied criteria only — removing a chip re-queries immediately (§9.2). */
  criteria: CandidateSearchCriteria;
  facets?: CandidateSearchFacets;
  onRemove: (field: CandidateSearchChipField, value?: string | number) => void;
  onClearAll: () => void;
}

/**
 * The chips row above the results. Absent from the DOM when empty (§9.5) — not
 * an empty bar, not a placeholder.
 */
export function AppliedChips({
  criteria,
  facets,
  onRemove,
  onClearAll,
}: AppliedChipsProps) {
  const chips = buildChips(criteria, facets);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Filters
      </span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pr-1 font-normal"
        >
          <span className="max-w-[220px] truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.field, chip.value)}
            aria-label={`Remove ${chip.label} filter`}
            className="rounded-full p-0.5 transition-all duration-200 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="link"
        onClick={onClearAll}
        className="h-auto p-0 text-xs text-brand-rose"
      >
        Clear all
      </Button>
    </div>
  );
}
