import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CandidateSearchCoverage } from "@/lib/api/recruitment-candidate-search";
import type { CandidateSearchSort } from "@/lib/recruitment/candidate-search.criteria";

export type SortDirection = "asc" | "desc";

interface SortOption {
  value: string;
  label: string;
  sort: CandidateSearchSort;
  dir: SortDirection;
  /** Every sort option must map to a visible column (§9.5). */
  needsFit?: boolean;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "fit:desc",
    label: "Best match",
    sort: "fit",
    dir: "desc",
    needsFit: true,
  },
  {
    value: "fit:asc",
    label: "Lowest match",
    sort: "fit",
    dir: "asc",
    needsFit: true,
  },
  {
    value: "applied:desc",
    label: "Newest applied",
    sort: "applied",
    dir: "desc",
  },
  {
    value: "applied:asc",
    label: "Oldest applied",
    sort: "applied",
    dir: "asc",
  },
  {
    value: "experience:desc",
    label: "Most experience",
    sort: "experience",
    dir: "desc",
  },
  {
    value: "experience:asc",
    label: "Least experience",
    sort: "experience",
    dir: "asc",
  },
];

export interface ResultsToolbarProps {
  /** Rows matching the applied criteria. */
  total: number;
  coverage: CandidateSearchCoverage | null;
  sort: CandidateSearchSort;
  sortDir: SortDirection;
  onSortChange: (sort: CandidateSearchSort, dir: SortDirection) => void;
  /** False when no criterion is applied — hides the Best match option too. */
  showFit: boolean;
}

export function ResultsToolbar({
  total,
  coverage,
  sort,
  sortDir,
  onSortChange,
  showFit,
}: ResultsToolbarProps) {
  const options = SORT_OPTIONS.filter((option) => showFit || !option.needsFit);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>{" "}
          {total === 1 ? "candidate matches" : "candidates match"}
          {coverage ? (
            <> out of {coverage.totalCandidates.toLocaleString()}</>
          ) : null}
        </p>
        {/* Always visible, never a tooltip: a recruiter who cannot see the
            coverage gap will assume the tool searched everyone (§6.4). */}
        {coverage ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            {coverage.withIndexedResume.toLocaleString()} of{" "}
            {coverage.totalCandidates.toLocaleString()} candidates have an
            indexed resume
          </p>
        ) : null}
      </div>

      <div className="ms-auto flex items-center gap-2">
        <Label
          htmlFor="candidate-search-sort"
          className="whitespace-nowrap text-xs text-muted-foreground"
        >
          Sort by
        </Label>
        <Select
          value={`${sort}:${sortDir}`}
          onValueChange={(value) => {
            const option = SORT_OPTIONS.find((item) => item.value === value);
            if (option) onSortChange(option.sort, option.dir);
          }}
        >
          <SelectTrigger
            id="candidate-search-sort"
            className="h-9 w-[180px] text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          >
            <SelectValue />
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
    </div>
  );
}
